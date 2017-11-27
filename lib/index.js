const path = require('path')
const program = require('commander')
const express = require('express')
const opn = require('opn')

const filesys = require('./filesys')
const SpecParser = require('./SpecParser')
const SpecRenderer = require('./SpecRenderer')

;(async () => {
  
  // A commander program to get CLI input
  program.version('0.1.0')
    .option('-i --input [dir]', 'Set the folder to watch [api]', 'api')
    .option('-o --output [dir]', 'Set the folder to output html to [docs]', 'docs')
    .option('-w --watch', 'Set up a server to parse & render the spec on request')
    .parse(process.argv)
  
  // If watch passed, start a server
  if (program.watch) {
    await startWatchServer(program.input, program.output)
  }
  else {
    
    // If not watching, just render once
    await processEndpoints(program.input, program.output)
  }
  
})()


/** Ensure the output directory is valid or exit the program */
async function ensureOutputDir(outputDir) {
  try {
    
    // Try to lookup the file's stats
    let file = await filesys.stat(outputDir)
    
    // Fail if it is not a directory
    if (!file.isDirectory()) {
      console.log(`Cannot output to file ${outputDir}`)
      process.exit(1)
    }
  }
  catch (error) {
    try {
      
      // If it doesn't exist, create it
      await filesys.mkdir(outputDir)
    }
    catch (error) {
      
      // If we couldn't create it, fail
      console.log(`Cannot create output folder '${outputDir}', error: '${error.message}'`)
      program.exit(1)
    }
  }
}

/** Start an express server to watch and render the endpoints */
async function startWatchServer(input, output) {
  
  // Create an express server
  let app = express()
  
  // On get, process & render endpoints
  let middleware = (req, res, next) =>
    processEndpoints(input, output).then(next)
  app.use('/', middleware)
  app.use(express.static(output))
  
  // Listen on 8080
  process.stdout.write('Watcher started on localhost:8080')
  app.listen(8080)
  opn('http://localhost:8080')
}

/** Processes the endpoints in 'input' and render to 'output' */
async function processEndpoints(input, output, options) {
  
  // Find endpoint.yml files in the input directory
  let result = await SpecParser.run(input, /^endpoints\.yml$/)
  
  // Ensure the output directory exists
  let outputDir = path.join(process.cwd(), output)
  await ensureOutputDir(outputDir)
  
  // Write the spec file
  let specPath = path.join(outputDir, 'spec.json')
  await filesys.writeFile(specPath, JSON.stringify(result.value))
  
  // Render the docs w/ the template
  await SpecRenderer.run(result.value, outputDir, options)
}
