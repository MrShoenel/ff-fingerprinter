require('../meta/typedefs');

const { defaultHashOptions } = require('../lib/FFFingerPrinter');


/**
 * @returns {FingerprintOptions}
 */
const createDefaultConfig = () => {
  return {
    ffConf: {
      ffmpegPath: 'c:\\users\\admin\\desktop\\ff\\ffmpeg.exe',
      ffprobePath: 'c:\\users\\admin\\desktop\\ff\\ffprobe.exe',
      enableMjpegWorkaround: true
    },
    hashConf: defaultHashOptions
  };
};

/** @type {FingerprintOptions} */
module.exports = Object.freeze({
  createDefaultConfig
});