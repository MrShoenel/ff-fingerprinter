const { defaultHashOptions, FFFingerPrinter } = require('./lib/FFFingerPrinter');



const fp = new FFFingerPrinter('n:\\s\\motion\\1080\\series\\The Big Bang Theory\\Season 1\\02. The Big Bran Hypothesis.mkv', {
  ffConf: {
    ffmpegPath: 'c:\\users\\admin\\desktop\\ff\\ffmpeg.exe',
    ffprobePath: 'c:\\users\\admin\\desktop\\ff\\ffprobe.exe',
    enableMjpegWorkaround: true
  },
  hashConf: defaultHashOptions
});

setTimeout(() => {}, 9999999);


(async() => {
  const x = await fp.fingerprint();
})();