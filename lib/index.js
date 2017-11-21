
const path = require('path')
const program = require('commander')

const filestore = require('./filestore')
const SpecParser = require('./SpecParser')

;(async () => {
  
  // A commander program to get CLI input
  program.version('0.1.0')
    .option('-i --input [dir]', 'Set the folder to watch [api]', 'api')
    .option('-o --output [dir]', 'Set the folder to output html to [docs]', 'docs')
    .parse(process.argv)
  
  
  // Find endpoint.yml files in the input directory
  let result = await SpecParser.run(program.input, /^endpoints\.yml$/)
  
  // Ensure the output directory exists
  let outputDir = path.join(__dirname, '..', program.output)
  await ensureOutputDir(outputDir)
  
  // Write the spec file
  let specPath = path.join(outputDir, 'spec.json')
  await filestore.writeFile(specPath, JSON.stringify(result.value))
  
  // Render the docs w/ the template
  // ...
  
})()


/** Ensure the output directory is valid or exit the program */
async function ensureOutputDir(outputDir) {
  try {
    
    // Try to lookup the file's stats
    let file = await filestore.stat(outputDir)
    
    // Fail if it is not a directory
    if (!file.isDirectory()) {
      console.log(`Cannot output to file ${outputDir}`)
      process.exit(1)
    }
  }
  catch (error) {
    try {
      
      // If it doesn't exist, create it
      await filestore.mkdir(outputDir)
    }
    catch (error) {
      
      // If we couldn't create it, fail
      console.log(`Cannot create output folder '${outputDir}', error: '${error.message}'`)
      program.exit(1)
    }
  }
}
