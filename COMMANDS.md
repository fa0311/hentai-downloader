# Commands

<!-- usage -->
```sh-session
$ npm install -g hentai-downloader
$ hentai-downloader COMMAND
running command...
$ hentai-downloader (--version)
hentai-downloader/1.0.0 linux-x64 node-v24.16.0
$ hentai-downloader --help [COMMAND]
USAGE
  $ hentai-downloader COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`hentai-downloader download INPUT OUTPUT [FILENAME]`](#hentai-downloader-download-input-output-filename)
* [`hentai-downloader help [COMMAND]`](#hentai-downloader-help-command)
* [`hentai-downloader regenerate INPUT OUTPUT`](#hentai-downloader-regenerate-input-output)
* [`hentai-downloader schedule [CONFIG]`](#hentai-downloader-schedule-config)

## `hentai-downloader download INPUT OUTPUT [FILENAME]`

Download galleries by ID or URL

```
USAGE
  $ hentai-downloader download INPUT OUTPUT [FILENAME] [--metadata] [--comicInfo] [--videoSkip] [--imageFormat
    webp|avif] [-q] [--checkpoint <value>] [--ifExists error|skip|overwrite] [--help] [--version]

ARGUMENTS
  INPUT       http(s) URL or gallery ID to download
  OUTPUT      [default: output/{id}] Output directory or file
  [FILENAME]  [default: {no}{ext}] Output filename

FLAGS
  -q, --quiet                 Suppress non-error output
      --checkpoint=<value>    Path to checkpoint file
      --comicInfo             Output ComicInfo.xml file
      --help                  Show CLI help.
      --ifExists=<option>     [default: error] Behavior when file already exists
                              <options: error|skip|overwrite>
      --imageFormat=<option>  Force image download format
                              <options: webp|avif>
      --metadata              Output metadata file
      --version               Show CLI version.
      --videoSkip             Skip video files

DESCRIPTION
  Download galleries by ID or URL

EXAMPLES
  Download a gallery by ID

    $ hentai-downloader download 1571033

  Download a gallery by URL

    $ hentai-downloader download https://example.com/artist/sample-creator-japanese.html

  Download as CBZ file

    $ hentai-downloader download 1571033 output/{id}.cbz

  Download with custom filename pattern

    $ hentai-downloader download 1571033 output/{id} "{no}-{name}{ext}"

  Resume from checkpoint

    $ hentai-downloader download 1571033 --checkpoint=.checkpoint --ifExists=overwrite
```

_See code: [src/commands/download.ts](https://github.com/fa0311/hentai-downloader/blob/main/src/commands/download.ts)_

## `hentai-downloader help [COMMAND]`

Display help for hentai-downloader.

```
USAGE
  $ hentai-downloader help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for hentai-downloader.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `hentai-downloader regenerate INPUT OUTPUT`

```
USAGE
  $ hentai-downloader regenerate INPUT OUTPUT [-q] [--help] [--version]

ARGUMENTS
  INPUT   http(s) URL or gallery ID to download
  OUTPUT  Output directory or file

FLAGS
  -q, --quiet    Suppress non-error output
      --help     Show CLI help.
      --version  Show CLI version.
```

_See code: [src/commands/regenerate.ts](https://github.com/fa0311/hentai-downloader/blob/main/src/commands/regenerate.ts)_

## `hentai-downloader schedule [CONFIG]`

Run scheduled downloads based on configuration file

```
USAGE
  $ hentai-downloader schedule [CONFIG] [--runOnce] [--help] [--version]

ARGUMENTS
  [CONFIG]  [default: schedule.json] Path to the schedule configuration file

FLAGS
  --help     Show CLI help.
  --runOnce
  --version  Show CLI version.

DESCRIPTION
  Run scheduled downloads based on configuration file

EXAMPLES
  Run scheduled downloads with default config

    $ hentai-downloader schedule

  Run scheduled downloads with custom config

    $ hentai-downloader schedule schedule.json

  Run once without scheduling (useful for testing)

    $ hentai-downloader schedule --runOnce
```

_See code: [src/commands/schedule.ts](https://github.com/fa0311/hentai-downloader/blob/main/src/commands/schedule.ts)_
<!-- commandsstop -->
