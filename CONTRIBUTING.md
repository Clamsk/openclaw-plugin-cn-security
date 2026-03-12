# Contributing to openclaw-plugin-cn-security

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
git clone https://github.com/YOUR_USERNAME/openclaw-plugin-cn-security.git
powershell -ExecutionPolicy Bypass -File install.ps1 -InstallDir "$(pwd)"

# 重启网关并测试
openclaw gateway stop
openclaw gateway run
```

---

## 行为准则

本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。请保持友善和尊重。
