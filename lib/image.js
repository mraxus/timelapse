const path = require('path')

const ExifImage = require('exif').ExifImage
const Image = require('lwip')
const Jimp = require('jimp')
const mapLimit = require('async/mapLimit')

function getNumLength(length) {
  return Math.ceil(Math.log10(length))
}
function getFilename(basePath, fileIndex, noOfFiles) {
  const size = getNumLength(noOfFiles)
  const seq = '0000000000' + fileIndex

  return path.resolve(basePath, `${seq.substr(seq.length - size)}.jpg`)
}

module.exports = {
  getInfo: async (imagePath) => {
    return new Promise((resolve, reject) => {
      new ExifImage({ image: imagePath }, (error, data) => {
        if (error) { return reject(error) }

        const { exif: { DateTimeOriginal, ExifImageWidth, ExifImageHeight } } = data
        const ts = DateTimeOriginal.split(' ')

        ts[0] = ts[0].split(':').join('-')

        resolve({
          imagePath,
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

    // console.log('time diffs', timeDiffs)

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
   * @param {string}    outputFolder              The output folder to store the images in. The path must exist
   * @param {function}  progressFunc              Callback function reporting the progress of the batch progress
   *                                                Params: (inputFile:string, outputFile:string, success:bool)
   *
   * @return {Promise}  {
   *                      completed: int            Number of files converted
   *                      errors:    int            Number of files could not be processed
   *                      pattern:   String         The file pattern of the files
   *                      results:   Array of {
   *                        error:      Object|null,
   *                        inputFile:  string,
   *                        outputFile: string,
   *                        success:    bool
   *                      }
   *                    }
   */
  resizeBatch: async function (imageInfoArray, width, processor, outputFolder, progressFunc) {
    const noOfImages = imageInfoArray.length
    const outputFilePattern = `${outputFolder}/%0${getNumLength(noOfImages)}d.jpg`

    const resizeImage = ({ input, index, width, height }, callback) => {
      const outputFile = getFilename(outputFolder, index, noOfImages)
      const inputFilename = input.split('/').pop()
      const outputFilename = outputFile.split('/').pop()

      this.execImageResize(input, outputFile, width, height, processor)
        .then(() => {
          progressFunc(inputFilename, outputFilename, true)
          callback(null, { error: null, inputFile: input, outputFile, success: true })
        })
        .catch((error) => {
          progressFunc(inputFilename, outputFilename, false)
          callback(null, { error, inputFile: input, outputFile, success: false })
        })
    }

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
          completed: results.filter(i => i.success).length,
          errors: results.filter(i => i.error).length,
          pattern: outputFilePattern,
          results,
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