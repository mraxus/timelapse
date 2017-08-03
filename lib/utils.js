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
    /**
     * Run
     * @param {Array|Iterable|Object} coll            A collection of data to be mapped.
     * @param {number}                limit           The maximum number of parallel map jobs run at a time
     * @param {function}              iteratee        The function to be executed for each map job.
     *                                                Can be a callback function *(item, callback)*
     *                                                or a promise function *(item)*
     * @param {function}              [progressFunc]  Optional function reporting back after each completed mapping
     *
     * @return {Promise}              Returns a promise with the result as an array of the mapped items
     *                                in the same order as given as input
     */
    mapLimit: (coll, limit, iteratee, progressFunc = null) => {
      let mapFunc

      if (iteratee.length === 1 && progressFunc) { // Promise based function
        mapFunc = (item, callback) => {
          iteratee(item)
            .then(result => { progressFunc(); callback(null, result); })
            .catch(callback)
        }
      } else if (iteratee.length === 1) { // Promise based function
        mapFunc = (item, callback) => {
          iteratee(item).then(result => callback(null, result)).catch(callback)
        }
      } else if(progressFunc) { // Callback based function
        mapFunc = (item, callback) => {
          iteratee(item, (err, result) => { progressFunc(); callback(err, result) })
        }
      } else { // Callback based function
        mapFunc = iteratee
      }

      return new Promise((res, rej) => {
        mapLimit(coll, limit, mapFunc, (err, data) => { err ? rej(err) : res(data) })
      })
    }
  },
}
