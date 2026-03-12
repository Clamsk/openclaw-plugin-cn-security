# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-12

### Added

- `before_tool_call` hook (priority 100): blocks file-access tools attempting to read browser credential databases, WeChat/QQ/DingTalk data directories, Windows SAM/Credentials hives, and SSH/GPG private keys
- `before_tool_call` hook (priority 100): blocks command-execution tools running patterns matching mimikatz, lsadump, SAM export, LSASS dump, PowerShell download cradles, and similar credential-stealing techniques
- `message_sending` hook: cancels outbound messages containing NTLM hashes, PEM private key blocks, or large base64 payloads
- Append-only audit log at `~/.openclaw/cn-security-audit.log` (NDJSON format, never truncated)
- User-editable whitelist at `~/.openclaw/cn-security-whitelist.json` (plugin is read-only)
- Tamper-detection: warns in gateway log when whitelist file changes unexpectedly during a session
- `install.ps1`: one-command install/uninstall for Windows
- `whitelist-template.json`: starter template copied to user's config directory on install
