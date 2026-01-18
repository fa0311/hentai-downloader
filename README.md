# hentai-downloader

A powerful CLI tool for downloading galleries with advanced features like scheduling, checkpointing, and batch processing.

[![License](https://img.shields.io/github/license/fa0311/hentai-downloader)](https://github.com/fa0311/hentai-downloader/blob/main/LICENSE)

<!-- toc -->
* [hentai-downloader](#hentai-downloader)
* [Usage](#usage)
* [Commands](#commands)
* [Clone the repository](#clone-the-repository)
* [Install dependencies](#install-dependencies)
* [Build the project](#build-the-project)
* [Build the Docker image](#build-the-docker-image)
* [Run with docker-compose](#run-with-docker-compose)
* [Run in development mode](#run-in-development-mode)
* [Run tests](#run-tests)
* [Build the project](#build-the-project)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g hentai-downloader
$ hentai-downloader COMMAND
running command...
$ hentai-downloader (--version|-v)
hentai-downloader/1.0.0 win32-x64 node-v24.12.0
$ hentai-downloader --help [COMMAND]
USAGE
  $ hentai-downloader COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`hentai-downloader download INPUT OUTPUT [FILENAME]`](#hentai-downloader-download-input-output-filename)
* [`hentai-downloader help [COMMAND]`](#hentai-downloader-help-command)
* [`hentai-downloader schedule [CONFIG]`](#hentai-downloader-schedule-config)

## `hentai-downloader download INPUT OUTPUT [FILENAME]`

Download galleries by ID or URL

```
USAGE
  $ hentai-downloader download INPUT OUTPUT [FILENAME] [--metadata] [--comicInfo] [--videoSkip] [-q]
    [--checkpoint <value>] [--ifExists error|skip|overwrite] [--help] [--version]

ARGUMENTS
  INPUT       http(s) URL or gallery ID to download
  OUTPUT      [default: output/{id}] Output directory or file
  [FILENAME]  [default: {no}{ext}] Output filename

FLAGS
  -q, --quiet               Suppress non-error output
      --checkpoint=<value>  Path to checkpoint file
      --comicInfo           Output ComicInfo.xml file
      --help                Show CLI help.
      --ifExists=<option>   [default: error] Behavior when file already exists
                            <options: error|skip|overwrite>
      --metadata            Output metadata file
      --version             Show CLI version.
      --videoSkip           Skip video files

DESCRIPTION
  Download galleries by ID or URL

EXAMPLES
  Download a gallery by ID

    $ hentai-downloader download 1571033

  Download with custom output directory

    $ hentai-downloader download 1571033 output/{id}

  Download as ZIP file

    $ hentai-downloader download 1571033 output/{id}.zip

  Download with custom filename pattern

    $ hentai-downloader download 1571033 output/{id} "{no}-{name}{ext}"

  Skip existing files instead of erroring

    $ hentai-downloader download 1571033 --ifExists=skip

  Resume from checkpoint

    $ hentai-downloader download https://hitomi.la/artist/kinnotama-japanese.html --checkpoint=.checkpoint `
      --ifExists=overwrite
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

## Features

- 🚀 **Fast & Reliable**: Efficient batch download with retry mechanism
- 📦 **Flexible Output**: Save as directories or ZIP archives
- ⏱️ **Scheduling**: Automated downloads with cron expressions
- 🔄 **Resume Support**: Checkpoint system to resume interrupted downloads
- 📝 **Metadata**: Optional metadata and ComicInfo.xml generation
- 🔒 **Proxy Support**: SOCKS5 proxy configuration via environment variables
- 🎯 **Batch Processing**: Download multiple galleries from lists or URLs

## Installation

```bash
# Clone the repository
git clone https://github.com/fa0311/hentai-downloader.git
cd hentai-downloader

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Configuration

### Global Configuration

#### Proxy (Optional)

Proxy settings are available for both `download` and `schedule` commands.

Use standard proxy environment variables with URL format.  
Supported protocols: `socks5://`, `socks4://`, `socks5h://`, `socks4a://`

Create a `.env` file:

```env
ALL_PROXY=socks5://127.0.0.1:1080
TZ=Asia/Tokyo
```

### Schedule Command Configuration

The `schedule` command uses a JSON configuration file and environment variables.

#### Configuration File

Create a `schedule.json` file:

```json
{
  "cron": "0 */6 * * *",
  "runOnInit": false,
  "output": "output/{id}",
  "filename": "{no}{ext}",
  "queries": [
    {
      "type": "id",
      "id": 1571033
    },
    {
      "type": "url",
      "url": "https://hitomi.la/artist/kinnotama-japanese.html"
    }
  ],
  "checkpoint": ".checkpoint",
  "metadata": false,
  "comicInfo": true,
  "videoSkip": true,
  "ifExists": "skip"
}
```

#### Environment Variables

Add to your `.env` file:

```env
LOG_LEVEL=info
LOG_COLOR=true
TZ=Asia/Tokyo
HEARTBEAT_PATH=/path/to/heartbeat.txt
LAST_SUCCESS_PATH=/path/to/last_success.txt
```

- `LOG_LEVEL`: Log level (fatal, error, warn, info, debug, trace, silent)
- `LOG_COLOR`: Enable colored output (true/false)
- `TZ`: Timezone
- `HEARTBEAT_PATH`: Heartbeat file path (optional)
- `LAST_SUCCESS_PATH`: Last success timestamp file path (optional)

### Placeholders

**Output path placeholders:**

- `{id}` - Gallery ID
- `{title}` - Gallery title
- `{japanese_title}` - Japanese title (if available)
- `{type}` - Gallery type
- `{language}` - Language

**Filename placeholders:**

- `{no}` - File number (zero-padded)
- `{name}` - Original filename
- `{ext}` - File extension
- `{hash}` - File hash

## Docker Support

```bash
# Build the Docker image
docker build -t hentai-downloader .

# Run with docker-compose
docker-compose up -d
```

## Development

```bash
# Run in development mode
pnpm dev download 1571033

# Run tests
pnpm test

# Build the project
pnpm build
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

fa0311
