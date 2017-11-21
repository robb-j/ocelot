const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const program = require('commander')

const { promisify } = require('util')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

const ParseResult = require('./ParseResult')

;(async () => {
  
  program.version('0.1.0')
    .option('-i --input [dir]', 'Set the folder to watch [api]', 'api')
    .option('-o --output [dir]', 'Set the folder to output html to [docs]', 'docs')
    .parse(process.argv)
  
  
  let versionPaths = await walkDirectory(program.input, /^endpoints\.yml$/)
  
  if (versionPaths.length === 0) {
    console.log(`No endpoint.yml files found in ${path.join(__dirname, program.input)}`)
  }
  
  let apiData = []
  let allErrors = []
  let allWarns = []
  
  
  for (let version of versionPaths) {
    
    let filepath = path.join(version.dir, version.file)
    
    let doc = await loadYML(filepath)
    
    let result = await processDoc(version.dir, filepath, doc)
    allErrors.push(...result.errors)
    allWarns.push(...result.warnings)
    apiData.push(result.value)
  }
  
  console.log('warns', allWarns)
  console.log('errors', allErrors)
  console.log('data', JSON.stringify(apiData))
  // console.log(versionPaths)
  
})()



async function loadYML(filepath) {
  
  let file = await readFile(filepath)
  
  return yaml.safeLoadAll(file)
}



/** @return {ParseResult} */
async function processDoc(filedir, filepath, doc) {
  
  if (doc.length !== 2) {
    return [ `Expected 2 yaml documents, file: ${filepath}` ]
  }
  
  let metaDoc = doc[0]
  let dataDoc = doc[1]
  
  if (!Array.isArray(metaDoc.groups) || metaDoc.groups.length === 0) {
    return [ `No Groups defined, file: ${filepath}` ]
  }
  
  let result = new ParseResult({
    name: metaDoc.name || null,
    version: metaDoc.version || '0.0.0',
    base: metaDoc.base || '/',
    template: metaDoc.template || 'default',
    filepath: filepath,
    filedir: filedir,
    groups: [ ]
  })
  
  let errorFormatter = msg => `${msg}, file: ${filepath}`
  
  for (let groupId of metaDoc.groups) {
    let groupResult = await parseGroup(groupId, dataDoc[groupId], result.value, errorFormatter)
    result.mergeMessages(groupResult)
    result.value.groups.push(groupResult.value)
  }
  
  return result
}

/** @return {ParseResult} */
async function parseGroup(groupId, groupDoc, info, errorFormatter) {
  
  let result = new ParseResult({})
  
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
    let endpointResult = await parseEndpoint(endpointDoc, result.value, info, formatter)
    
    result.mergeMessages(endpointResult)
    result.value.endpoints.push(endpointResult.value)
  }
  
  return result
}

/** @return {ParseResult} */
async function parseEndpoint(endpointDoc, group, info, errorFormatter) {
  
  let result = new ParseResult({})
  
  let noMethod = !endpointDoc.method && !endpointDoc.methods
  result.addErrorIf(!endpointDoc.id, 'needs an id', errorFormatter)
  result.addErrorIf(noMethod, 'needs a method / methods', errorFormatter)
  result.addErrorIf(!endpointDoc.url, 'needs an url', errorFormatter)
  if (result.hasErrors) return result
  
  
  let endpointUrl = path.join(group.base, endpointDoc.url)
  
  let methods = []
  
  if (endpointDoc.methods) methods = endpointDoc.methods.split(',')
  else methods = [ endpointDoc.method ]
  
  result.value = {
    id: `${group.id}.${endpointDoc.id}`,
    methods: methods,
    url: endpointUrl,
    params: [],
    body: [],
    responses: []
  }
  
  let urlParamRegex = /:(\w+)\/?/g
  
  
  if (Array.isArray(endpointDoc.responses)) {
    let respResult = await parseResponses(endpointDoc.responses, info, errorFormatter)
    result.mergeMessages(respResult)
    result.value.responses = respResult.value
  }
  
  if (typeof endpointDoc.params === 'object') {
    // ...
    let paramsResult = parseArgs('params', endpointDoc.params, errorFormatter)
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
    
    let bodyResult = parseArgs('body', endpointDoc.body, errorFormatter)
    result.mergeMessages(bodyResult)
    result.value.body = bodyResult.value
  }
  
  return result
}

/** @return {ParseResult} */
function parseArgs(argName, argsDoc, formatter) {
  
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
        arg.info = typeMatch[1]
        arg.type = typeMatch[2]
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
async function parseResponses(responsesDoc, info, formatter) {
  
  let result = new ParseResult([])
  
  for (let i in responsesDoc) {
    let respDoc = responsesDoc[i]
    
    let respFormatter = msg => formatter(`response[${i}] ${msg}`)
    
    result.addErrorIf(!respDoc.name, 'needs a name', respFormatter)
    result.addErrorIf(!respDoc.status, 'needs a status', respFormatter)
    result.addErrorIf(!respDoc.body, 'needs a body', respFormatter)
    
    if (result.hasErrors) continue
    
    let bodyPath = path.join(info.filedir, 'data', respDoc.body)
    let fullpath = path.join(__dirname, '..', bodyPath)
    
    try {
      let file = await stat(fullpath)
      
      if (path.extname(respDoc.body) !== '.json' || !file.isFile()) {
        result.addError(respFormatter('body is not a json file'))
        continue
      }
      
      result.value.push({
        name: respDoc.name,
        status: respDoc.status,
        body: JSON.parse(await readFile(fullpath))
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

async function walkDirectory(basePath, find) {
  let result = await readdir(basePath)
  
  let matches = []
  for (let i in result) {
    let filename = result[i]
    
    let subpath = path.join(basePath, filename)
    let info = await stat(subpath)
    
    if (info.isDirectory()) {
      matches = matches.concat(await walkDirectory(subpath, find))
    }
    else if (info.isFile() && find.test(filename)) {
      matches.push({ dir: basePath, file: filename })
    }
  }
  
  return matches
}
