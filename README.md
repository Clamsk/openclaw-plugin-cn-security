# openclaw-plugin-cn-security

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-%3E%3D2026.1.0-blue)](https://openclaw.ai)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)](https://github.com/openclaw/openclaw)

> **面向中国用户的 OpenClaw 运行时安全加固插件**
>
> 在 AI 每次调用工具前实时拦截对浏览器密码、国内社交软件数据、系统凭据及危险命令的访问，所有事件写入追加式审计日志，白名单由用户手动控制，**AI 无法修改**。

---

## ⚠️ 安装前必读

**这个插件会限制 AI 的许多能力，请在充分了解后再决定是否安装。**

### 会被拦截的操作（安装后 AI 无法执行）

| 类型 | 具体内容 |
|------|---------|
| 文件读写 | Chrome/Edge/Firefox 密码数据库、Cookie 文件 |
| 文件读写 | 微信、QQ、TIM、钉钉、飞书本地数据目录 |
| 文件读写 | Windows SAM/SECURITY hive、`Microsoft\Credentials`、`Microsoft\Protect` |
| 文件读写 | SSH 私钥（`.ssh\id_rsa` 等）、GPG 密钥环 |
| 文件读写 | OpenClaw 自身配置（`~\.openclaw\credentials`、`openclaw.json`） |
| 文件读写 | 插件自身的白名单文件和已安装目录（防自我篡改） |
| 命令执行 | mimikatz、sekurlsa、lsadump、privilege::debug |
| 命令执行 | reg export HKLM\SAM/SECURITY/SYSTEM |
| 命令执行 | LSASS 内存转储（procdump、comsvcs minidump） |
| 命令执行 | net user /add、PowerShell Base64 混淆命令、下载执行管道 |
| 命令执行 | 任何命令中包含上述受保护路径（防 exec 绕过） |
| 出站消息 | 含 NTLM 哈希、PEM 私钥块、大段 base64 的 AI 回复 |

### 可能造成的正常功能受限

- 如果你让 AI 帮你管理 SSH 密钥，它将无法读取 `~/.ssh/` 下的私钥
- 如果你让 AI 帮你分析浏览器数据（合规用途），需要手动添加白名单
- 执行含受保护路径的 PowerShell 脚本会被整条拦截
- `\lark\` 目录路径会被命中（精确匹配目录段，不影响 "clark"、"larkin" 等名称）

### 仍然存在的风险（不在保护范围内）

- AI 通过 Node.js 代码（而非 shell 工具）直接调用 `fs.writeFileSync` — 需配合 OS 层只读保护
- 修改 `OPENCLAW_STATE_DIR` 环境变量指向其他路径 — 规则匹配失效
- 高度混淆的命令（多层编码）— 字符串匹配可能遗漏
- 社会工程学：AI 可能以「帮你修复配置」「需要读取此文件才能完成任务」为由建议你临时解除保护，**请始终保持警惕**

> **结论：本插件是 AI 工具调用层的第二道防线，不能替代操作系统权限管理和 Windows Defender。**

---

## 防护层架构

```
用户消息
    ↓
① AI 模型自身安全判断（第一道防线）
    ↓ 模型认为合理时才会继续
② before_tool_call hook（本插件，优先级 100）
    ├─ 文件工具 → 路径黑名单匹配 → block / 白名单放行
    ├─ 执行工具 → 命令关键字匹配 + 路径引用检查 → block / 白名单放行
    └─ 所有放行/拦截事件写入审计日志
    ↓
③ AI 准备发送回复
    ↓
④ message_sending hook（本插件）
    └─ 出站内容扫描（NTLM/PEM/base64）→ cancel / 正常发送
    ↓
⑤ OS 层只读保护（安装脚本设置）
    └─ 白名单文件 + 插件目录设为 IsReadOnly，AI 的 fs 调用也无法写入
```

**注意**：只有 AI 实际尝试调用工具时插件才会触发。如果模型在第①步就拒绝了请求，审计日志不会有记录——这是正常的，说明第一道防线生效了。

---

## 安装

### 前提条件

- OpenClaw ≥ 2026.1.0
- Node.js ≥ 22
- Windows（Linux/macOS 需自行修改 `src/rules.ts` 中的路径分隔符）

### 使用安装脚本（推荐）

```powershell
# 下载仓库
git clone https://github.com/YOUR_USERNAME/openclaw-plugin-cn-security.git
cd openclaw-plugin-cn-security

# 运行安装脚本
powershell -ExecutionPolicy Bypass -File install.ps1

# 重启网关
openclaw gateway stop
openclaw gateway run
```

安装脚本会自动：
1. 将插件文件复制到 `%USERPROFILE%\.openclaw\plugins\cn-security\`
2. 更新 `openclaw.json` 的 `plugins.allow` 和 `plugins.load.paths`
3. 创建白名单模板 `cn-security-whitelist.json`（无 BOM 的 UTF-8 格式）
4. **对插件文件和白名单设置 OS 层只读保护**（防 AI 绕过 hook 直接写入）

---

## 白名单配置

白名单文件被设为只读，编辑前需先解除保护：

```powershell
# 解除只读
attrib -R "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"

# 编辑（记事本或任意编辑器）
notepad "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"

# 编辑完毕后重新锁定（必须执行）
attrib +R "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"
```

白名单格式：

```json
{
  "paths": [
    "C:\\MyProject\\app.db"
  ],
  "commandPatterns": [
    "sqlite3 myapp.db"
  ],
  "tools": []
}
```

修改后无需重启，下次工具调用时自动生效（5 秒缓存后刷新）。

---

## 常见问题

### 插件加载后出现 `Failed to parse whitelist` 警告

**原因**：白名单 JSON 文件含 UTF-8 BOM（PowerShell 5.1 的 `Set-Content -Encoding UTF8` 默认写入 BOM）。

**症状**：插件退化为 **deny-all 模式**，所有工具调用均被拦截。

**修复**：
```powershell
$path = "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"
attrib -R $path
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $false))
attrib +R $path
```

### 启动日志出现 `SECURITY WARNING: whitelist file is writable`

**原因**：白名单的 OS 只读保护被移除（可能是手动编辑后忘记重新锁定）。

**修复**：
```powershell
attrib +R "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"
```

### AI 的正常请求被误拦截

1. 查看审计日志确认命中的规则：
   ```powershell
   Get-Content "$env:USERPROFILE\.openclaw\cn-security-audit.log" -Tail 20
   ```
2. 将该路径或命令关键字加入白名单（解除只读后编辑，参见上方白名单配置）
3. 重新锁定白名单

### exec 命令需要人工审批

在 `openclaw.json` 中为对应渠道添加 `execApprovals` 配置：

```json
"channels": {
  "discord": {
    "execApprovals": "chat"
  }
}
```

开启后，AI 发起 exec 请求时渠道内会出现审批消息，回复 `y` 确认或 `n` 拒绝。

---

## 审计日志

位置：`%USERPROFILE%\.openclaw\cn-security-audit.log`（NDJSON，追加写入，从不删改）

示例：
```json
{"ts":"2026-03-12T14:30:00.000Z","action":"block","reason":"BROWSER_CREDENTIAL","tool":"read","detail":"C:\\...\\Login Data"}
{"ts":"2026-03-12T14:31:00.000Z","action":"block","reason":"EXEC_SENSITIVE_PATH:OPENCLAW_CONFIG","tool":"powershell","detail":"Set-Content ...whitelist.json..."}
{"ts":"2026-03-12T14:32:00.000Z","action":"allow_whitelist","tool":"read","detail":"C:\\MyProject\\app.db"}
{"ts":"2026-03-12T14:33:00.000Z","action":"warn_content","reason":"SENSITIVE_CONTENT","tool":"message_sending"}
```

查看最近记录：
```powershell
Get-Content "$env:USERPROFILE\.openclaw\cn-security-audit.log" -Tail 50
```

---

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
```

卸载脚本会自动解除只读保护、删除插件目录、从 `openclaw.json` 移除相关配置。

---

## 已知限制

| 限制 | 说明 |
|------|------|
| 仅 Windows 路径规则 | Linux/macOS 需自行修改 `src/rules.ts` |
| 不防 Node.js 直接 fs 调用 | `fs.writeFileSync` 绕过 hook，需配合 OS 只读保护 |
| 字符串匹配可绕过 | 多层编码/混淆命令可能遗漏，不能替代专业 EDR |
| 白名单全局生效 | 无法按会话或用户区分白名单 |
| 插件覆盖风险 | 若 OpenClaw 更新覆盖插件目录需重新安装 |
| 环境变量绕过 | 修改 `OPENCLAW_STATE_DIR` 可使路径规则失效 |

---

## 贡献

欢迎提交 Issue 和 Pull Request，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

[MIT](LICENSE) © 2026 openclaw-plugin-cn-security contributors

> 本插件为社区项目，非 OpenClaw 官方插件。
