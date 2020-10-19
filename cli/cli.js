require('../meta/typedefs');

const program = require('commander')
, path = require('path')
, fs = require('fs')
, packagePath = path.resolve(path.dirname(__filename), '../package.json')
, package = JSON.parse(fs.readFileSync(packagePath))
, { createDefaultConfig } = require('./config.default')
, { FFFingerPrinter } = require('../lib/FFFingerPrinter')
, { LogLevel } = require('sh.log-client')
, { mergeObjects } = require('sh.orchestration-tools')
, defaultConfig = createDefaultConfig();


program
  .version(`\n  This is FFFingerPrinter@v${package.version} by ${package.author}\n`, '-v, --version')
  .option('-c, --config [config]', 'Optional. The path to a config-file that exports an instance of FingerPrintOptions. If not specified, will create a config from the file config.default.json.')
  .option('-f, --format [format]', 'Optional. Formats (indents) the output. Has no effect if the output is only the hash.', true)
  .option('-m, --ffmpeg [ffmpeg]', 'Optional. The path to FFmpeg; overrides the path defined in the config.')
  .option('-p, --ffprobe [ffprobe]', 'Optional. The path to FFprobe; overrides the path defined in the config.')
  .option('--quiet', 'Optional. If provided, will suppress any output to stderr.', false)
  .option('--only-hash', 'Optional. If provided, only the value of "hashAll" will be printed.', false)
  .option('--skip-probe', 'Optional. If provided, will not probe the file for its contents.')
  .option('--skip-hash', 'Optional. If provided, will only probe the file and skip hashing entirely.', false)
	.option('--skip-chapters', 'Optional. If provided, will not include the chapters in the probing or hashing.', false)
	.option('--skip-mediainfo', 'Optional. If provided, will not probe the file additionally using MediaInfo. This option requires probing.', false)
	.option('--skip-ffversions', 'Optional. If provided, will not include the ffmpeg and ffprobe versions in the output.', false)
	.option('--skip-miversion', 'Optional. If provided, will not include the MediaInfo version in the output', false)
  .description('FF-Fingerprinter uses FFmpeg to analyze and fingerprint media files. It provides extensive information as obtained from FFprobe and adds hashes to each stream and the file as a whole. The path to the file must be the last argument.')
  .parse(process.argv);

if (program.args.length === 0) {
  console.error('No file was given!');
  process.exit(-1);
}

/** @type {FingerprintOptions} */
const config = mergeObjects(defaultConfig, program.config ? require(path.resolve(program.config)) : {})
, timeout = setTimeout(() => {}, 2**30) /* To prevent terminating */;


if (program.ffmpeg) {
  config.ffConf.ffmpegPath = program.ffmpeg;
}
if (program.ffprobe) {
  config.ffConf.ffprobePath = program.ffprobe;
}

config.skipProbing = !!program.skipProbe;
config.skipHashing = !!program.skipHash;
config.skipMediaInfo = !!program.skipMediainfo;
config.skipFFversions = !!program.skipFfversions;
config.skipMediaInfoVersion = !!program.skipMiversion;
config.skipChapters = !!program.skipChapters;
config.hashConf.includeChapters = !program.skipChapters;


(async() => {
  const fffp = new FFFingerPrinter(program.args[0], config);
  if (program.quiet) {
    fffp.logger.logLevel = LogLevel.None;
  } else {
		fffp.logger.logDebug(`Using the following configuration: ${JSON.stringify(config, null, 2)}`);
	}

  try {
    const result = await fffp.fingerprint();
    if (program.onlyHash) {
      console.log(result.hashInfo.hashAll);
    } else {
      console.log(JSON.stringify(result, (key, value) => {
				if (typeof value === 'bigint') {
					return value.toString();
				}
				return value;
			}, program.format ? '  ' : ''));
    }
  } catch (e) {
    console.error(e);
    process.exit(-1);
  } finally {
    clearTimeout(timeout); // So it can terminate
  }
})();
