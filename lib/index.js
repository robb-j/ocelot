#!/usr/bin/env node

const path = require('path')
const program = require('commander')
const express = require('express')
const portfinder = require('portfinder')

const version = require('../package.json').version

const filesys = require('./filesys')
const SpecParser = require('./SpecParser')
const SpecRenderer = require('./SpecRenderer')

;(async () => {
  
  // A commander program to get CLI input
  program.version(version)
    .option('-i --input [dir]', 'Set the folder to watch [api]', 'api')
    .option('-o --output [dir]', 'Set the folder to output html to [docs]', 'docs')
    .option('-w --watch [port] ', 'Set up a server to parse & render the spec on request [8080]')
    .parse(process.argv)
  
  if (process.watch === true) process.watch = '8080'
  
  // If watch passed, start a server
  if (program.watch) {
    portfinder.basePort = program.watch
    let port = await portfinder.getPortPromise()
    await startWatchServer(program.input, program.output, port)
  }
  else {
    
    try {
      // If not watching, just render once
      await processEndpoints(program.input, program.output)
    }
    catch (error) {
      console.log(error.message)
      process.exit(1)
    }
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
async function startWatchServer(input, output, port) {
  
  // Create an express server
  let app = express()
  
  // On get, process & render endpoints
  app.use('/', async (req, res, next) => {
    processEndpoints(input, output).then(next)
      .catch(error => res.status(400).send(error.message))
  })
  app.use(express.static(output))
  
  // Listen on 8080
  console.log(`Watcher started on localhost:${port}`)
  app.listen(port)
}

/** Processes the endpoints in 'input' and render to 'output' */
async function processEndpoints(input, output, options) {
  
  // Find endpoint.yml files in the input directory
  let result = await SpecParser.run(input)
  
  // Ensure the output directory exists
  let outputDir = path.join(process.cwd(), output)
  await ensureOutputDir(outputDir)
  
  // Write the spec file
  let specPath = path.join(outputDir, 'spec.json')
  await filesys.writeFile(specPath, JSON.stringify(result.value))
  
  // Render the docs w/ the template
  await SpecRenderer.run(result, outputDir, options)
}
