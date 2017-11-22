const pug = require('pug')
const path = require('path')

const filesys = require('./filesys')

module.exports = class SpecRenderer {
  
  /** Util to run SpecRenderer#run */
  static run(spec, dir) {
    return (new this().run(spec, dir))
  }
  
  
  async run(spec, dir) {
    try {
      let tplPath = path.join(__dirname, '../template/index.pug')
      
      let html = pug.renderFile(tplPath, { spec })
      
      await filesys.writeFile(path.join(dir, 'index.html'), html)
    }
    catch (error) {
      console.log(error)
      return null
    }
  }
}
