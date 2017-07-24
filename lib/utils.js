const fs = require('fs')
const Path = require('path')


const SUP_DIR = 'timelapses'

function exists(path) {
  return new Promise(res => fs.exists(path, (doesExist) => res(doesExist)))
}

function createDir(path) {
  return new Promise((res, rej) => {
    fs.mkdir(path, (err) => { err ? rej(err) : res() })
  })
}

async function createDirRec(path, dirs) {
  if (!dirs || !dirs.length) {
    return Promise.resolve(path)
  }

  const [nextDir, ...newDirs] = dirs
  const newPath = Path.resolve(path, nextDir)

  if (! await exists(newPath)) {
    await createDir(newPath)
  }

  return await createDirRec(newPath, newDirs)
}

module.exports = {
  prepareTmpPath: async function (name) { return await createDirRec('/tmp', [SUP_DIR, name]) },
}
