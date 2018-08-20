# FF-FingerPrinter
FF-FingerPrinter is a Node.js-based tool that uses `ffmpeg` and `ffprobe` to probe and fingerprint media files (anything that your ffmpeg can read). It supports hashing a media file's chapters and streams (currently video-, audio- and subtitle-streams are supported).

## Install from npm [![Current Version](https://img.shields.io/npm/v/sh.ff-fingerprinter.svg)](https://www.npmjs.com/package/sh.ff-fingerprinter)
This package can be installed using the following command: `npm install sh.ff-fingerprinter`.

___

This tool can be used as a library in your own project or as a standalone `CLI`-application. `JSDoc`-typedefs have been created to model the full output. The library exports the single class `FFFingerPrinter` and some default configurations. The class makes extensive use of `async` features.

The purpose is to uniquely identify media files and the streams they contain. This helps to identify duplicates and to avoid ID'ing files based on their names/paths or attributes or timestamps (which can easily be changed). Hashing of streams of a file can be done in parallel.

When hashing, the raw data of each stream is taken and put through a cryptographic hasher, such as `sha256` (default). Also, properties of streams are hashed _deterministically_ (sorted). Then, a hash for the whole file is computed and the file itself is analyzed using `stat`. A _remux_ of a file (containing the same streams as the original) will be ID'ed differently, but the streams' hashes will be identical (look below for an example output).

# Command Line Interface (CLI)
Here is how to run FF-FingerPrinter from CLI:

<pre>node ./cli/cli.js -h
  Usage: cli [options]

  FF-Fingerprinter uses FFmpeg to analyze and fingerprint media files. It provides extensive information as obtained from FFprobe and adds hashes to each stream and the file as a whole. The path to the file must be the last argument.

  Options:

    -v, --version            output the version number
    -c, --config [config]    Optional. The path to a config-file that exports an instance of
                             FingerPrintOptions. If not specified, will create a config from
                             the file config.default.json.
    -f, --format [format]    Optional. Formats (indents) the output. Has no effect if the output
                             is only the hash. (default: true)
    -m, --ffmpeg [ffmpeg]    Optional. The path to FFmpeg; overrides the path defined in the
                             config.
    -p, --ffprobe [ffprobe]  Optional. The path to FFprobe; overrides the path defined in the
                             config.
    --quiet                  Optional. If provided, will suppress any output to stderr.
    --only-hash              Optional. If provided, only the value of "hashAll" will be printed.
    --skip-probe             Optional. If provided, will not probe the file for its contents.
    --skip-hash              Optional. If provided, will only probe the file and skip hashing
                             entirely.
    --skip-chapters          Optional. If provided, will not include the chapters in the probing
                             or hashing.
    --skip-ffversions        Optional. If provided, will not include the ffmpeg and ffprobe
                             versions in the output.
    -h, --help               output usage information
</pre>

In CLI-mode, a configuration file is used. An example can be found in `cli/config.default.js`.

# Example output
In CLI-mode, FF-Fingerprinter writes its result to `stdout` while _logging_ what it's doing to `stderr`, so that you can __pipe__ its `JSON`-based output to a file.

<pre>
<span style="color:blue">node ./cli/cli.js 'D:\media\MOV_0608.mp4'</span>
<span style="color:red">2018-8-5 15:22:02 [FFFingerPrinter]: Fingerprinting file: D:\media\MOV_0608.mp4
2018-8-5 15:22:02 [FFFingerPrinter]: Probing..
2018-8-5 15:22:03 [FFFingerPrinter]: Found 2 streams and 0 chapters.
2018-8-5 15:22:03 [FFFingerPrinter]: Hashing up to 80000000 bytes of stream #0 (video)..
2018-8-5 15:22:03 [FFFingerPrinter]: Hashing up to 10000000 bytes of stream #1 (audio)..
2018-8-5 15:22:03 [FFFingerPrinter]: Hashing for stream #1 (audio) was successful!
2018-8-5 15:22:03 [FFFingerPrinter]: Hashing for stream #0 (video) was successful!</span>
{
  "streams": [
    {
      "index": 0,
      "codec_name": "h264",
      "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
      "profile": "High",
      "codec_type": "video",
      "codec_time_base": "5326247/638640000",
      "codec_tag_string": "avc1",
      "codec_tag": "0x31637661",
      "width": 1920,
      "height": 1080,
      "coded_width": 1920,
      "coded_height": 1088,
      "has_b_frames": 0,
      "sample_aspect_ratio": "1:1",
      "display_aspect_ratio": "16:9",
      "pix_fmt": "yuv420p",
      "level": 42,
      "color_range": "tv",
      "color_space": "bt709",
      "color_transfer": "bt709",
      "color_primaries": "bt709",
      "chroma_location": "left",
      "refs": 1,
      "is_avc": "true",
      "nal_length_size": "4",
      "r_frame_rate": "60000/1001",
      "avg_frame_rate": "319320000/5326247",
      "time_base": "1/90000",
      "start_pts": 0,
      "start_time": "0.000000",
      "duration_ts": 5326247,
      "duration": "59.180522",
      "bit_rate": "29976310",
      "bits_per_raw_sample": "8",
      "nb_frames": "3548",
      "disposition": {
        "default": 1,
        "dub": 0,
        "original": 0,
        "comment": 0,
        "lyrics": 0,
        "karaoke": 0,
        "forced": 0,
        "hearing_impaired": 0,
        "visual_impaired": 0,
        "clean_effects": 0,
        "attached_pic": 0,
        "timed_thumbnails": 0
      },
      "tags": {
        "creation_time": "2018-07-27T10:33:22.000000Z",
        "language": "eng",
        "handler_name": "VideoHandle"
      }
    },
    {
      "index": 1,
      "codec_name": "aac",
      "codec_long_name": "AAC (Advanced Audio Coding)",
      "profile": "LC",
      "codec_type": "audio",
      "codec_time_base": "1/48000",
      "codec_tag_string": "mp4a",
      "codec_tag": "0x6134706d",
      "sample_fmt": "fltp",
      "sample_rate": "48000",
      "channels": 2,
      "channel_layout": "stereo",
      "bits_per_sample": 0,
      "r_frame_rate": "0/0",
      "avg_frame_rate": "0/0",
      "time_base": "1/48000",
      "start_pts": 0,
      "start_time": "0.000000",
      "duration_ts": 2840532,
      "duration": "59.177750",
      "bit_rate": "156002",
      "max_bit_rate": "156000",
      "nb_frames": "2774",
      "disposition": {
        "default": 1,
        "dub": 0,
        "original": 0,
        "comment": 0,
        "lyrics": 0,
        "karaoke": 0,
        "forced": 0,
        "hearing_impaired": 0,
        "visual_impaired": 0,
        "clean_effects": 0,
        "attached_pic": 0,
        "timed_thumbnails": 0
      },
      "tags": {
        "creation_time": "2018-07-27T10:33:22.000000Z",
        "language": "eng",
        "handler_name": "SoundHandle"
      }
    }
  ],
  "chapters": [],
  "format": {
    "filename": "D:\\media\\MOV_0608.mp4",
    "nb_streams": 2,
    "nb_programs": 0,
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
    "format_long_name": "QuickTime / MOV",
    "start_time": "0.000000",
    "duration": "59.183000",
    "size": "223716134",
    "bit_rate": "30240593",
    "probe_score": 100,
    "tags": {
      "major_brand": "mp42",
      "minor_version": "0",
      "compatible_brands": "isommp42",
      "creation_time": "2018-07-27T10:33:22.000000Z",
      "com.android.version": "8.0.0",
      "com.android.video.temporal_layers_count": ""
    }
  },
  "hashInfo": {
    "hashesChapters": [],
    "hashFormat": "8592c28336cd8476f7d3b113401df659483648c940f358bd648012ffa4bcd5a3",
    "hashesStreams": [
      {
        "index": 1,
        "hash": "4f3d806978a5613c8a41b9524c034d79e041254f95ee52b01ed021a5a79366f5",
        "numBytes": 1153984,
        "hashWithProps": "63765cff913cf485390487068e837b8dd0a9788938a6c8539f38045dc83dbb72"
      },
      {
        "index": 0,
        "hash": "79e2f1f9f23dc1e8a5f5f37acc9a19c04bfcd6b50d65acfb58525138af7d90d7",
        "numBytes": 80000000,
        "hashWithProps": "e03ed2cab4043b6c98d2a6cd26ddfd73c68b1594c31b6cc2c1bc40c5b68ea91c"
      }
    ],
    "hashAll": "a6a887499e4b6c6ce312eae40f82735650ba1edc263bd7804fabb3296ce05fe6",
    "hashBasedOn": [
      "s:1",
      "s:0",
      "format"
    ],
    "fileName": "MOV_0608.mp4",
    "filePath": "D:\\media",
    "hashTime": "Mon, 20 Aug 2018 22:53:48 GMT",
    "fileTimes": {
      "accessTime": "Thu, 02 Aug 2018 18:53:39 GMT",
      "modTime": "Fri, 27 Jul 2018 10:33:21 GMT",
      "changeTime": "Thu, 02 Aug 2018 18:53:46 GMT",
      "createTime": "Thu, 02 Aug 2018 18:53:39 GMT"
    },
    "fffVersions": {
      "ffFingerprintVersion": "1.1.0",
      "ffmpegVersion": "ffmpeg version N-91303-g8331e59133 Copyright (c) 2000-2018 the FFmpeg developers; built with gcc 7.3.0 (Rev2, Built by MSYS2 project); libavutil      56. 18.102 / 56. 18.102; libavcodec     58. 20.102 / 58. 20.102; libavformat    58. 17.100 / 58. 17.100; libavdevice    58.  4.101 / 58.  4.101; libavfilter     7. 25.100 /  7. 25.100; libswscale      5.  2.100 /  5.  2.100; libswresample   3.  2.100 /  3.  2.100; libpostproc    55.  2.100 / 55.  2.100; ",
      "ffprobeVersion": "ffprobe version N-91303-g8331e59133 Copyright (c) 2007-2018 the FFmpeg developers; built with gcc 7.3.0 (Rev2, Built by MSYS2 project); libavutil      56. 18.102 / 56. 18.102; libavcodec     58. 20.102 / 58. 20.102; libavformat    58. 17.100 / 58. 17.100; libavdevice    58.  4.101 / 58.  4.101; libavfilter     7. 25.100 /  7. 25.100; libswscale      5.  2.100 /  5.  2.100; libswresample   3.  2.100 /  3.  2.100; libpostproc    55.  2.100 / 55.  2.100; "
    }
  },
  "hashConf": {
    "hashAlgo": "sha256",
    "includeChapters": true,
    "mode": "fast",
    "modeBytes": [
      {
        "streamType": "audio",
        "bytes": 10000000
      },
      {
        "streamType": "video",
        "bytes": 80000000
      },
      {
        "streamType": "subtitle",
        "bytes": 5000
      }
    ],
    "numStreamsParallel": 4,
    "streamConf": {
      "types": [
        "audio",
        "video",
        "subtitle"
      ],
      "ids": []
    }
  },
  "fingerprint": "a6a887499e4b6c6ce312eae40f82735650ba1edc263bd7804fabb3296ce05fe6"
}
</pre>

Some noteworthy details:
* __fingerprint__: The hash of the entire file, taking into account all streams' and chapters' hashes. Replicates the value from `hashInfo.hashAll`.
* __hashWithProps__: Is a hash over the streams' hash and its (deterministically) stringified properties. `numBytes` indicates how many bytes were read to create the hash.
* The output of `ffprobe` is fully preserved and additional properties, such as `hashInfo` and `fffVersions` are added. Also, the settings (`hashConf`) used for hashing are preserved, so that the results are __repeatable__.

# Testing
Note that for testing, you need to have `ffmpeg` and `ffprobe` installed.
