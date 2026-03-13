# 贡献指南 / Contributing to openclaw-plugin-cn-security

感谢您考虑为本项目贡献！以下是参与方式。

---

## 报告问题

在提交 Issue 前请先：

1. 搜索 [现有 Issues](../../issues) 确认没有重复报告
2. 确认使用的是最新版本
3. 使用对应模板（Bug 报告 / 功能请求）并填写完整信息

---

## 提交 Pull Request

1. **Fork** 本仓库，在你的 fork 上新建分支：

   ```bash
   git checkout -b feat/my-new-rule
   ```

2. 修改代码，遵循以下原则：
   - 新增路径规则：修改 `src/rules.ts` 中的对应数组
   - 新增命令规则：在 `DANGEROUS_COMMAND_PATTERNS` 中追加正则，并在注释中说明攻击场景
   - 保持规则**精确**，避免误报合法操作

3. 提交信息格式（Conventional Commits）：

   ```
   feat: add WeChat backup path to sensitive paths
   fix: narrow LSASS dump regex to avoid matching log files
   docs: update whitelist examples
   ```

4. 提交 PR，填写模板中所有字段，尤其是：
   - 新增/修改规则的**攻击场景说明**
   - 是否有误报风险及测试结果

---

## 规则贡献标准

新规则被合并前需满足：

| 标准 | 说明 |
|------|------|
| 攻击真实性 | 规则对应真实的凭据窃取技术，有 CVE / 公开 PoC 参考 |
| 误报率 | 在正常开发/办公场景下不会触发 |
| 测试 | 提供触发示例（工具调用参数或命令字符串）和预期行为 |
| Windows 优先 | 路径规则优先覆盖 Windows，跨平台规则需标注 |

---

## 开发环境

本插件无独立构建步骤，源文件由 OpenClaw 的 jiti 运行时直接加载。

```bash
# 克隆并安装到本地 OpenClaw
git clone https://github.com/Clamsk/openclaw-plugin-cn-security.git
powershell -ExecutionPolicy Bypass -File install.ps1

# 重启网关并测试
openclaw gateway stop
openclaw gateway run
```

---

## 行为准则

本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。请保持友善和尊重。

---
---

# Contributing to openclaw-plugin-cn-security

Thank you for considering contributing! Here's how to get involved.

---

## Reporting Issues

Before opening an Issue, please:

1. Search [existing Issues](../../issues) to avoid duplicates
2. Confirm you are on the latest version
3. Use the appropriate template (Bug Report / Feature Request) and fill in all fields

---

## Submitting a Pull Request

1. **Fork** this repository and create a branch on your fork:

   ```bash
   git checkout -b feat/my-new-rule
   ```

2. Make your changes following these guidelines:
   - New path rules: add to the appropriate array in `src/rules.ts`
   - New command rules: append a regex to `DANGEROUS_COMMAND_PATTERNS` with a comment describing the attack scenario
   - Keep rules **precise** to avoid false positives on legitimate operations

3. Use Conventional Commit message format:

   ```
   feat: add WeChat backup path to sensitive paths
   fix: narrow LSASS dump regex to avoid matching log files
   docs: update whitelist examples
   ```

4. Submit the PR and fill in all template fields, especially:
   - **Attack scenario description** for new/modified rules
   - False-positive risk assessment and test results

---

## Rule Contribution Standards

New rules must satisfy the following before merging:

| Standard | Description |
|----------|-------------|
| Attack authenticity | Rule corresponds to a real credential-theft technique with a CVE or public PoC reference |
| False-positive rate | Will not trigger in normal development or office environments |
| Testing | Provide a trigger example (tool call arguments or command string) and expected behavior |
| Windows-first | Path rules should cover Windows first; cross-platform rules must be annotated |

---

## Development Environment

This plugin has no standalone build step. Source files are loaded directly by OpenClaw's jiti runtime.

```bash
# Clone and install into your local OpenClaw
git clone https://github.com/Clamsk/openclaw-plugin-cn-security.git
powershell -ExecutionPolicy Bypass -File install.ps1

# Restart the gateway and test
openclaw gateway stop
openclaw gateway run
```

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. Please be kind and respectful.
