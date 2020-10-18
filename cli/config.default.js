require('../meta/typedefs');

const { defaultHashOptions } = require('../lib/FFFingerPrinter');


/**
 * @returns {FingerprintOptions}
 */
const createDefaultConfig = () => {
  return {
    ffConf: {
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      enableMjpegWorkaround: true
		},
		miConf: {
			mediaInfoPath: 'mediainfo'
		},
		skipChapters: false,
		skipHashing: false,
		skipProbing: false,
		skipFFversions: false,
		skipMediaInfo: true,
		skipMediaInfoVersion: false,
    hashConf: defaultHashOptions
  };
};

/** @type {FingerprintOptions} */
module.exports = Object.freeze({
  createDefaultConfig
});