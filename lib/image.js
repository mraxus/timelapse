const ExifImage = require('exif').ExifImage
const Image = require('lwip')
const Jimp = require('jimp')
const mapLimit = require('async/mapLimit')


module.exports = {
  getInfo: async function (imagePath) {
    return new Promise((resolve, reject) => {
      new ExifImage({ image: imagePath }, function (error, data) {
        if (error)
          return reject(error)

        const { exif: { DateTimeOriginal, ExifImageWidth, ExifImageHeight } } = data

        const ts = DateTimeOriginal.split(' ')
        ts[0] = ts[0].split(':').join('-')

        resolve({
            imagePath: imagePath,
          time: new Date(ts.join('T') + 'Z'),
          height: ExifImageHeight,
          width: ExifImageWidth,
        })
      })
    })
  },

  orderBatch: function (imageInfoArray) {
    const res = [...imageInfoArray].sort((a, b) => a.time - b.time)
    const timeDiffs = {}

    for (let i = 1; i < res.length; ++i) {
      const a = res[i-1]
      const b = res[i]
      const diff = (b.time - a.time) / 1000 + ' sec'

      timeDiffs[diff] = (timeDiffs[diff] || 0) + 1

      if (b.width !== a.width || b.height !== a.height) {
        throw new Error('Images are not the same format:', { a, b })
      }
    }

    console.log('time diffs', timeDiffs)

    return res
  },

  /**
   *
   * @param {Object[]}  imageInfoArray
   * @param {string}    imageInfoArray[].imagePath
   * @param {Date}      imageInfoArray[].time
   * @param {int}       imageInfoArray[].height
   * @param {int}       imageInfoArray[].width
   * @param {int}       width                     The resulting image width (height is calculated based on the rest)
   * @param {string}    processor                 Which image processor that is to be used (l or j)
   *
   * @return {Promise}
   */
  resizeBatch: async function (imageInfoArray, width, processor) {
    const len = imageInfoArray.length
    const size = Math.ceil(Math.log10(imageInfoArray.length))
    const tmpFilePattern = `/tmp/timelapses/_${processor}-${ Math.random().toString(36).substring(16) }-%0${size}d.jpg`

    const pad = (num, size) => { const s = '0000000000' + num; return s.substr(s.length - size); }
    const resizeImage = ({ input, index, width, height }, callback) => {
      const output = tmpFilePattern.replace(`%0${size}d`, pad(index, size))

      console.log(`processing ${ index + 1 } / ${ len } - (${ input } => ${ output }) ...`)

      this.execImageResize(input, output, width, height, processor)
        .then(() => {
          console.log(`${ index + 1 } / ${ len } done`)
          callback(null, { inputFile: input, outputFile: output, success: true })
        })
        .catch((error) => {
          console.log(` Failed to process... skipping and continuing`, error)
          callback(null, { inputFile: input, error })
        })
    }

    console.log('tmpFilePattern', tmpFilePattern)

    return new Promise((resolve, reject) => {
      const inputs = imageInfoArray.map((v, index) => ({
        input: v.imagePath,
        index,
        width: width,
        height: width * v.height / v.width,
      }))
      mapLimit(inputs, 8, resizeImage,
        (err, results) => {
        if (err) {
          return reject(err)
        }
        resolve({
          pattern: tmpFilePattern,
          files: results.filter(i => i.success).map(i => i.outputFile),
          errors: results.filter(i => i.error)
        })
      })
    })
  },

  execImageResize: function (inputFilename, outputFilename, width, height, processor) {
    return new Promise((resolve, reject) => {
      const { execFile } = require('child_process');
      const opts = ['--harmony', 'resize', outputFilename, inputFilename, width, height, processor]
      execFile('node', opts, (err) => {
        if (err) { reject('Failed processing image') }
        else     { resolve() }
      })
    })
  },

  lResizeImage: function (inputFilename, outputFilename, width, height) {
    return new Promise((resolve, reject) => {
      Image.open(inputFilename, function(err, image) {
        if (err) { return reject(err) }
        image.batch()
          .resize(width, height)
          //.crop(0, 180, 1920, 1080)
          .writeFile(outputFilename, function(err) {
            if (err) { return reject(err) }
            resolve(outputFilename)
          })
      })
    })
  },

  jResizeImage: function (inputFilename, outputFilename, width, height) {
    return Jimp
      .read(inputFilename)
      .then(image => image
          .resize(width, height)
          //.crop(0, 180, 1920, 1080)
          .write(outputFilename)
      )
  },
}