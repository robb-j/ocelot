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

function copyFile(from, to) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(from)
      .once('error', error => reject(error))
      .once('end', () => resolve())
      .pipe(fs.createWriteStream(to))
  })
}

async function isDir(path) {
  try {
    let stat = await module.exports.stat(path)
    return stat.isDirectory() && path
  }
  catch (error) {
    return false
  }
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
  ensureDir,
  isDir
}
