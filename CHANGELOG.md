# 变更日志 / Changelog

---

## [1.0.0] - 2026-03-12

### 新增 / Added

- `before_tool_call` hook（优先级 100）：拦截文件访问工具对浏览器密码数据库、微信/QQ/钉钉数据目录、Windows SAM/Credentials hive 及 SSH/GPG 私钥的访问
- `before_tool_call` hook（优先级 100）：拦截命令执行工具中匹配 mimikatz、lsadump、SAM 导出、LSASS 转储、PowerShell 下载执行管道等凭据窃取模式的命令
- `before_tool_call` exec 路径扫描：任何命令中引用受保护路径也会被拦截（防止通过 exec 工具绕过文件保护）
- `message_sending` hook：取消包含 NTLM 哈希、PEM 私钥块或大段 base64 载荷的出站消息
- 追加式审计日志（`~/.openclaw/cn-security-audit.log`，NDJSON 格式，从不截断）
- 用户可编辑白名单（`~/.openclaw/cn-security-whitelist.json`，插件本身对其只读）
- 篡改检测：若白名单文件在会话中被意外修改，在网关日志中发出警告
- 启动时可写性检查：若白名单文件未受 OS 只读保护则发出安全警告
- `install.ps1`：Windows 一键安装 / 卸载脚本，安装后自动设置 OS 层只读保护
- `whitelist-template.json`：安装时复制到用户配置目录的白名单起始模板

---

*格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，版本遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。*

---
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-12

### Added

- `before_tool_call` hook (priority 100): blocks file-access tools attempting to read browser credential databases, WeChat/QQ/DingTalk data directories, Windows SAM/Credentials hives, and SSH/GPG private keys
- `before_tool_call` hook (priority 100): blocks command-execution tools running patterns matching mimikatz, lsadump, SAM export, LSASS dump, PowerShell download cradles, and similar credential-stealing techniques
- `before_tool_call` exec path scanning: commands referencing any protected path are also blocked (prevents exec-tool bypass of file protections)
- `message_sending` hook: cancels outbound messages containing NTLM hashes, PEM private key blocks, or large base64 payloads
- Append-only audit log at `~/.openclaw/cn-security-audit.log` (NDJSON format, never truncated)
- User-editable whitelist at `~/.openclaw/cn-security-whitelist.json` (plugin is read-only to this file)
- Tamper-detection: warns in gateway log when whitelist file changes unexpectedly during a session
- Startup writability check: warns in gateway log if whitelist file lacks OS-level read-only protection
- `install.ps1`: one-command install/uninstall for Windows; sets OS-level read-only protection after install
- `whitelist-template.json`: starter template copied to user's config directory on install
