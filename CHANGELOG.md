# Changelog

All notable changes to Project Neo. Newest first.

## [Unreleased]

## [0.1.0] - 2026-09-01

First Rust release: the bot rewritten from TypeScript as a cargo workspace.

### Added

- Linked-device login: pair by QR like WhatsApp Web, session kept in sqlite,
  no bot API and no Business account
- Command framework in `neo-sdk`: trigger and raw regex patterns, access
  gates (owner / sudo / follows-mode / everyone), chat gates (group / DM),
  message-type gates, NSFW opt-in
- Registry that compiles each command's regex at startup and runs the first
  match that passes its gates
- Plugins as separate crates, auto-wired by a build script; folder name
  becomes the plugin name
- TOML config at XDG paths (`~/.local/share/project-neo/config.toml`)
- `.ping` - responds with Pong and the real round-trip time
- `.help` - lists commands grouped by category, or details one command,
  a plugin, or a category

[Unreleased]: https://github.com/Ciphrox/Project-Neo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Ciphrox/Project-Neo/releases/tag/v0.1.0
