# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active  |

## Reporting a Vulnerability

If you discover a security vulnerability in this plugin (e.g., a bypass technique for the block rules), please **do not open a public Issue**.

Instead, report it privately via one of:

- **GitHub Private Security Advisory**: use the "Report a vulnerability" button on the Security tab
- **Email**: open a GitHub Issue requesting contact details

Please include:

1. Description of the bypass technique
2. Attack scenario (what credentials / data can be exfiltrated)
3. Affected versions
4. Steps to reproduce

We will respond within **72 hours** and publish a fix + advisory as soon as possible.

## Scope

This plugin operates as a **best-effort defense layer** on top of OpenClaw's plugin hook system. It does **not** replace OS-level access controls (file permissions, UAC, Windows Defender). Bypasses that require:

- Administrator / SYSTEM privileges to exploit
- Physical access to the machine
- Modifications to the OpenClaw core binary

...are considered out of scope for this plugin.
