const yaml = require('js-yaml')
const path = require('path')

const filesys = require('./filesys')
const ParseResult = require('./ParseResult')

module.exports = class SpecParser {
  
  /** Util to run SpecParser#run */
  static run(input, match) {
    return (new this()).run(input, match)
  }
  
  /**
   * Parses endpoint specs in a directory that match a regex
   * @param  {string}  input The directory to recursively look in
   * @param  {Regexp}  match The regex to match spec files against
   * @return {Promise<ParseResult>}
   */
  async run(input, match) {
    
    // Find the endpoint paths to process
    let versionPaths = await this.walkDirectory(input, /^endpoints\.yml$/)
    if (versionPaths.length === 0) {
      return ParseResult.fromErrors(`No endpoint.yml files found in ${input}`)
    }
    
    // Process each endpoint spec seperately
    let result = await this.parseInfo(input)
    for (let version of versionPaths) {
      
      // Generate the full path
      let filepath = path.join(version.dir, version.file)
      
      // Open the spec file
      let doc = yaml.safeLoadAll(await filesys.readFile(filepath))
      
      // Parse the doc & merge into a single result
      let docResult = await this.processVersion(version.dir, filepath, doc)
      result.mergeMessages(docResult)
      result.value.versions.push(docResult.value)
    }
    
    // Return the result
    return result
  }
  
  /** @return {ParseResult} */
  async parseInfo(input) {
    
    try {
      let infoPath = path.join(input, 'info.yml')
      let infoDoc = yaml.safeLoad(await filesys.readFile(infoPath))
      
      return new ParseResult({
        name: infoDoc.name || '',
        template: infoDoc.template || null,
        description: infoDoc.description,
        versions: []
      })
    }
    catch (error) {
      return ParseResult.fromErrors(error.message)
    }
  }
  
  /** @return {ParseResult} */
  async processVersion(filedir, filepath, doc) {
    
    if (doc.length !== 2) {
      return ParseResult.fromErrors(`Expected 2 yaml documents, file: ${filepath}`)
    }
    
    let metaDoc = doc[0]
    let dataDoc = doc[1]
    
    if (!Array.isArray(metaDoc.groups) || metaDoc.groups.length === 0) {
      return ParseResult.fromErrors(`No Groups defined, file: ${filepath}`)
    }
    
    let result = new ParseResult({
      name: metaDoc.version || '0.0.0',
      base: metaDoc.base || '/',
      filepath: filepath,
      filedir: filedir,
      groups: [ ]
    })
    
    let errorFormatter = msg => `${msg}, file: ${filepath}`
    
    for (let groupId of metaDoc.groups) {
      let groupResult = await this.parseGroup(groupId, dataDoc[groupId], result.value, errorFormatter)
      result.mergeMessages(groupResult)
      result.value.groups.push(groupResult.value)
    }
    
    return result
  }

  /** @return {ParseResult} */
  async parseGroup(groupId, groupDoc, info, errorFormatter) {
    
    let result = new ParseResult()
    
    const groupError = message => errorFormatter(`Group ${groupId} ${message}`)
    
    if (!groupDoc) {
      return result.addError(groupError('Not found'))
    }
    
    if (!groupDoc.name) {
      result.addError(groupError(`needs a name`))
    }
    
    if (!groupDoc.endpoints || !Array.isArray(groupDoc.endpoints)) {
      return result.addError(groupError(`needs endpoints as an array`))
    }
    
    
    result.value = {
      id: groupId,
      name: groupDoc.name,
      base: path.join(info.base, groupDoc.base || '/'),
      endpoints: []
    }
    
    
    for (let i in groupDoc.endpoints) {
      
      let endpointDoc = groupDoc.endpoints[i]
      let formatter = msg => errorFormatter(`Endpoint ${groupId}.${endpointDoc.id || i} ${msg}`)
      let endpointResult = await this.parseEndpoint(endpointDoc, result.value, info, formatter)
      
      result.mergeMessages(endpointResult)
      result.value.endpoints.push(endpointResult.value)
    }
    
    return result
  }

  /** @return {ParseResult} */
  async parseEndpoint(endpointDoc, group, info, errorFormatter) {
    
    let result = new ParseResult()
    
    result.addErrorIf(!endpointDoc.id, 'needs an id', errorFormatter)
    result.addErrorIf(!endpointDoc.name, 'needs an name', errorFormatter)
    result.addErrorIf(!endpointDoc.url, 'needs an url', errorFormatter)
    if (result.hasErrors) return result
    
    
    result.addWarningIf(!endpointDoc.info, 'no info provided', errorFormatter)
    
    
    let endpointUrl = path.join(group.base, endpointDoc.url)
    
    result.value = {
      id: `${group.id}.${endpointDoc.id}`,
      name: endpointDoc.name,
      method: endpointDoc.method || 'get',
      url: endpointUrl,
      info: endpointDoc.info || '',
      params: [],
      body: [],
      responses: [],
      query: []
    }
    
    let urlParamRegex = /:(\w+)\/?/g
    
    
    if (Array.isArray(endpointDoc.responses)) {
      let respResult = await this.parseResponses(endpointDoc.responses, info, errorFormatter)
      result.mergeMessages(respResult)
      result.value.responses = respResult.value
    }
    
    if (typeof endpointDoc.params === 'object') {
      // ...
      let paramsResult = await this.parseArgs('params', endpointDoc.params, errorFormatter)
      result.mergeMessages(paramsResult)
      result.value.params = paramsResult.value
      
      // Add warnings for undescribed url params
      let match = urlParamRegex.exec(endpointUrl)
      
      while (match) {
        if (!endpointDoc.params[match[1]]) {
          result.addWarning(errorFormatter(`url param '${match[1]}' not described`))
        }
        match = urlParamRegex.exec(endpointUrl)
      }
    }
    else if (urlParamRegex.exec(endpointUrl)) {
      result.addWarning(errorFormatter(`url params not described`))
    }
    
    if (typeof endpointDoc.body === 'object') {
      
      let bodyResult = await this.parseArgs('body', endpointDoc.body, errorFormatter)
      result.mergeMessages(bodyResult)
      result.value.body = bodyResult.value
    }
    
    if (typeof endpointDoc.query === 'object') {
      
      let queryResult = await this.parseArgs('query', endpointDoc.query, errorFormatter)
      result.mergeMessages(queryResult)
      result.value.query = queryResult.value
    }
    
    return result
  }

  /** @return {ParseResult} */
  async parseArgs(argName, argsDoc, formatter) {
    
    let result = new ParseResult([])
    
    for (let name in argsDoc) {
      let value = argsDoc[name]
      
      let arg = { name }
      
      let optionalMatch = arg.name.match(/^(\w+)\?$/)
      if (optionalMatch) {
        arg.name = optionalMatch[1]
        arg.optional = true
      }
      else {
        arg.optional = false
      }
      
      if (typeof value === 'string') {
        
        let typeRegex = /(\w+) - (.+)/
        let typeMatch = value.match(typeRegex)
        
        if (typeMatch) {
          arg.info = typeMatch[2]
          arg.type = typeMatch[1]
        }
        else {
          arg.info = value
        }
      }
      else if (typeof value === 'object') {
        arg.info = value.info || undefined
        arg.type = value.type || undefined
      }
      
      result.addWarningIf(!arg.info, `${argName}.${name} has no info`, formatter)
      result.addWarningIf(!arg.type, `${argName}.${name} has no type`, formatter)
      
      result.value.push(arg)
    }
    
    return result
  }

  /** @return {ParseResult} */
  async parseResponses(responsesDoc, info, formatter) {
    
    let result = new ParseResult([])
    
    for (let i in responsesDoc) {
      let respDoc = responsesDoc[i]
      
      let respFormatter = msg => formatter(`response[${i}] ${msg}`)
      
      result.addErrorIf(!respDoc.name, 'needs a name', respFormatter)
      result.addErrorIf(!respDoc.status, 'needs a status', respFormatter)
      result.addErrorIf(!respDoc.body, 'needs a body', respFormatter)
      
      if (result.hasErrors) continue
      
      let bodyPath = path.join(info.filedir, 'data', respDoc.body)
      let fullpath = path.join(process.cwd(), bodyPath)
      
      try {
        let file = await filesys.stat(fullpath)
        
        if (path.extname(respDoc.body) !== '.json' || !file.isFile()) {
          result.addError(respFormatter('body is not a json file'))
          continue
        }
        
        result.value.push({
          name: respDoc.name,
          status: respDoc.status,
          body: JSON.parse(await filesys.readFile(fullpath))
        })
      }
      catch (error) {
        if (error instanceof SyntaxError) {
          result.addError(respFormatter(`body is not valid json '${bodyPath}'`))
        }
        else {
          result.addError(respFormatter(`body file does not exist '${bodyPath}'`))
        }
        continue
      }
      
      // result.value.push(res)
    }
    
    return result
  }
  
  
  
  /** Recursively walks a directory looking for files which match a regex */
  async walkDirectory(basePath, find) {
    let result = await filesys.readdir(basePath)
    
    // TODO: Could be in parallel?!
    
    let matches = []
    for (let i in result) {
      let filename = result[i]
      
      let subpath = path.join(basePath, filename)
      let info = await filesys.stat(subpath)
      
      if (info.isDirectory()) {
        matches = matches.concat(await this.walkDirectory(subpath, find))
      }
      else if (info.isFile() && find.test(filename)) {
        matches.push({ dir: basePath, file: filename })
      }
    }
    
    return matches
  }
  
}
