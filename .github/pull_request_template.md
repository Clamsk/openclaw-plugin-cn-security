## 变更类型 / Change Type

- [ ] Bug 修复 / Bug fix
- [ ] 新增规则（路径/命令/内容）/ New rule (path / command / content)
- [ ] 规则调整（精确化/扩大覆盖）/ Rule adjustment (narrowing / broadening)
- [ ] 文档更新 / Documentation update
- [ ] 其他 / Other

## 描述 / Description

<!-- 这个 PR 做了什么？为什么需要这个变更？ -->
<!-- What does this PR do? Why is this change needed? -->

## 关联 Issue / Related Issue

Closes #

## 规则变更说明 / Rule Change Details（如适用 / if applicable）

| 类型 / Type | 规则内容 / Rule | 攻击场景 / Attack Scenario | 误报风险 / FP Risk |
|-------------|----------------|---------------------------|-------------------|
|             |                |                           |                   |

## 测试 / Testing

- [ ] 新规则有触发示例（工具参数或命令字符串）/ New rule has trigger example (tool args or command string)
- [ ] 已在本地安装插件并验证行为 / Verified behavior with plugin installed locally
- [ ] 审计日志中可以看到正确的 action 字段 / Correct `action` field visible in audit log

## 检查清单 / Checklist

- [ ] 提交信息遵循 Conventional Commits 格式 / Commit messages follow Conventional Commits format
- [ ] 已更新 `CHANGELOG.md`（在 `[Unreleased]` 节添加条目）/ `CHANGELOG.md` updated under `[Unreleased]`
- [ ] 路径规则已使用小写（插件做 case-insensitive 匹配）/ Path rules use lowercase (plugin matches case-insensitively)
