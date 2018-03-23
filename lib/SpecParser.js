const yaml = require('js-yaml')
const path = require('path')

const filesys = require('./filesys')
const ParseResult = require('./ParseResult')

const httpMethods = require('methods')

module.exports = class SpecParser {
  
  /** Util to run SpecParser#run */
  static run(input, match) {
    return (new this()).run(input, match)
  }
  
  /**
   * Parses endpoint specs in a directory that match a regex
   * @param  {string}  input The directory to recursively look in
   * @return {Promise<ParseResult>}
   */
  async run(input) {
    
    let exists = await filesys.canAccess(input)
    if (!exists) throw new Error(`Input directory, '${input}',  does not exist`)
    
    // Find the endpoint paths to process
    let versionPaths = await this.walkDirectory(input, /^endpoints\.yml$/)
    if (versionPaths.length === 0) {
      throw new Error(`No endpoints.yml files found in '${input}'`)
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
    
    let result = new ParseResult()
    
    let infoPath = path.join(input, 'info.yml')
    let hasInfo = await filesys.canAccess(infoPath)
    
    // Start with the default info
    let infoDoc = {
      name: process.env.npm_package_name,
      template: 'ocelot-template',
      description: ''
    }
    
    // If an info doc was specified, apply that
    if (hasInfo) {
      Object.assign(infoDoc, yaml.safeLoad(await filesys.readFile(infoPath)))
    }
    
    // Try to find the template using node paths & relative to the cwd
    let template = await this.findTemplate(infoDoc.template)
    if (!template) {
      throw new Error(`Cannot find template '${infoDoc.template}'`)
    }
    
    // Ensure the template is valid
    let templateResult = await this.validateTemplate(template)
    result.mergeMessages(templateResult)
    
    return new ParseResult({
      name: infoDoc.name || '',
      description: infoDoc.description || '',
      template: templateResult.value,
      versions: []
    })
  }
  
  /** @return String */
  async findTemplate(name) {
    
    // Generate the paths to check in
    let paths = [ process.cwd() ].concat(module.paths)
      .map(p => path.join(p, name))
    
    // See if any of them are a directory
    let checked = await Promise.all(paths.map(path => filesys.isDir(path)))
    let template = checked.find(p => !!p)
    
    // Return the path, relative to the working directory
    return path.relative(process.cwd(), template)
  }
  
  /** @return {ParseResult} */
  async validateTemplate(dir) {
    
    let result = new ParseResult(path.join(dir, 'template'))
    
    let hasInfo = await filesys.canAccess(path.join(result.value, 'info.yml'))
    let hasIndex = await filesys.canAccess(path.join(result.value, 'index.pug'))
    let hasErrors = await filesys.canAccess(path.join(result.value, 'error.pug'))
    
    result.addErrorIf(!hasIndex, `Template has no index.pug`)
    result.addWarningIf(!hasInfo, `Template has no info.yml`)
    result.addWarningIf(!hasErrors, `Template has no error.pug`)
    
    return result
  }
  
  /** @return {ParseResult} */
  async processVersion(filedir, filepath, doc) {
    
    // If more than 1 doc split them
    let metaDoc, dataDoc
    if (doc.length > 1) {
      metaDoc = doc[0]
      dataDoc = doc[1]
    }
    else if (doc.length === 1) {
      
      // If one doc, generate a blank one
      metaDoc = { }
      dataDoc = doc[0]
    }
    
    // Specify a default groups order
    if (!metaDoc.groups) {
      metaDoc.groups = Object.keys(dataDoc)
    }
    
    // Specify a default version
    if (!metaDoc.version) {
      metaDoc.version = path.basename(filedir)
    }
    
    // Fail if there are no groups
    if (!Array.isArray(metaDoc.groups) || metaDoc.groups.length === 0) {
      return ParseResult.fromErrors(`No Groups defined, file: ${filepath}`)
    }
    
    // Create the result
    let result = new ParseResult({
      name: metaDoc.version || '0.0.0',
      base: metaDoc.base || '/',
      filepath: filepath,
      filedir: filedir,
      groups: [ ]
    })
    
    let errorFormatter = msg => `${msg}, file: ${filepath}`
    
    // Parse each group
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
    
    // Get options from the document
    let { id, method, url, name } = endpointDoc
    
    // A regex to match an endpoint shorthand
    const endpointRegex = /(.*) (.*)/g
    
    // If the method, id & url aren't set
    if (!method && !id && !url) {
      
      // See if a http method is a key ~> parse it
      for (let potentialMethod of httpMethods) {
        if (!endpointDoc[potentialMethod]) continue
        let match = endpointRegex.exec(endpointDoc[potentialMethod])
        if (!match) continue
        method = potentialMethod
        ;[, url, id] = match
        break
      }
    }
    
    // If no name but an id ~> un camelcase it
    if (!name && id) {
      name = id.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
    }
    
    // Add Errors for missing required options
    result.addErrorIf(!id, 'needs an id', errorFormatter)
    result.addErrorIf(!name, 'needs an name', errorFormatter)
    result.addErrorIf(!url, 'needs an url', errorFormatter)
    if (result.hasErrors) return result
    
    
    let endpointUrl = path.join(group.base, url)
    
    result.value = {
      id: `${group.id}.${id}`,
      name: name,
      method: method || 'get',
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
      // Parse params arguements
      let paramsResult = await this.parseArgs('params', endpointDoc.params, errorFormatter)
      result.mergeMessages(paramsResult)
      result.value.params = paramsResult.value
      
      // Add warnings for undescribed url params
      let match = urlParamRegex.exec(endpointUrl)
      
      // Add warnings for missing options
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
      
      // Get options from the doc
      let { name, status, body } = respDoc
      
      // A regex to match the shorthand
      let respRegex = /(.*) ([^\s]*)$/g
      
      // If none are present, try the shorthand
      if (!name && !status && !body && Object.keys(respDoc).length === 1) {
        status = Object.keys(respDoc)[0]
        let match = respRegex.exec(respDoc[status])
        if (match && !isNaN(parseInt(status))) {
          status = parseInt(status)
          ;[, name, body] = match
        }
      }
      
      // Fail if any are missing
      result.addErrorIf(!name, 'needs a name', respFormatter)
      result.addErrorIf(!status, 'needs a status', respFormatter)
      result.addErrorIf(!body, 'needs a body', respFormatter)
      
      if (result.hasErrors) continue
      
      let bodyPath = path.join(info.filedir, 'data', body)
      let fullpath = path.join(process.cwd(), bodyPath)
      
      try {
        let file = await filesys.stat(fullpath)
        
        if (path.extname(body) !== '.json' || !file.isFile()) {
          result.addError(respFormatter('body is not a json file'))
          continue
        }
        
        result.value.push({
          name: name,
          status: status,
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
