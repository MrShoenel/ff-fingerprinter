const path = require('path')
, { readFileSync } = require('fs')
, { assert } = require('chai')
, { FFFingerPrinter, defaultHashOptions } = require('../lib/FFFingerPrinter');


const toAbsPath = name => {
  return path.resolve(path.join(__dirname, './media/', name));
};

const readTestFile = name => {
  return readFileSync(toAbsPath(name)).toString('utf8');
};

/** @type {FingerprintOptions} */
const fpOptions = {
  ffConf: {
    enableMjpegWorkaround: true,
    ffmpegPath: 'C:\\users\\admin\\desktop\\ff\\ffmpeg.exe',
    ffprobePath: 'C:\\users\\admin\\desktop\\ff\\ffprobe.exe'
  },
  hashConf: defaultHashOptions
};


describe('FFFingerPrinter', function() {
  it('should create the same hashes', async function() {
    this.timeout(9999);

    const fffp = (new FFFingerPrinter(toAbsPath('org.mkv'), fpOptions)).disableLogging();

    const hashAudio = readTestFile('org_a_hash.txt').toLowerCase().trim()
    , hashVideo = readTestFile('org_v_hash.txt').toLowerCase().trim();

    let result = await fffp.fingerprint();

    /** @type {HashInfo} */
    const hi = result.hashInfo
    , hiVidStream = hi.hashesStreams.filter(s => s.index === 0)[0]
    , hiAudStream = hi.hashesStreams.filter(s => s.index === 1)[0];

    assert.strictEqual(result.fingerprint, hi.hashAll);

    assert.strictEqual(hiVidStream.hash, hashVideo);
    assert.strictEqual(hiAudStream.hash, hashAudio);


    // Now let's load the remux that only has the video:
    fffp.file = toAbsPath('remux_v_only.mkv');
    assert.strictEqual(fffp.result, null);
    result = await fffp.fingerprint();

    assert.strictEqual(result.streams.length, 1);
    assert.strictEqual(result.hashInfo.hashesStreams[0].hash, hiVidStream.hash);
    assert.strictEqual(result.hashInfo.hashesStreams[0].hashWithProps, hiVidStream.hashWithProps);
  });

  it('should be able to hash images as well', async function() {
    const fffp = (new FFFingerPrinter(toAbsPath('image.jpg'), fpOptions)).disableLogging();

    const hashImage = readTestFile('image_hash.txt').toLowerCase().trim();

    const result = await fffp.fingerprint();

    /** @type {HashInfo} */
    const hi = result.hashInfo, hiVidStream = hi.hashesStreams[0];

    assert.strictEqual(hiVidStream.hash, hashImage);
  });

  it('should generate different hashes for remuxes with same streams', async function() {
    this.timeout(9999);

    const fffp_1 = (new FFFingerPrinter(toAbsPath('org.mkv'), fpOptions)).disableLogging();
    const fffp_2 = (new FFFingerPrinter(toAbsPath('remux.mkv'), fpOptions)).disableLogging();

    const [ r1, r2 ] = await Promise.all([ fffp_1.fingerprint(), fffp_2.fingerprint() ]);
    /** @type {HashInfo} */
    const hi_1 = r1.hashInfo;
    /** @type {HashInfo} */
    const hi_2 = r2.hashInfo;

    assert.notEqual(hi_1.hashAll, hi_2.hashAll);

    const vs1 = hi_1.hashesStreams.filter(s => s.index === 0)[0]
    , vs2 = hi_2.hashesStreams.filter(s => s.index === 0)[0];

    assert.strictEqual(vs1.hash, vs2.hash);
    assert.strictEqual(vs1.hashWithProps, vs2.hashWithProps);

    const as1 = hi_1.hashesStreams.filter(s => s.index === 1)[0]
    , as2 = hi_2.hashesStreams.filter(s => s.index === 1)[0];

    assert.strictEqual(as1.hash, as2.hash);
    assert.strictEqual(as1.hashWithProps, as2.hashWithProps);
  });
});