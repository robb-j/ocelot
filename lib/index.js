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
    .option('-i --input [dir]', 'Set the folder to watch')
    .option('-o --output [dir]', 'Set the folder to output html to')
    .parse(process.argv)
  
  
  if (!program.input || !program.output) {
    process.exit(1)
  }
  
  let input = program.input || 'api'
  let output = program.output || 'docs'
  
  
  // let inputDir = path.join(process.cwd(), input)
  // let outputDir = path.join(process.cwd(), output)
  
  // console.log('input', inputDir)
  // console.log('output', outputDir)
  
  let versionPaths = await walkDirectory(input, /^endpoints\.yml$/)
  
  // console.log(versionPaths)
  
  let apiData = []
  let allErrors = []
  let allWarns = []
  
  
  for (let version of versionPaths) {
    
    let filepath = path.join(version.dir, version.file)
    
    let doc = await loadYML(filepath)
    
    let result = processDoc(filepath, doc)
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

function processDoc(filepath, doc) {
  
  if (doc.length !== 2) {
    return [ `Expected 2 yaml documents, file: ${filepath}` ]
  }
  
  let metaDoc = doc[0]
  let dataDoc = doc[1]
  
  if (!Array.isArray(metaDoc.groups) || metaDoc.groups.length === 0) {
    return [ `No Groups defined, file: ${filepath}` ]
  }
  
  let result = new ParseResult({
    info: {
      name: metaDoc.name || null,
      version: metaDoc.version || '0.0.0',
      base: metaDoc.base || '/',
      template: metaDoc.template || 'default'
    },
    groups: [ ]
  })
  
  let baseUrl = metaDoc.base || '/'
  
  // let errors = []
  
  for (let groupId of metaDoc.groups) {
    
    let groupDoc = dataDoc[groupId]
    let groupUrl = path.join(baseUrl, groupDoc.base || '/')
    
    const groupError = message => `Group ${groupId} ${message}, file: ${filepath}`
    
    if (!groupDoc) {
      result.addError(groupError('Not found'))
      continue
    }
    
    if (!groupDoc.name) {
      result.addError(groupError(`needs a name`))
    }
    
    if (!groupDoc.endpoints || !Array.isArray(groupDoc.endpoints)) {
      result.addError(groupError(`needs endpoints as an array`))
      continue
    }
    
    
    
    let group = {
      name: groupDoc.name,
      base: groupDoc.base || null,
      endpoints: []
    }
    
    
    for (let i in groupDoc.endpoints) {
      let endpointDoc = groupDoc.endpoints[i]
      
      const endpointError = message => `Endpoint ${groupId}.${endpointDoc.id || i} ${message}, file: ${filepath}`
      
      if (!endpointDoc.id) {
        result.addError(endpointError('needs an id'))
      }
      
      if (!endpointDoc.method && !endpointDoc.methods) {
        result.addError(endpointError('needs a method / methods'))
      }
      
      if (!endpointDoc.url) {
        result.addError(endpointError('needs an url'))
        continue
      }
      
      let endpointUrl = path.join(groupUrl, endpointDoc.url)
      
      let methods = []
      
      if (endpointDoc.methods) methods = endpointDoc.methods.split(',')
      else methods = [ endpointDoc.method ]
      
      let endpoint = {
        id: `${groupId}.${endpointDoc.id}`,
        methods: methods,
        url: endpointUrl,
        params: [],
        body: [],
        responses: []
      }
      
      let urlParamRegex = /:(\w+)\/?/g
      
      
      if (Array.isArray(endpointDoc.responses)) {
        // ...
      }
      
      if (typeof endpointDoc.params === 'object') {
        // ...
        let paramsResult = parseArgs('params', endpointDoc.params, endpointError)
        result.mergeMessages(paramsResult)
        endpointDoc.params = result.value
        
        // Add warnings for undescribed url params
        let match = urlParamRegex.exec(endpointUrl)
        
        while (match) {
          if (!endpointDoc.params[match[1]]) {
            result.addWarning(endpointError(`url param '${match[1]}' not described`))
          }
          match = urlParamRegex.exec(endpointUrl)
        }
      }
      else if (urlParamRegex.exec(endpointUrl)) {
        result.addWarning(endpointError(`url params not described`))
      }
      
      if (typeof endpointDoc.body === 'object') {
        
        let bodyResult = parseArgs('body', endpointDoc.body, endpointError)
        result.mergeMessages(bodyResult)
        endpointDoc.body = result.value
        
      }
      
      
      group.endpoints.push(endpoint)
      
    }
    result.value.groups.push(group)
  }
  
  return result
}
/**
 * [parseArgs description]
 * @param  {object} argsObject
 * @param  {function} formatter
 * @return {ParseResult}
 */
function parseArgs(argName, argsObject, formatter) {
  
  let result = new ParseResult([])
  
  for (let name in argsObject) {
    let value = argsObject[name]
    
    let arg = { name }
    
    let optionalMatch = arg.name.match(/^\[(\w+)\]$/)
    if (optionalMatch) arg.name = optionalMatch[1]
    
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
    
    if (!arg.info) {
      result.addWarning(formatter(`${argName}.${name} has no info`))
    }
    
    if (!arg.type) {
      result.addWarning(formatter(`${argName}.${name} has no type`))
    }
    
    result.value.push(arg)
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
