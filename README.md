# ClankerProxy

![screenshot](assets/screenshot.png)

A system tray app that wraps [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) in a simple GUI. It manages the proxy binary, API keys, OAuth logins, and config without touching the command line.

## What it does

ClankerProxy sits in your system tray and runs CLIProxyAPI as a background process. The proxy gives you a single local endpoint that routes to multiple LLM providers, translating between API formats automatically.

You point your tools at `http://127.0.0.1:8317` and the proxy handles the rest. Claude, Gemini, Codex, Cursor, Kimi, Qwen, and a dozen other providers all behind one URL.

## Features

- **Tray app** -- starts with your system, lives in the tray, no terminal needed
- **Auto-download** -- grabs the latest CLIProxyAPI binary from GitHub on first launch
- **API key management** -- add/remove proxy auth keys and provider API keys through the UI
- **OAuth logins** -- one-click browser-based login for Claude, Gemini, Codex, GitHub Copilot, Cursor, Kimi, Qwen, and more
- **Auth file management** -- enable/disable/delete credential files
- **Model browser** -- see available models per provider
- **Config generator** -- generate config blocks for external tools (Factory Droid supported, more coming)
- **Thinking budget support** -- configure thinking/reasoning levels per model via proxy suffixes (e.g. `claude-opus-4-6(max)`)
- **Settings** -- debug mode, routing strategy, retry config, proxy URL, all hot-reloaded
- **Log viewer** -- real-time proxy output with filtering

## Supported providers

Claude, Gemini, Codex, GitHub Copilot, GitLab Duo, Kiro (AWS), Cursor, Kimi, Qwen, Antigravity, iFlow, Kilocode, CodeBuddy, Amazon Q, and any OpenAI-compatible endpoint.

## How it works

1. On launch, downloads the CLIProxyAPI Go binary if not already present
2. Generates a per-session management password and injects it into the config
3. Spawns the binary as a child process
4. Talks to the proxy's management API (`/v0/management/*`) for everything -- config changes, key management, OAuth flows, logs
5. Config changes are hot-reloaded by the proxy, no restart needed

## Tech stack

- Electron Forge + Vite
- React + TypeScript
- Tailwind CSS
- TanStack Query
- CLIProxyAPI (Go binary, downloaded at runtime)

## Running locally

```
npm install
npm start
```

Requires Node 18+. The Go binary is downloaded automatically on first launch.

## Building

```
npm run make
```

Produces platform-specific installers in the `out/` directory.

## Platforms

Windows and macOS. Linux is not currently targeted but Electron supports it if needed.

## Config generator

The Config Gen tab generates config blocks for external tools that point at your proxy. Currently supports Factory Droid (`~/.factory/settings.json`). It only shows providers you have set up, and lets you configure API format (Anthropic/OpenAI/Generic) and thinking budget per model.

The `[clanker]` prefix on display names makes it easy to tell which models are coming through your proxy.

## License

MIT
