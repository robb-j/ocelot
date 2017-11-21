const fs = require('fs')
const { promisify } = require('util')

/** A util of promisified fs methods */
module.exports = {
  readdir: promisify(fs.readdir),
  stat: promisify(fs.stat),
  readFile: promisify(fs.readFile),
  writeFile: promisify(fs.writeFile),
  mkdir: promisify(fs.mkdir)
}
