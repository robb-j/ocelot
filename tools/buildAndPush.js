
// Imports
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const { promisify } = require('util')
const readFile = promisify(fs.readFile)


;(async () => {
  
  try {
    
    // Generate the image tag from the REGISTRY & VERSION files
    let registry = await readFile(path.join(__dirname, '..', 'REGISTRY'), 'utf8')
    let version = await readFile(path.join(__dirname, '..', 'VERSION'), 'utf8')
    
    // Generate tags for the image
    let tags = [ `${registry.trim()}:${version.trim()}` ]
    if (process.argv.includes('latest')) {
      tags.push(`${registry.trim()}:latest`)
    }
    
    // Reduce the tags into a statement
    let tagsStmt = tags.reduce((stmt, tag) => `${stmt}-t ${tag} `, '').trim()
    
    // Generate the command to run
    let cmd = `docker build ${tagsStmt} . && docker push ${tags[0]}`
    console.log('Running:', cmd)
    
    // Run the command
    if (!process.argv.includes('dry')) {
      let proc = exec(cmd)
      proc.stdout.pipe(process.stdout)
      proc.stderr.pipe(process.stderr)
    }
  }
  catch (error) {
    console.log(`Error: ${error.message}`)
  }
  
})()
