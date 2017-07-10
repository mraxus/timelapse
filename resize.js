const SRC = process.argv[3]
const DST = process.argv[2]
const width  = +(process.argv[4] || 1920)
const height = +(process.argv[5] || 1080)
const IMG_PROCESSING = process.argv[6] || 'lwip' // or 'jimp'

require('./lib/image')[IMG_PROCESSING[0] + 'ResizeImage'](SRC, DST, width, height)
  .then(() => { console.log('{"processed": true}') })
  .catch(err => { console.log(`{"processed": false, "error": "${ err.message }"}`); process.exit(-1) })