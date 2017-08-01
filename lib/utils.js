const fs = require('fs')
const Path = require('path')

const mapLimit = require('async/mapLimit')


const SUP_DIR = 'timelapses'

function exists(path)      { return new Promise((res     ) => fs.exists(path,      (doesExist) => res(doesExist))) }
function mkdir(path)       { return new Promise((res, rej) => fs.mkdir(path,       (err, list) => err ? rej(err) : res(list))) }
function readdir(path)     { return new Promise((res, rej) => fs.readdir(path,     (err, list) => err ? rej(err) : res(list))) }
function rename(src, dest) { return new Promise((res, rej) => fs.rename(src, dest, (err) => err ? rej(err) : res())) }

async function createDirRecursive(path, dirs) {
  if (!dirs || !dirs.length) {
    return Promise.resolve(path)
  }

  const [nextDir, ...newDirs] = dirs
  const newPath = Path.resolve(path, nextDir)

  if (! await exists(newPath)) {
    await mkdir(newPath)
  }

  return await createDirRecursive(newPath, newDirs)
}

module.exports = {
  prepareTmpPath: async (name) => await createDirRecursive('/tmp', [SUP_DIR, name]),
  fs: {
    exists,
    mkdir,
    // mkdirRec: (path) => createDirRecursive('/', path.split('/')),
    readdir,
    rename,
  },
  Promise: {
    mapLimit: (arr, limit, fn) => {
      return new Promise((res, rej) => {
        mapLimit(arr, limit, fn, (err, data) => { err ? rej(err) : res(data) })
      })
    }
  },
}
