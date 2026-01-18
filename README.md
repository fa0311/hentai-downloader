# Hentai Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful CLI tool for downloading galleries from Hitomi.la. Features scheduled execution, checkpoint functionality, proxy support, and more for an efficient and robust download experience.

## ✨ Features

- **Command Line Tool**: Download galleries instantly by ID or URL
- **Scheduler**: Automate periodic download tasks with cron expressions
- **Checkpoint System**: Resume interrupted downloads automatically on next execution
- **Docker Support**: Easy deployment with docker-compose
- **Proxy Support**: SOCKS4/5 proxy compatible
- **Flexible Output**: Output as directory or ZIP file, with ComicInfo.xml generation

## 📚 Quick Start

```bash
# Download a gallery
hentai-downloader download 1571033

# Run scheduled downloads
hentai-downloader schedule schedule.json
```

For detailed command options, see [COMMANDS.md](COMMANDS.md).

## 📦 Installation

### npm/pnpm

```bash
npm install -g hentai-downloader
# or
pnpm add -g hentai-downloader
```

### Docker

```bash
docker pull ghcr.io/fa0311/hentai-downloader:latest-scheduler
```

### Build from Source

```bash
git clone https://github.com/fa0311/hentai-downloader.git
cd hentai-downloader
pnpm install
pnpm build
```

## 🐳 Docker Usage

### Using docker-compose

1. Create `schedule.json` (see configuration example below)

2. Start with docker-compose

```bash
docker-compose up -d
```

## ⚙️ Configuration

### Schedule Configuration File (schedule.json)

```jsonc
{
  "cron": "0 0 * * *", // Cron expression (required)
  "runOnInit": false, // Execute immediately on startup
  "queries": [
    // Download targets
    { "type": "id", "id": 1234567 },
    { "type": "url", "url": "https://hitomi.la/artist/example.html" },
    {
      "type": "query",
      "query": {
        "artists": ["artist-name"],
        "language": "japanese",
        "tags": ["tag1", "tag2"],
      },
    },
  ],
  "output": "output/{id}", // Output path (placeholders available)
  "filename": "{no}{ext}", // Filename pattern
  "videoSkip": true, // Skip video files
  "comicInfo": true, // Generate ComicInfo.xml
  "ifExists": "skip", // Existing file behavior: skip/overwrite/error
  "checkpoint": "data/.checkpoint", // Checkpoint file path
}
```

For detailed configuration schema, see [src/utils/config.ts](src/utils/config.ts).

### Environment Variables

Can be set via `.env` file or system environment variables.

#### Proxy Settings (All commands)

```bash
# SOCKS5 proxy example
ALL_PROXY=socks5://username:password@proxy.example.com:1080
# or
HTTPS_PROXY=socks5://proxy.example.com:1080
HTTP_PROXY=socks5://proxy.example.com:1080
```

Supported protocols: `socks5://`, `socks4://`, `socks5h://`, `socks4a://`

#### Schedule Command Only

```bash
# Log level (fatal/error/warn/info/debug/trace/silent)
LOG_LEVEL=info

# Enable colored logs (true/false)
LOG_COLOR=true

# Timezone (for cron schedule)
TZ=Asia/Tokyo

# Heartbeat timestamp file (updated every 60 seconds)
HEARTBEAT_PATH=/app/data/heartbeat

# Last success timestamp file (updated on successful download)
LAST_SUCCESS_PATH=/app/data/last_success
```

## 🎨 Placeholders

Available placeholders for output paths and filenames:

### Output Path

- `{id}` - Gallery ID

### Filename

- `{no}` - File number (sequential)
- `{name}` - Original filename
- `{ext}` - File extension

**Examples:**

```bash
# Directory output
hentai-downloader download 1571033 "output/{id}"

# ZIP output
hentai-downloader download 1571033 "output/{id}.zip"

# Custom filename
hentai-downloader download 1571033 "output/{id}" "{no}-{name}{ext}"
```

## 🛠️ Development

### Requirements

- Node.js (v24+ recommended)
- pnpm

### Build

```bash
pnpm install
pnpm build
```

### Test

```bash
pnpm test        # watch mode
pnpm test:run    # single run
```

### Development Mode

```bash
pnpm dev <command>
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 📖 Documentation

- [COMMANDS.md](COMMANDS.md) - Detailed command reference
- [src/utils/config.ts](src/utils/config.ts) - Configuration file type definitions
- [src/utils/env.ts](src/utils/env.ts) - Environment variable type definitions
