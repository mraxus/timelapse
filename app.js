const fs = require('fs')

const ProgressBar = require('progress');

const Image = require('./lib/image')
const Video = require('./lib/video')
const { fs: { readdir, rename }, prepareTmpPath, Promise: { mapLimit } } = require('./lib/utils')

const IMG_PATH = process.argv[2] || 'input'
const DIR_NAME = getDirName(IMG_PATH)
const IMG_PROCESSING = process.argv[3] || 'lwip' // or 'jimp'
const OUTPUT_PATH= `output/${IMG_PROCESSING}-${DIR_NAME}.mp4`
const RND_NAME = Math.random().toString(36).substring(16)
const IMG_WIDTH = 2704 // 2.7K
const CUTOFF_PERCENTAGE = 35


// Run program
main().catch(err => console.log(err))

async function main() {
  const tmpPath = await prepareTmpPath(RND_NAME)
  const filePaths = await readdir(IMG_PATH)
  const imagePaths = filePaths.filter(isJpeg).map(name => IMG_PATH + name)
  let bar = getProgressbar('1. Reading images ', imagePaths.length, 'number')
  bar.update(0)

  const dataArray = await mapLimit(imagePaths, 64, Image.getInfo, () => bar.tick())

  bar = getProgressbar('2. Resizing images', dataArray.length, 'number', ' | :input -> :output :info')
  bar.update(0, { input: '', output: '', info: '' })

  // TODO: Fix integrity problems with some files
  const ordered = Image.orderBatch(dataArray)
  const {
    completed,
    errors,
    pattern,
    results
  } = await Image.resizeBatch(ordered, IMG_WIDTH, IMG_PROCESSING, tmpPath, resizeProgress)
  let result

  function resizeProgress(input, output, success) {
    bar.tick(1, { input, output, info: (success ? '' : '| failed :-(') })
  }

  if (1.0 * errors / results.length > (CUTOFF_PERCENTAGE / 100.0)) {
    console.log(`More than ${CUTOFF_PERCENTAGE} % of the images could not be resized. Aborting the operation...`)
    process.exit(-1)
  }

  if (errors) {
    bar = getProgressbar('3. Renaming images', getCountOfFilesToRename(results), 'number', ' | :input -> :output')
    bar.update(0, { input: '', output: '' })

    // console.log('There were errors while processing some images. Renaming files for uninterrupted sequence...')
    await renameResizedImagesInSequence(results, (input, output) => bar.tick(1, { input, output }))
  } else {
    console.log('  3. Renaming images: No images needed to be renamed')
  }

  try {
    bar = getProgressbar('4. Compiling video', 100, 'percent')
    bar.update(0, { input: '', output: '' })

    result = await Video.saveFluent(pattern, OUTPUT_PATH, (percent) => bar.update(percent / 100.0))
    console.log('')
    console.log(`Images processed: ${ completed }, files errored: ${ errors }`)
    console.log(`Output file pattern: ${ pattern }`)
    console.log(`Video output: ${ result }`)
  } finally {
    // console.log('Removing temporary files')
    // for (let rmFile of files) { fs.unlinkSync(rmFile) }
  }
}

  /********************/
 /* Helper functions */
/********************/

function getProgressbar(title, total, type, suffix = '') {
  let progressTicker
  switch(type) {
    case 'number':
      progressTicker = ':current/:total'
      break;

    case 'percent':
    default:
      progressTicker = ':percent'
  }
  return new ProgressBar(`  ${ title } [:bar] ${ progressTicker } :etas${suffix}`, {
    complete: '=',
    incomplete: ' ',
    width: 60,
    total,
  });
}

/*
 Tests:
   getCountOfFilesToRename([{"success":false},{"success":false},{"success":true }]) === 1
   getCountOfFilesToRename([{"success":true },{"success":false},{"success":true }]) === 1
   getCountOfFilesToRename([{"success":false},{"success":false},{"success":true },{"success":true }]) === 2
   getCountOfFilesToRename([{"success":true },{"success":false},{"success":true },{"success":true }]) === 2
   getCountOfFilesToRename([{"success":false},{"success":true },{"success":false}]) === 1
   getCountOfFilesToRename([{"success":true },{"success":true },{"success":true }]) === 0
   getCountOfFilesToRename([{"success":false},{"success":false},{"success":false}]) === 0
   getCountOfFilesToRename([{"success":true },{"success":false},{"success":true },{"success":true },{"success":false},{"success":true }]) === 3
   getCountOfFilesToRename([{"success":true },{"success":false},{"success":true },{"success":true },{"success":false},{"success":false}]) === 2
 */
function getCountOfFilesToRename(files) {
  return files.reduce(({ count, error }, { success }) => {
    return { count: count + (error && success ? 1 : 0), error: error || !success }
  }, { count: 0, error: false }).count
}

function renameResizedImagesInSequence(fileArray, progressFunc) {
  return fileArray.reduce(({ promise, nameBuffer }, {outputFile, success}) => {
    // File not needed to be renamed, just continue
    if (success && !nameBuffer.length) {
      return { promise, nameBuffer }
    }

    // All following files needs to be renamed, so add file's name to buffer
    nameBuffer.push(outputFile)

    // File was not created, no more work needed
    if (!success) {
      return { promise, nameBuffer }
    }

    // File is to be renamed and needs to do this in sequence
    const renameFileTo = nameBuffer.shift()

    return {
      nameBuffer,
      promise: promise.then(() => {
        return rename(outputFile, renameFileTo)
          .then(() => { progressFunc(outputFile.split('/').pop(), renameFileTo.split('/').pop()) })
      })
    }
  }, { promise: Promise.resolve(), nameBuffer: [] })
    .promise
}

function isJpeg(filename) {
  return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')
}

function getDirName(path) {
  return path.split('/').filter(x => x && x !== '.').reduceRight((res, x) => res || x, '')
}
