const path = require('path')

const pug = require('pug')
const yaml = require('js-yaml')
const webpack = require('webpack')
const anisiRegex = require('ansi-regex')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')

const filesys = require('./filesys')

/** Renders an api spec into a directory using a template */
module.exports = class SpecRenderer {
  
  /** Util to run SpecRenderer#run */
  static run(...args) {
    return (new this().run(...args))
  }
  
  /** Util to run SpecRenderer#watchWebpack */
  static watchWebpack(...args) {
    return (new this()).watchWebpack(...args)
  }
  
  /** Renders an api spec into a directory using its template */
  async run(spec, dir, options) {
    options = options || {}
    
    // Generate the template directory
    let templateDir = path.join(process.cwd(), 'template')
    
    try {
      
      // Fetch the template info, an info.yml in the template directory
      let info = await this.getInfo(templateDir)
      
      // If webpack was specified and not disabled, run that
      if (info.webpack && !options.noWebpack) {
        await this.runWebpack(templateDir, info.webpack)
      }
      
      // Move the assets desired assets to the destination
      await this.moveAssets(info.assets, templateDir, dir)
      
      // Render the spec using pug
      let tplPath = path.join(templateDir, 'index.pug')
      let html = pug.renderFile(tplPath, { info, spec })
      
      // Write the html file into the destination
      await this.writeIndexFile(dir, html)
    }
    catch (error) {
      
      // Make errors into an array
      let errors = Array.isArray(error) ? error : [ error ]
      
      // Render the errors into html
      let tplPath = path.join(templateDir, 'error.pug')
      let html = pug.renderFile(tplPath, { errors })
      
      // Write the errors file
      await this.writeIndexFile(dir, html)
    }
  }
  
  /** Writes a html file into a directory as index.html */
  async writeIndexFile(dir, html) {
    try {
      await filesys.writeFile(path.join(dir, 'index.html'), html)
    }
    catch (error) {
      console.log(error)
    }
  }
  
  /** Read & parse the template info file, or make a blank */
  async getInfo(dir) {
    try {
      
      // Generate the path & parse the yaml
      let infoPath = path.join(dir, 'info.yml')
      let info = yaml.safeLoad(await filesys.readFile(infoPath))
      
      // Work out if assets was specified correctly
      let validAssets = info.assets && Array.isArray(info.assets) &&
        info.assets.reduce((flag, asset) => flag && typeof asset === 'string', true)
      
      // Return the parsed info file
      return {
        name: info.name || null,
        version: info.version || null,
        link: info.link || null,
        webpack: info.webpack || null,
        assets: validAssets ? info.assets : []
      }
    }
    catch (error) {
      
      // If anything failed, return a blank spec
      return { name: null, version: null, link: null, webpack: null, assets: [] }
    }
  }
  
  /** Move assets from the template directory, to a destination directory */
  async moveAssets(assets, templateDir, destDir) {
    
    // Ensure the destination is a directory
    await filesys.ensureDir(destDir)
    
    // Copy each in parallel
    return Promise.all(assets.map(asset => {
      return this.recursiveCopy(path.join(templateDir, 'assets'), asset, destDir)
    }))
  }
  
  /** Recursively copy a file/directory to a destination directory/file */
  async recursiveCopy(fromDir, file, destDir) {
    try {
      
      // Generate paths
      let filepath = path.join(fromDir, file)
      let destpath = path.join(destDir, file)
      
      // Get info about the file in question
      let stat = await filesys.stat(filepath)
      
      // If a directory, recurse
      if (stat.isDirectory()) {
        
        // Get the nested files
        let files = await filesys.readdir(filepath)
        
        // Ensure the dest is a file
        await filesys.ensureDir(destpath)
        
        // Loop through and move each file
        await Promise.all(files.map(subFile => {
          return this.recursiveCopy(filepath, subFile, destpath)
        }))
      }
      else if (stat.isFile()) {
        
        // If a file, copy the file
        await filesys.copyFile(filepath, destpath)
      }
    }
    catch (error) {
      console.log(error)
    }
  }
  
  /** Runs a specified webpack config in the template */
  runWebpack(templateDir, configPath) {
    
    // Generate a compiler and promisify the running of it
    let compiler = webpack(require(path.join(templateDir, configPath)))
    return new Promise((resolve, reject) => {
      
      compiler.run((error, stats) => {
        if (error) {
          reject(error)
        }
        else if (stats.hasErrors()) {
          // Because stats formatting doesnt work, use a regex
          reject(new Error(stats.toString().replace(anisiRegex(), '')))
        }
        else {
          resolve(stats)
        }
      })
    })
  }
  
  /** Watches the webpack of a template */
  async watchWebpack(spec, dir) {
    
    // Get the template directory & load our info
    let templateDir = path.join(process.cwd(), 'template')
    let info = await this.getInfo(templateDir)
    
    // If no config specified, stop here
    if (!info.webpack) return
    
    // Grab the webpack config & add the FriendlyErrors plugin
    let config = require(path.join(templateDir, info.webpack))
    config.plugins = config.plugins || []
    config.plugins.push(new FriendlyErrorsWebpackPlugin())
    
    // Watch the webpack
    webpack(config).watch({}, () => {})
  }
}
