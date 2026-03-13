# 安全政策 / Security Policy

## 支持版本 / Supported Versions

| 版本 / Version | 支持状态 / Supported |
|----------------|----------------------|
| 1.x            | ✅ 活跃维护 / Active  |

---

## 报告漏洞（中文）

如果您发现本插件的安全漏洞（例如绕过拦截规则的技术），请**不要公开提交 Issue**。

请通过以下方式私下报告：

- **GitHub 安全公告（私密）**：点击 Security 标签页上的「Report a vulnerability」按钮
- **邮件**：提交一个 GitHub Issue 请求联系方式

报告时请包含：

1. 绕过技术的描述
2. 攻击场景（可外泄什么凭据 / 数据）
3. 受影响版本
4. 复现步骤

我们将在 **72 小时内**响应，并尽快发布修复版本和安全公告。

## 范围说明

本插件作为 OpenClaw 插件 hook 系统之上的**尽力而为防御层**运行。它**不能**替代 OS 级别的访问控制（文件权限、UAC、Windows Defender）。以下情况视为**超出范围**：

- 需要管理员 / SYSTEM 权限才能利用
- 需要物理接触设备
- 需要修改 OpenClaw 核心二进制文件

---
---

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active  |

---

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
