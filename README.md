# pi-dynamic-providers

[![CI](https://github.com/cybershape/pi-dynamic-models/actions/workflows/ci.yml/badge.svg)](https://github.com/cybershape/pi-dynamic-models/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/pi-dynamic-providers.svg)](https://www.npmjs.com/package/pi-dynamic-providers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Pi coding agent](https://pi.dev) extension to automatically discover and register models from OpenAI-compatible endpoints (`/models`).

## Features

- **Dynamic Model Discovery**: Queries the `/models` endpoint at startup and dynamically registers available models with the Pi provider registry.
- **Reasoning Model Support**: Automatically detects reasoning/thinking models (via `reasoning_efforts` metadata or naming heuristics) and sets up appropriate thinking levels.
- **Manual Hot-Reload**: Provides a `/refresh-models` command to reload the remote model catalog without restarting Pi.
- **Flexible Configuration**: Reads configuration from `~/.pi/agent/dynamic-models/config.json`.

## Configuration

Create configuration in `~/.pi/agent/dynamic-models/config.json` (or `~/.pi/agents/dynamic-models/config.json`):

```json
{
  "baseUrl": "https://your-llm-proxy.example.com/v1",
  "apiKey": "your-api-key-optional",
  "providerId": "my-proxy",
  "providerName": "Custom Proxy",
  "defaultContextWindow": 400000,
  "defaultMaxTokens": 8192
}
```

### Configuration Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | *(required)* | Base URL for the OpenAI-compatible API endpoint |
| `apiKey` | `string` | `"dummy-key"` | Authorization token sent as Bearer header |
| `providerId` | `string` | `"dynamic-models"` | Unique ID for the registered provider in Pi |
| `providerName` | `string` | `"Dynamic Models"` | Friendly name for the provider displayed in Pi |
| `defaultContextWindow` | `number` | `400000` | Fallback context window when not reported by `/models` |
| `defaultMaxTokens` | `number` | `8192` | Fallback max tokens when not reported by `/models` |

## Commands

- `/refresh-models`: Re-fetches the remote `/models` endpoint and updates registered models.

## Installation

### Via Pi Package Catalog / npm

```bash
pi install npm:pi-dynamic-providers
```

### Via Git Repository

```bash
pi install git:github.com/cybershape/pi-dynamic-models
```

### Try Without Installing

```bash
pi -e git:github.com/cybershape/pi-dynamic-models
```

## Requirements

- Pi Coding Agent (`@earendil-works/pi-coding-agent`) `>= 0.80.0`
- Node.js `>= 20.0.0`

## Development

Install dependencies and run checks:

```bash
npm install
npm run check
```

## License

[MIT](LICENSE) © cybershape
