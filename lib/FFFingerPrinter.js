require('../meta/typedefs');

const path = require('path')
, { createHash } = require('crypto')
, { stat, readFile } = require('fs')
, { spawn } = require('child_process')
, { inspect } = require('util')
, { mergeObjects, Resolve, Job, JobQueue, ProcessWrapper } = require('sh.orchestration-tools')
, { LogLevel, ColoredConsoleLogger, DevNullLogger } = require('sh.log-client');



/** @type {StreamOptions} */
const defaultStreamOptions = Object.freeze({
  types: ['audio', 'video', 'subtitle'],
  ids: []
});

/** @type {Array.<HashModeBytes>} */
const defaultHashModeBytes = [{
  streamType: 'audio',
  bytes: 10e6
}, {
  streamType: 'video',
  bytes: 80e6
}, {
  streamType: 'subtitle',
  bytes: 5000
}];

/** @type {HashOptions} */
const defaultHashOptions = Object.freeze({
  hashAlgo: 'sha256',
  includeChapters: true,
  mode: 'fast',
  modeBytes: defaultHashModeBytes,
  numStreamsParallel: 4,
  streamConf: defaultStreamOptions
});


class FFFingerPrinter {
  /**
   * 
   * @param {string} file The absolute path to the file to fingerprint.
   * @param {FingerprintOptions} fprintOptions Options for how the fingerprinting should be done.
   */
  constructor(file, fprintOptions) {
    this._file = file;
    this._opts = fprintOptions;

    /** @type {FingerprintOptions} */
    this.fprintOptions = Object.freeze(mergeObjects(
      {},
      {
				ffConf: fprintOptions.ffConf,
				miConf: fprintOptions.miConf
      },
      {
        hashConf: mergeObjects(
          {},
          defaultHashOptions,
          fprintOptions.hashConf
        )
      }
    ));

    /** @type {ProbeResultWithHashInfo} */
    this._result = null;

    this._queue = new JobQueue(this.fprintOptions.hashConf.numStreamsParallel);

    this.logger = new ColoredConsoleLogger(FFFingerPrinter, {
      useError: new Set([
        LogLevel.Critical, LogLevel.Debug, LogLevel.Error,
        LogLevel.Information, LogLevel.None, LogLevel.Trace, LogLevel.Warning
      ]),
      useInfo: new Set(),
      useLog: new Set()
    });
    this.logger.logLevel = LogLevel.Trace;
  };

  /**
   * Disables logging entirely.
   * 
   * @returns {this}
   */
  disableLogging() {
    this.logger = new DevNullLogger(FFFingerPrinter);
    return this;
  };

  /**
   * @returns {string}
   */
  get file() {
    return this._file;
  };

  /**
   * @param {string} value
   */
  set file(value) {
    this.logger.logInfo(`A new file was set: ${value}`);
    this._file = value;
    this._result = null;
  };

  /**
   * @returns {null|ProbeResultWithHashInfo} Returns the result of probing and hashing the file. Returns null if the probing is not yet finished or if it failed.
   */
  get result() {
    return this._result;
  };

  async fingerprint() {
    this.logger.logInfo(`Fingerprinting file: ${this.file}`);
    if (this._result !== null) {
      return this.result;
    }

    /** @type {ProbeResult} */
    let probeResult = {
      format: {},
      streams: [],
      chapters: []
    };
    if (!this._opts.skipProbing) {
      const pwProbe = new ProcessWrapper(this.fprintOptions.ffConf.ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams', '-show_format', '-show_chapters',
        this.file
      ]);

      this.logger.logDebug(`Probing (ffprobe) ..`);
      /** @type {ProbeResult} */
      probeResult = FFFingerPrinter._renameInvalidProperties(
				FFFingerPrinter._convertProperties(
					JSON.parse((await pwProbe.spawnAsync(false)).stdOut)));
      probeResult.streams = Resolve.isTypeOf(probeResult.streams, []) ?
        probeResult.streams : [];
      probeResult.chapters = Resolve.isTypeOf(probeResult.chapters, []) ?
        probeResult.chapters : [];
      if (this._opts.skipChapters) {
        probeResult.chapters = [];
			}
			// Sometimes, there are no tags. We should however always have the
			// 'tags' property, even if it is empty.
			probeResult.streams.forEach(strm => strm.tags = strm.tags || Object.create(null));
			this.logger.logInfo(`Found ${probeResult.streams.length} streams and ${probeResult.chapters.length} chapters.`);

			
			// Also, check MediaInfo if requested:
			if (!this._opts.skipMediaInfo) {
				const pwProbeMi = new ProcessWrapper(this.fprintOptions.miConf.mediaInfoPath, [
					'--Output=JSON', this.file
				]);

				this.logger.logDebug(`Probing (MediaInfo) ..`);
				/** @type {ProbeResultMediaInfo} */
				const probeResultMediaInfo = FFFingerPrinter._renameInvalidProperties(
					FFFingerPrinter._convertProperties(
						JSON.parse((await pwProbeMi.spawnAsync(false)).stdOut)));
				
				probeResult.format.media_info =
					probeResultMediaInfo.media.track.find(track => track._type === 'General');

				probeResult.streams.map(strm => {
					const miStream = probeResultMediaInfo.media.track.find(track => {
						if ('id' in strm && track.ID === strm.id) {
							return true;
						}

						const idMatch = 'StreamOrder' in track ?
							`${track.StreamOrder}`.match(/^\d+?\-(?<id>\d+?)$/) : null;
						let id = -1;
						if (idMatch !== null) {
							id = parseInt(idMatch.groups.id, 10);
						} else {
							id = track.ID - 1;
						}
						return id === strm.index;
					});
					strm.media_info = miStream;
				});
			} else {
				this.logger.logInfo('Skipping probing the file using MediaInfo.');
			}
    } else {
      this.logger.logInfo('Skipping probing the file.');
		}

    /** @type {ProbeResultWithHashInfo} */
    const resultWithHashInfo = mergeObjects({}, probeResult);
    resultWithHashInfo.hashInfo = { };

    if (!this._opts.skipHashing) {
      resultWithHashInfo.hashConf = this.fprintOptions.hashConf;
      this._hashChapters(resultWithHashInfo);
      this._hashFormat(resultWithHashInfo);
      await this._hashStreams(resultWithHashInfo);
      this._hashAll(resultWithHashInfo);
    } else {
      this.logger.logInfo('Skipping hashing the file.');
    }

    resultWithHashInfo.hashInfo.fileName = path.basename(this.file);
    resultWithHashInfo.hashInfo.filePath = path.dirname(this.file);
    resultWithHashInfo.hashInfo.hashTime = (new Date()).toUTCString();
    resultWithHashInfo.hashInfo.fileTimes = await this._getTimeStamps();

    if (!this._opts.skipFFversions) {
			resultWithHashInfo.hashInfo.fffVersions =
				await this._getFFFVersions(!this._opts.skipMediaInfoVersion);
    } else {
      this.logger.logInfo('Skipping obtaining ffmpeg/ffprobe and MediaInfo versions.');
		}

    return this._result = resultWithHashInfo;
  };

  /**
	 * @access protected
   * @returns {Promise.<FileTimes>}
   */
  _getTimeStamps() {
    return new Promise((resolve, reject) => {
      stat(this.file, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            accessTime: stats.atime.toUTCString(),
            modTime: stats.mtime.toUTCString(),
            changeTime: stats.ctime.toUTCString(),
            createTime: stats.birthtime.toUTCString()
          });
        }
      });
    });
	};

  /**
	 * @access protected
   * @returns {Promise.<FFFVersions>}
   */
  _getFFFVersions(includeMediaInfo = true) {
    return new Promise(async(resolve, reject) => {
      /** @type {Promise.<string>} */
      const fffVersionPromise = new Promise((res, rej) => {
        readFile(path.resolve(path.join(__dirname, '../package.json')), (err, data) => {
          if (err) {
            rej(err);
          } else {
            res(JSON.parse(data.toString('utf8')).version);
          }
        });
      });

      /**
       * @param {string} raw
       * @returns {string}
       */
      const trimFFVersion = raw => {
        return raw.split("\r\n").map(l => l.trim())
          .filter(l => !l.startsWith("configuration:")).join("; ");
			};
			
			/**
			 * @param {String} raw
			 * @returns {String}
			 */
			const trimMiVersion = raw => {
				return raw.split(/\r|\n|\r\n/)
					.map(s => `${s}`.trim().replace(/^,*?([^,]*),*?$/, "$1"))
					.filter(s => s.length > 0)
					.join(', ');
			};

			const pwFFmpeg = new ProcessWrapper(this.fprintOptions.ffConf.ffmpegPath, ['-version'])
				.run(false).then(pr => trimFFVersion(pr.stdOut));
			const pwFFprobe = new ProcessWrapper(this.fprintOptions.ffConf.ffprobePath, ['-version'])
				.run(false).then(pr => trimFFVersion(pr.stdOut));
			
			const promiseArr = [fffVersionPromise, pwFFmpeg, pwFFprobe];

			if (includeMediaInfo) {
				promiseArr.push(new ProcessWrapper(this.fprintOptions.miConf.mediaInfoPath, ['--version'])
					.run(false).then(pr => trimMiVersion(pr.stdOut)));
			} else {
				promiseArr.push(Promise.resolve(null));
			}

      let versions = null;
      try {
        versions = await Promise.all(promiseArr);
      } catch (e) {
        reject(e);
        return;
      }

      /** @type {FFFVersions} */
      const fffVersions = {
        ffFingerprintVersion: versions[0],
        ffmpegVersion: versions[1],
				ffprobeVersion: versions[2],
				mediaInfoVersion: versions[3]
      };

      resolve(fffVersions);
    });
  };

  /**
	 * @access protected
   * @param {ProbeResultWithHashInfo} rwhi
   * @returns {this}
   */
  _hashChapters(rwhi) {
    rwhi.hashInfo.hashesChapters = [];

    if (!this.fprintOptions.hashConf.includeChapters || this._opts.skipChapters) {
      return this;
    }
    
    rwhi.hashInfo.hashesChapters = rwhi.chapters.map(chapter => {
      const hash = createHash(this.fprintOptions.hashConf.hashAlgo)
      , digest = hash.update(FFFingerPrinter.deterministicToStringObj(chapter))
        .digest('hex').toLowerCase().trim();

      hash.end();

      /** @type {ChapterHash} */
      return {
        id: chapter.id,
        hash: digest
      };
    });

    return this;
  };

  /**
	 * @access protected
   * @param {ProbeResultWithHashInfo} rwhi
   */
  _hashFormat(rwhi) {
    const hash = createHash(this.fprintOptions.hashConf.hashAlgo);
    hash.update(FFFingerPrinter.deterministicToStringObj(rwhi.format));
    rwhi.hashInfo.hashFormat = hash.digest('hex').toLowerCase().trim();
    hash.end();
    return this;
  };

  /**
	 * @access protected
   * @param {ProbeResultWithHashInfo} rwhi
   */
  async _hashStreams(rwhi) {
    rwhi.hashInfo.hashesStreams = [];

    /** @type {StreamOptions} */
    const so = this.fprintOptions.hashConf.streamConf;

    /** @type {Array.<ProbedStream>} */
    const streams = so.ids.length > 0 ? rwhi.streams.filter(stream => {
      const idx = so.ids.findIndex(i => i === stream.index);
      return idx >= 0;
    }) : rwhi.streams.filter(stream => {
      return so.types.findIndex(t => t === stream.codec_type) >= 0;
    });

    if (streams.length > 0) {
      const jobs = streams.map(stream => {
        return new Job(async() => {
          const hash = createHash(this.fprintOptions.hashConf.hashAlgo);

          const streamHash = await this._hashStreamFFmpeg(stream);
          streamHash.hashWithProps = hash
            .update(`${streamHash.hash}:${this._getStreamPropsString(stream)}`)
            .digest('hex').toLowerCase().trim();
          rwhi.hashInfo.hashesStreams.push(streamHash);

          hash.end();
        });
      });

      this._queue.addJobs(...jobs);
      await this._queue.runToCompletion();
    }
  };

  /**
	 * @access protected
   * @param {ProbeResultWithHashInfo} rwhi
   */
  _hashAll(rwhi) {
    const hash = createHash(this.fprintOptions.hashConf.hashAlgo);

    /**
     * @param {{ id: string, hash: string }} h1
     * @param {{ id:string, hash: string }} h2
     * @return {number}
     */
    const hashSort = (h1, h2) => {
      const c = String.prototype.localeCompare.call(h1.hash, h2.hash);

      if (c === 0) {
        return String.prototype.localeCompare.call(h1.id, h2.id);
      }

      return c;
    };

    const allHashes = rwhi.hashInfo.hashesChapters.map(chapter => { return {
        id: `c:${chapter.id}`,
        hash: chapter.hash
      }; })
      .sort(hashSort)
      .concat(rwhi.hashInfo.hashesStreams.map(stream => { return {
        id: `s:${stream.index}`,
        hash: stream.hash
      }; }).sort(hashSort));
    
    allHashes.push({ id: 'format', hash: rwhi.hashInfo.hashFormat });

    rwhi.hashInfo.hashAll = rwhi.fingerprint =
      hash.update(allHashes.map(o => o.hash).join(',')).digest('hex').toLowerCase().trim();  
    rwhi.hashInfo.hashBasedOn = allHashes.map(o => o.id);
    
    hash.end();
  };

  /**
	 * @access protected
   * @param {ProbedStream} stream
   * @returns {string}
   */
  _getStreamPropsString(stream) {
    if (stream.codec_type === 'audio') {
      /** @type {ProbedAudioStream} */
      const s = stream;
      return FFFingerPrinter.deterministicToStringObj({
        codec_name: s.codec_name,
        codec_time_base: s.codec_time_base,
        profile: s.profile || '',
        sample_fmt: s.sample_fmt,
        sample_rate: s.sample_rate,
        channels: s.channels,
        channel_layout: s.channel_layout,
        bit_rate: s.bit_rate || 0
      });
    } else if (stream.codec_type === 'video') {
      /** @type {ProbedVideoStream} */
      const s = stream;
      return FFFingerPrinter.deterministicToStringObj({
        codec_name: s.codec_name,
        codec_time_base: s.codec_time_base,
        profile: s.profile || '',
        width: s.width,
        height: s.height,
        codec_width: s.codec_width || s.width,
        codec_height: s.codec_height || s.height,
        has_b_frames: s.has_b_frames,
        pix_fmt: s.pix_fmt,
        sample_aspect_ratio: s.sample_aspect_ratio || 1,
        display_aspect_ratio: s.display_aspect_ratio || 1,
        r_frame_rate: s.r_frame_rate
      });
    } else if (stream.codec_type === 'subtitle') {
      /** @type {ProbedSubtitleStream} */
      const s = stream;
      return FFFingerPrinter.deterministicToStringObj(mergeObjects(
        {},
        {
          codec_name: s.codec_name,
          codec_time_base: s.codec_time_base,
          disposition: s.disposition
        }
      ));
    }

    throw new Error(`The stream with type '${stream.codec_type}' is not supported.`);
  };

  /**
	 * @access protected
   * @param {ProbedStream} stream
   * @returns {StreamHash}
   */
  _hashStreamFFmpeg(stream) {
    const streamId = `#${stream.index} (${stream.codec_type})`;
    return new Promise((resolve, reject) => {
      const conf = this.fprintOptions.hashConf
      , maxBytesToHash = conf.mode === 'complete' ? Number.MAX_SAFE_INTEGER :
        conf.modeBytes.filter(mb => mb.streamType === stream.codec_type)[0].bytes;
      let bytesHashed = 0;

      this.logger.logDebug(`Hashing up to ${maxBytesToHash} bytes of stream ${streamId}..`);

      const hash = createHash(conf.hashAlgo);

      const procArgs = [
        '-v', 'quiet',
        '-hide_banner',
        '-i', this.file,
        '-map', `0:${stream.index}`,
        '-f', 'data',
        '-c', 'copy',
        '-'
      ];

      // Workaround!
      let mjpegKill = false;
      const proc = spawn(this.fprintOptions.ffConf.ffmpegPath, procArgs)
        .once('error', err => {
          this.logger.logError(`Hashing stream ${streamId} failed.`);
          reject(err);
        })
        .once('exit', (code, sig) => {
          if (code === 0 || mjpegKill) {
            /** @type {StreamHash} */
            const streamHash = {
              index: stream.index,
              hash: hash.digest('hex').toLowerCase().trim(),
              numBytes: bytesHashed
            };
            hash.end();
            this.logger.logDebug(`Hashing for stream ${streamId} was successful!`);
            resolve(streamHash);
          } else {
            this.logger.logError(`Hashing stream ${streamId} failed.`);
            reject([code, sig]);
          }
        });


      proc.stdout.on('data', chunk => {
        const buf = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
        const numToWrite = maxBytesToHash - bytesHashed;

        if (numToWrite > buf.byteLength) {
          hash.write(buf);
          bytesHashed += buf.byteLength;

          // Workaround! So ffmpeg doesn't read the whole file..
          if (this.fprintOptions.ffConf.enableMjpegWorkaround && stream.codec_name === 'mjpeg') {
            mjpegKill = true;
            proc.kill('SIGKILL');
          }
        } else {
          if (numToWrite === 0) {
            return;
          }
          hash.write(buf.slice(0, numToWrite));
          bytesHashed += numToWrite;
          // we're done, terminate ffmpeg:
          proc.stdin.write('q');
        }
      });
    });
  };





  /**
   * @param {Object} obj
   * @returns {string}
   */
  static deterministicToStringObj(obj) {
    if (obj === void 0) {
      throw new Error(`The value 'undefined' is not supported in JSON.`);
    } else if (obj === null) {
      return 'null';
    } else if (Resolve.isPrimitive(obj) || Resolve.isTypeOf(obj, []) || typeof obj === 'bigint') {
      return obj.toString();
    } else if (Resolve.isTypeOf(obj, {})) {
      return `{${Object.keys(obj).sort((a, b) => a < b ? -1 : 1).map(key => {
        return `${key}:${FFFingerPrinter.deterministicToStringObj(obj[key])}`;
      }).join(',')}}`;
    } else {
      throw new Error(`The value is not supported: ${inspect(obj)}`);
    }
	};

	/**
	 * @access protected
	 * @param {Object} obj 
	 * @param {Boolean} recursive 
	 */
	static _convertProperties(obj, recursive = true) {
		for (const k of Object.keys(obj)) {
			const t = typeof obj[k];
			if (recursive && obj[k] !== null && t === 'object') {
				obj[k] = FFFingerPrinter._convertProperties(obj[k], true);
			}
			if (t === 'string') {
				const match = obj[k].match(/^(?<true>yes|true)?(?<false>no|false)?$/i);
				if (match !== null) {
					obj[k] = typeof match.groups.true === 'string';
					continue;
				}
			}

			obj[k] = Resolve.tryAsNumber(obj[k]);
		}

		return obj;
	};
	
	/**
	 * @access protected
	 * @param {Object} obj 
	 * @param {Boolean} recursive 
	 */
	static _renameInvalidProperties(obj, recursive = true) {
		const props = new Map([
			['@type', '_type'],
			['@typeorder', '_typeorder']
		])
		, keys = Object.keys(obj);

		for (const k of keys) {
			if (recursive && obj[k] !== null && typeof obj[k] === 'object') {
				obj[k] = FFFingerPrinter._renameInvalidProperties(obj[k], true);
			}

			if (props.has(k)) {
				obj[props.get(k)] = obj[k];
				delete obj[k];
			}
		}

		return obj;
	};
};


module.exports = Object.freeze({
  defaultHashModeBytes,
  defaultHashOptions,
  defaultStreamOptions,
  FFFingerPrinter
});
