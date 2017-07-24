const fs = require('fs')

const mapLimit = require('async/mapLimit')

const Image = require('./lib/image')
const Utils = require('./lib/utils')
const Video = require('./lib/video')

const IMG_PATH = process.argv[2] || 'input'
const DIR_NAME = getDirName(IMG_PATH)
const IMG_PROCESSING = process.argv[3] || 'lwip' // or 'jimp'
const OUTPUT_PATH= `output/${IMG_PROCESSING}-${DIR_NAME}.mp4`
const RND_NAME = Math.random().toString(36).substring(16)
const IMG_WIDTH = 2704 // 2.7K

async function main() {
  const tmpPath = await Utils.prepareTmpPath(RND_NAME)
  const imagePaths = fs.readdirSync(IMG_PATH).filter(isJpeg)
  const dataArray = await new Promise((res, rej) => {
    mapLimit(imagePaths.map(name => IMG_PATH + name), 512, Image.getInfo, (err, data) => {
      if (err) { return rej(err) }
      res(data)
    })
  })

  // TODO: Check integrity of files and remove files that are not ok (even better, fix them... but)
  const ordered = Image.orderBatch(dataArray)
  const { pattern, files, errors } = await Image.resizeBatch(ordered, IMG_WIDTH, IMG_PROCESSING, tmpPath)
  let result

  if (1.0 * errors.length / ordered.length > 0.2) {
    console.log('More than 20 % of the images could not be resized. Aborting the operation...')
    process.exit(-1)
  }

  try {
    result = await Video.saveFluent(pattern, OUTPUT_PATH)
    console.log(`Images processed: ${ files.length }, files errored: ${ errors.length }`)
    console.log('Result video: ' + result)
  } finally {
    // console.log('Removing temporary files')
    // for (let rmFile of files) { fs.unlinkSync(rmFile) }
  }
}

main().catch(err => console.log(err))

function isJpeg(filename) {
  return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')
}

function getDirName(path) {
  return path.split('/').filter(x => x && x !== '.').reduceRight((res, x) => res || x, '')
}
