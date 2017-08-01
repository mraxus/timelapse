const videoShow = require('videoshow')
const ffmpeg = require('fluent-ffmpeg')

const videoOptions = {
  r: 1/25,
  fps: 25,
  //loop: 1, // seconds
  transition: false,
  videoBitrate: 1024,
  videoCodec: 'libx264',
  //size: '1920x?',
  format: 'mp4',
  pixelFormat: 'yuv420p'
}

module.exports = {
  saveFluent: async function (imagePattern, output, progressFunc) {
    return new Promise((resolve, reject) => {
      let chain = ffmpeg([
        '-r 24',
        '-crf 18',
        '-preset slow',
        ' -s hd1080',
      ])

      chain = chain.input(imagePattern)

      chain.videoCodec('libx264')
        .videoBitrate('26000k', true)
        .on('progress', (progress) => {
          // progress: {"frames":4,"currentFps":0,"currentKbps":107226.1,"targetSize":525,"timemark":"00:00:00.04","percent":25}
          progressFunc(progress.percent)
        })
        .on('error', function (err) {
          console.error('Error Processing', err);
          reject(err)
        })
        .on('end', () => {
          progressFunc(100)
          resolve(output)
        })
        .save(output)
    })
  },
  save: async function (imageInfoArray) {
    return new Promise((resolve, reject) => {
      const images = imageInfoArray.map(x => x.imagePath)

      console.log(images)

      videoShow(images, videoOptions)
        .save('output/video.mp4')
        .on('start', function (command) {
          console.log('ffmpeg process started:', command)
        })
        .on('error', function (err, stdout, stderr) {
          console.error('Error:', err)
          console.error('ffmpeg stderr:', stderr)
          reject(err)
        })
        .on('progress', function (one) {
          console.log('progress:', one)
        })
        .on('end', function (output) {
          console.log('Video created in:', output)
          resolve(output)
        })
    })
  },
}