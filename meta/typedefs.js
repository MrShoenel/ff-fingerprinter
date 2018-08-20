/**
 * @typedef FFmpegConf
 * @type {Object}
 * @property {string} ffmpegPath
 * @property {string} ffprobePath
 * @property {boolean} enableMjpegWorkaround
 */

/**
 * @typedef Tags
 * @type {Object.<string, string>}
 */

/**
 * @typedef HashMode
 * @type {'fast'|'complete'}
 */

/**
 * @typedef StreamType
 * @type {'audio'|'video'|'subtitle'}
 */

/**
 * @typedef HashModeBytes
 * @type {Object}
 * @property {StreamType} streamType
 * @property {number} bytes
 */


/**
 * @typedef StreamOptions
 * @type {Object}
 * @property {Array.<StreamType>} [types] Optional. Defaults to ['audio', 'video', 'subtitle']. The types of streams to include in the fingerprinting. Note that this will change the file's hash if not all streams are included.
 * @property {Array.<number>} [ids] Optional. Defaults to []. Overrides the types-property. The IDs of the streams to hash.
 */

/**
 * @typedef HashOptions
 * @type {Object}
 * @property {boolean} includeChapters This only has an effect if probing for chapters is enabled (otherwise, there is nothing to hash).
 * @property {StreamOptions} streamConf
 * @property {HashMode} mode
 * @property {Array.<HashModeBytes>} modeBytes
 * @property {string} [hashAlgo] Optional. Defaults to 'sha256'. Needs to be compatible with crypto.createHash().
 * @property {number} [numStreamsParallel] Optional. Defaults to 1. How many streams of a file may be hashed in parallel.
 */


/**
 * @typedef FingerprintOptions
 * @type {Object}
 * @property {FFmpegConf} ffConf
 * @property {HashOptions} hashConf
 * @property {boolean} skipProbing
 * @property {boolean} skipChapters
 * @property {boolean} skipHashing
 * @property {boolean} skipFFversions
 */


/**
 * @typedef StreamDisposition We convert these to boolean.
 * @type {Object}
 * @property {boolean} default
 * @property {boolean} dub
 * @property {boolean} original
 * @property {boolean} comment
 * @property {boolean} lyrics
 * @property {boolean} karaoke
 * @property {boolean} forced
 * @property {boolean} hearing_impaired
 * @property {boolean} visual_impaired
 * @property {boolean} clean_effects
 * @property {boolean} attached_pic
 * @property {boolean} timed_thumbnails
 */

/**
 * @typedef StreamHash
 * @type {Object}
 * @property {number} index the stream's index
 * @property {string} hash the hash as hex-encoded string
 * @property {number} numBytes the amount of bytes read from the stream that were used for the hash
 * @property {string} hashWithProps the hash over the hash-property concatenated with selected stream properties.
 */

/**
 * @typedef ChapterHash
 * @type {Object}
 * @property {number} id the chapter's ID
 * @property {string} hash the hash as hex-encoded string
 */

/**
 * @typedef FileTimes
 * @type {Object}
 * @property {string} accessTime
 * @property {string} modTime
 * @property {string} changeTime
 * @property {string} createTime
 */

/**
 * @typedef FFFVersions
 * @type {Object}
 * @property {string} ffmpegVersion
 * @property {string} ffprobeVersion
 * @property {string} ffFingerprintVersion
 */

/**
 * @typedef Chapter
 * @type {Object}
 * @property {ChapterHash} _hash only null if stream was not hashed.
 * @property {number} id
 * @property {string} time_base
 * @property {number} start
 * @property {string} start_time
 * @property {number} end
 * @property {string} end_time
 * @property {Tags} tags
 */

/**
 * Optional properties in this object depends on the settings and whether to skip
 * certain steps of the finger printing / probing.
 * 
 * @typedef HashInfo
 * @type {Object}
 * @property {HashOptions} [hashConf]
 * @property {Array.<StreamHash>} [hashesStreams] the hashes of all streams
 * @property {Array.<ChapterHash>} [hashesChapters] the hashes of all chapters
 * @property {string} [hashFormat] the format's hash
 * @property {string} [hashAll] the hash over hashFormat, hashStreams and hashChapters
 * @property {Array.<string>} [hashBasedOn] an array that lists properties of the file that were involved in creating the 'hashAll' fingerprint property. This is an ordered array of hashes that were concatenated using a comma and then hashed using the selected algorithm. Note that for both, streams and chapters alike, the property 'hash' is used (i.e. not 'hashWithProperties').
 * @property {string} fileName
 * @property {string} filePath
 * @property {FileTimes} fileTimes
 * @property {string} hashTime
 * @property {FFFVersions} [fffVersions]
 */

/**
 * @typedef ProbeResult
 * @type {Object}
 * @property {ProbedFormat} format
 * @property {Array.<ProbedAudioStream|ProbedVideoStream>} streams
 * @property {Array.<Chapter>} chapters
 */

/**
 * @typedef ProbeResultWithHashInfoBase
 * @type {Object}
 * @property {HashInfo} hashInfo
 * @property {string} fingerprint replicates the hashInfo's value of hashAll
 */

/**
 * @typedef ProbeResultWithHashInfo
 * @type {ProbeResult|ProbeResultWithHashInfoBase}
 */

/**
 * @typedef ProbedFormat
 * @type {Object}
 * @property {string} filename
 * @property {number} nb_streams
 * @property {number} nb_programs
 * @property {string} format_name
 * @property {string} format_long_name
 * @property {string} start_time
 * @property {string} duration
 * @property {string} size
 * @property {string} bit_rate
 * @property {number} probe_score
 * @property {Tags} tags
 */

/**
 * @typedef ProbedStream
 * @type {Object}
 * @property {number} index
 * @property {string} codec_name
 * @property {string} codec_long_name
 * @property {string} [profile]
 * @property {StreamType} codec_type
 * @property {string} codec_time_base
 * @property {string} codec_tag_string
 * @property {string} codec_tag
 * @property {string} r_frame_rate
 * @property {string} avg_frame_rate
 * @property {string} time_base
 * @property {number} start_pts
 * @property {string} start_time
 * @property {number} [duration_ts]
 * @property {string} [duration]
 * @property {StreamDisposition} disposition
 * @property {Tags} tags
 */

/**
 * @typedef ProbedVideoStreamBase
 * @type {Object}
 * @property {number} width
 * @property {number} height
 * @property {number} coded_width
 * @property {number} coded_height
 * @property {number} has_b_frames
 * @property {string} sample_aspect_ratio
 * @property {string} display_aspect_ratio
 * @property {string} pix_fmt
 * @property {number} level
 * @property {string} color_range
 * @property {string} [color_space]
 * @property {string} [chroma_location]
 * @property {number} refs
 * @property {string} [bits_per_raw_sample]
 */

/**
 * @typedef ProbedAudioStreamBase
 * @type {Object}
 * @property {string} nb_frames
 * @property {string} sample_fmt
 * @property {string} sample_rate
 * @property {number} channels
 * @property {string} channel_layout
 * @property {string} [bit_rate]
 * @property {string} [max_bit_rate]
 */

/**
 * @typedef ProbedSubtitleStreamBase
 * @type {Object}
 */

/**
 * @typedef ProbedVideoStream
 * @type {ProbedStream|ProbedVideoStreamBase}
 */

/**
 * @typedef ProbedAudioStream
 * @type {ProbedStream|ProbedAudioStreamBase}
 */

/**
 * @typedef {ProbedSubtitleStream}
 * @type {ProbedStream|ProbedSubtitleStreamBase}
 */