const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const { promisify } = require('util')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

const program = require('commander')

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
  let errors = []
  
  
  for (let version of versionPaths) {
    
    let filepath = path.join(version.dir, version.file)
    
    let doc = await loadYML(filepath)
    
    let result = processDoc(filepath, doc)
    errors = errors.concat(result.errors)
    apiData.push(result.spec)
  }
  
  console.log('errors', errors)
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
  
  
  let spec = {
    info: {
      name: metaDoc.name || null,
      version: metaDoc.version || '0.0.0',
      base: metaDoc.base || '/',
      template: metaDoc.template || 'default'
    },
    groups: [ ]
  }
  
  let baseUrl = metaDoc.base || '/'
  
  let errors = []
  
  for (let groupName of metaDoc.groups) {
    
    let groupDoc = dataDoc[groupName]
    let groupUrl = path.join(baseUrl, groupDoc.base || '/')
    
    const groupError = message => `Group ${groupName} ${message}, file: ${filepath}`
    
    if (!groupDoc) {
      errors.push(groupError('Not found'))
      continue
    }
    
    if (!groupDoc.name) {
      errors.push(groupError(`needs a name`))
    }
    
    if (!groupDoc.endpoints || !Array.isArray(groupDoc.endpoints)) {
      errors.push(groupError(`needs endpoints as an array`))
      continue
    }
    
    
    
    let group = {
      name: groupDoc.name,
      base: groupDoc.base || null,
      endpoints: []
    }
    
    
    for (let i in groupDoc.endpoints) {
      let endpointDoc = groupDoc.endpoints[i]
      
      const endpointError = message => `Endpoint ${groupName}[${i}] ${message}, file: ${filepath}`
      
      if (!endpointDoc.id) {
        errors.push(endpointError('needs an id'))
      }
      
      if (!endpointDoc.method && !endpointDoc.methods) {
        errors.push(endpointError('needs a method / methods'))
      }
      
      if (!endpointDoc.url) {
        errors.push(endpointError('needs an url'))
        continue
      }
      
      let endpointUrl = path.join(groupUrl, endpointDoc.url)
      // console.log(endpointDoc.id + '\t', endpointUrl)
      
      let methods = []
      
      if (endpointDoc.methods) methods = endpointDoc.methods.split(',')
      else methods = [ endpointDoc.method ]
      
      let endpoint = {
        id: endpointDoc.id,
        methods: methods,
        url: endpointUrl,
        params: [],
        body: [],
        responses: []
      }
      
      
      if (Array.isArray(endpointDoc.responses)) {
        // ...
      }
      
      if (typeof endpointDoc.body === 'object') {
        // ...
      }
      
      if (typeof endpointDoc.body === 'object') {
        // ...
      }
      
      
      group.endpoints.push(endpoint)
      
    }
    
    spec.groups.push(group)
  }
  
  return { spec, errors }
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
