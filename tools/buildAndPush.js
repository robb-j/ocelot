
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
    let tag = `${registry.trim()}:${version.trim()}`
    
    // Generate the command to run
    let cmd = `docker build -t ${tag} . && docker push ${tag}`
    console.log('Running', cmd)
    
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
