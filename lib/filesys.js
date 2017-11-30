const fs = require('fs')
const { promisify } = require('util')


async function ensureDir(dir) {
  try { await module.exports.stat(dir) }
  catch (error) { await module.exports.mkdir(dir) }
}

async function canAccess(file) {
  try {
    await module.exports.access(file)
    return true
  }
  catch (error) {
    return false
  }
}

async function copyFile(from, to) {
  fs.createReadStream(from).pipe(fs.createWriteStream(to))
}


/** A util of promisified fs methods */
module.exports = {
  readdir: promisify(fs.readdir),
  stat: promisify(fs.stat),
  readFile: promisify(fs.readFile),
  writeFile: promisify(fs.writeFile),
  mkdir: promisify(fs.mkdir),
  access: promisify(fs.access),
  
  copyFile,
  canAccess,
  ensureDir
}
