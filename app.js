const fs = require('fs')

const mapLimit = require('async/mapLimit')

const Image = require('./lib/image')
const Video = require('./lib/video')

const IMG_PATH = process.argv[2] || 'input'
const DIR_NAME = getDirName(IMG_PATH)
const IMG_PROCESSING = process.argv[3] || 'lwip' // or 'jimp'
const OUTPUT_PATH= `output/${IMG_PROCESSING}-${DIR_NAME}.mp4`

async function main() {
  const imagePaths = fs.readdirSync(IMG_PATH).filter(isJpeg)
  const dataArray = await new Promise((res, rej) => {
    mapLimit(imagePaths.map(name => IMG_PATH + name), 512, Image.getInfo, (err, data) => {
      if (err) { return rej(err) }
      res(data)
    })
  })
  // TODO: Check integrity of files and remove files that are not ok (even better, fix them... but)
  const ordered = Image.orderBatch(dataArray)
  const { pattern, files, errors } = await Image.resizeBatch(ordered, 2704, IMG_PROCESSING) // 2.7K
  let result

  try {
    result = await Video.saveFluent(pattern, OUTPUT_PATH)
    console.log(`Images processed: ${ files.length }, files errored: ${ errors.length }`)
    console.log('Result video: ' + result)
  } finally {
    // console.log('Removing temporary files')
    // for (let rmFile of files) { fs.unlinkSync(rmFile) }
  }
}

main().then(() => { })

function isJpeg(filename) {
  return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')
}

function getDirName(path) {
  return path.split('/').filter(x => x && x !== '.').reduceRight((res, x) => res || x, '')
}
