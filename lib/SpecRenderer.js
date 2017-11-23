const pug = require('pug')
const yaml = require('js-yaml')
const path = require('path')

const webpack = require('webpack')
const anisiRegex = require('ansi-regex')

const filesys = require('./filesys')

module.exports = class SpecRenderer {
  
  /** Util to run SpecRenderer#run */
  static run(spec, dir) {
    return (new this().run(spec, dir))
  }
  
  
  async run(spec, dir) {
    
    let templateDir = path.join(process.cwd(), 'template')
    
    try {
      let tplPath = path.join(templateDir, 'index.pug')
      
      let info = await this.getInfo(templateDir)
      
      if (info.webpack) {
        await this.runWebpack(templateDir, info.webpack)
      }
      
      await this.moveAssets(info.assets, templateDir, dir)
      
      let html = pug.renderFile(tplPath, { info, spec })
      
      await this.writeIndexFile(dir, html)
    }
    catch (error) {
      
      let errors = Array.isArray(error) ? error : [ error ]
      
      let tplPath = path.join(templateDir, 'error.pug')
      let html = pug.renderFile(tplPath, { errors })
      
      await this.writeIndexFile(dir, html)
      
      return null
    }
  }
  
  async writeIndexFile(dir, html) {
    try {
      await filesys.writeFile(path.join(dir, 'index.html'), html)
    }
    catch (error) {
      console.log(error)
    }
  }
  
  async getInfo(dir) {
    try {
      let infoPath = path.join(dir, 'info.yml')
      let info = yaml.safeLoad(await filesys.readFile(infoPath))
      
      let validAssets = info.assets && Array.isArray(info.assets) &&
        info.assets.reduce((flag, asset) => flag && typeof asset === 'string', true)
      
      return {
        name: info.name || null,
        version: info.version || null,
        link: info.link || null,
        webpack: info.webpack || null,
        assets: validAssets ? info.assets : []
      }
    }
    catch (error) {
      return {
        name: null,
        version: null,
        link: null,
        webpack: null,
        assets: []
      }
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
    
    // ...
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
  
  async runWebpack(templateDir, configPath) {
    let config = require(path.join(templateDir, configPath))
    return new Promise((resolve, reject) => {
      webpack(config, (error, stats) => {
        
        if (error) {
          reject(error)
        }
        else if (stats.hasErrors()) {
          
          // Because stats formatting doesnt work, use a regex
          let message = stats.toString().replace(anisiRegex(), '')
          reject(new Error(message))
        }
        else {
          resolve(stats)
        }
        
      })
    })
  }
}
