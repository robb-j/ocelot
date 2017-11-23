const fs = require('fs')
const { promisify } = require('util')


async function ensureDir(dir) {
  try { await module.exports.stat(dir) }
  catch (error) { await module.exports.mkdir(dir) }
}


/** A util of promisified fs methods */
module.exports = {
  readdir: promisify(fs.readdir),
  stat: promisify(fs.stat),
  readFile: promisify(fs.readFile),
  writeFile: promisify(fs.writeFile),
  mkdir: promisify(fs.mkdir),
  copyFile: promisify(fs.copyFile),
  ensureDir: ensureDir
}
