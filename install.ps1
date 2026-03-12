<#
.SYNOPSIS
    OpenClaw cn-security 插件安装脚本 (Windows)

.DESCRIPTION
    将 cn-security 安全插件安装到本机 OpenClaw 配置中。
    安装后，OpenClaw 将在每次 AI 工具调用前执行安全检查。

.PARAMETER InstallDir
    插件安装目录（默认：%USERPROFILE%\.openclaw\plugins\cn-security）

.PARAMETER Uninstall
    卸载插件（从 openclaw.json 移除并删除插件目录）

.EXAMPLE
    # 默认安装
    powershell -ExecutionPolicy Bypass -File install.ps1

    # 指定安装目录
    powershell -ExecutionPolicy Bypass -File install.ps1 -InstallDir "D:\tools\cn-security"

    # 卸载
    powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
#>

param(
    [string]$InstallDir = "$env:USERPROFILE\.openclaw\plugins\cn-security",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$CfgPath = "$env:USERPROFILE\.openclaw\openclaw.json"

# ─── 颜色辅助 ────────────────────────────────────────────────────────────────
function Write-Ok { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Write-Err { param($m) Write-Host "  [X]  $m" -ForegroundColor Red }
function Write-Step { param($m) Write-Host "`n==> $m" -ForegroundColor Cyan }

# ─── 前置检查 ─────────────────────────────────────────────────────────────────
Write-Step "cn-security 安装程序 v1.0.0"

# 检查 OpenClaw 配置
if (-not (Test-Path $CfgPath)) {
    Write-Err "未找到 OpenClaw 配置文件：$CfgPath"
    Write-Err "请先完成 OpenClaw 安装（openclaw login），再运行此脚本。"
    exit 1
}
Write-Ok "找到 OpenClaw 配置：$CfgPath"

# 检查 Node.js
try {
    $nodeVer = node --version 2>$null
    if ($nodeVer -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -lt 22) {
            Write-Warn "Node.js $nodeVer 可能过低，建议 v22+（当前已安装：$nodeVer）"
        }
        else {
            Write-Ok "Node.js $nodeVer"
        }
    }
}
catch {
    Write-Warn "未检测到 Node.js，OpenClaw 运行时将负责加载插件"
}

# ─── 卸载模式 ─────────────────────────────────────────────────────────────────
if ($Uninstall) {
    Write-Step "卸载 cn-security 插件"

    # 从 openclaw.json 移除
    $cfg = Get-Content $CfgPath -Raw | ConvertFrom-Json
    if ($cfg.plugins) {
        # 从 allow 列表移除
        if ($cfg.plugins.allow) {
            $cfg.plugins.allow = @($cfg.plugins.allow | Where-Object { $_ -ne "cn-security" })
        }
        # 从 load.paths 移除
        if ($cfg.plugins.load -and $cfg.plugins.load.paths) {
            $installDirFwd = $InstallDir.Replace("\", "/")
            $cfg.plugins.load.paths = @(
                $cfg.plugins.load.paths | Where-Object {
                    $_.TrimEnd("/") -ne $installDirFwd.TrimEnd("/")
                }
            )
        }
        $cfg | ConvertTo-Json -Depth 20 | Set-Content $CfgPath -Encoding UTF8
        Write-Ok "已从 openclaw.json 移除 cn-security"
    }

    # 删除插件目录（先解除只读）
    if (Test-Path $InstallDir) {
        Get-ChildItem $InstallDir -Recurse | ForEach-Object { $_.IsReadOnly = $false }
        Remove-Item $InstallDir -Recurse -Force
        Write-Ok "已删除插件目录：$InstallDir"
    }
    else {
        Write-Warn "插件目录不存在，跳过删除：$InstallDir"
    }

    Write-Host "`n卸载完成。请重启 OpenClaw 网关使更改生效。`n" -ForegroundColor Green
    exit 0
}

# ─── 安装模式 ─────────────────────────────────────────────────────────────────
Write-Step "安装目标：$InstallDir"

# 确认安装目录来源（脚本所在目录）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PWD.Path }

# 校验源文件完整性
$requiredFiles = @(
    "index.ts",
    "openclaw.plugin.json",
    "package.json",
    "src\rules.ts",
    "src\config.ts",
    "src\audit.ts"
)
foreach ($f in $requiredFiles) {
    $src = Join-Path $ScriptDir $f
    if (-not (Test-Path $src)) {
        Write-Err "缺少必要文件：$f（请确保从完整插件目录运行此脚本）"
        exit 1
    }
}
Write-Ok "源文件完整性校验通过"

# ─── 创建安装目录并复制文件 ───────────────────────────────────────────────────
Write-Step "复制插件文件"

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InstallDir "src") -Force | Out-Null

$filesToCopy = @(
    @{ Src = "index.ts"; Dst = "index.ts" },
    @{ Src = "openclaw.plugin.json"; Dst = "openclaw.plugin.json" },
    @{ Src = "package.json"; Dst = "package.json" },
    @{ Src = "src\rules.ts"; Dst = "src\rules.ts" },
    @{ Src = "src\config.ts"; Dst = "src\config.ts" },
    @{ Src = "src\audit.ts"; Dst = "src\audit.ts" }
)

foreach ($item in $filesToCopy) {
    $src = Join-Path $ScriptDir $item.Src
    $dst = Join-Path $InstallDir $item.Dst
    Copy-Item $src $dst -Force
    Write-Ok "  $($item.Dst)"
}

# ─── 创建白名单模板 ───────────────────────────────────────────────────────────
Write-Step "配置白名单文件"

$wlPath = "$env:USERPROFILE\.openclaw\cn-security-whitelist.json"
if (-not (Test-Path $wlPath)) {
    $wlSrc = Join-Path $ScriptDir "whitelist-template.json"
    if (Test-Path $wlSrc) {
        Copy-Item $wlSrc $wlPath -Force
    }
    else {
        # 内联创建模板
        $wlTemplate = @{
            "_readme"         = "cn-security 用户白名单 — 请用文本编辑器手动修改，AI 不会也不允许修改此文件"
            "paths"           = @()
            "commandPatterns" = @()
            "tools"           = @()
        } | ConvertTo-Json -Depth 3
        [System.IO.File]::WriteAllText($wlPath, $wlTemplate, [System.Text.Encoding]::UTF8)
    }
    Write-Ok "白名单模板已创建：$wlPath"
}
else {
    Write-Warn "白名单文件已存在，跳过创建：$wlPath"
}

# ─── 更新 openclaw.json ───────────────────────────────────────────────────────
Write-Step "更新 OpenClaw 配置"

$cfg = Get-Content $CfgPath -Raw | ConvertFrom-Json

# 确保 plugins 对象存在
if (-not $cfg.plugins) {
    $cfg | Add-Member -NotePropertyName plugins -NotePropertyValue ([PSCustomObject]@{
            allow = @()
            load  = [PSCustomObject]@{ paths = @() }
        })
}
if (-not $cfg.plugins.allow) {
    $cfg.plugins | Add-Member -NotePropertyName allow -NotePropertyValue @()
}
if (-not $cfg.plugins.load) {
    $cfg.plugins | Add-Member -NotePropertyName load -NotePropertyValue ([PSCustomObject]@{ paths = @() })
}
if (-not $cfg.plugins.load.paths) {
    $cfg.plugins.load | Add-Member -NotePropertyName paths -NotePropertyValue @()
}

# 添加 cn-security 到 allow（去重）
$allowList = @($cfg.plugins.allow) | Where-Object { $_ -ne $null }
if ($allowList -notcontains "cn-security") {
    $allowList = $allowList + "cn-security"
    $cfg.plugins.allow = $allowList
    Write-Ok "已添加 cn-security 到 plugins.allow"
}
else {
    Write-Warn "cn-security 已在 plugins.allow 中，跳过"
}

# 添加路径到 load.paths（去重）
$installDirFwd = $InstallDir.Replace("\", "/")
$existingPaths = @($cfg.plugins.load.paths) | Where-Object { $_ -ne $null }
$alreadyInPaths = $existingPaths | Where-Object { $_.TrimEnd("/") -eq $installDirFwd.TrimEnd("/") }
if (-not $alreadyInPaths) {
    $existingPaths = $existingPaths + $installDirFwd
    $cfg.plugins.load.paths = $existingPaths
    Write-Ok "已添加插件路径：$installDirFwd"
}
else {
    Write-Warn "路径已存在，跳过：$installDirFwd"
}

# 写回配置（保持原有格式）
$cfg | ConvertTo-Json -Depth 20 | Set-Content $CfgPath -Encoding UTF8
Write-Ok "openclaw.json 更新完成"

# ─── OS 层只读保护 ──────────────────────────────────────────────────
Write-Step "设置只读保护（防止 AI 通过 Node.js 绕过 hook 直接写入）"

# 锁定已安装的插件源码文件
$filesToProtect = @("index.ts", "openclaw.plugin.json", "package.json", "src\rules.ts", "src\config.ts", "src\audit.ts")
foreach ($f in $filesToProtect) {
    $fp = Join-Path $InstallDir $f
    if (Test-Path $fp) {
        Set-ItemProperty $fp -Name IsReadOnly -Value $true
        Write-Ok "  只读: $f"
    }
}

# 锁定白名单文件
if (Test-Path $wlPath) {
    Set-ItemProperty $wlPath -Name IsReadOnly -Value $true
    Write-Ok "  只读: cn-security-whitelist.json"
    Write-Warn "  编辑白名单前需先取消只读: attrib -R `"$wlPath`""
    Write-Warn "  编辑完成后建议重新设回只读: attrib +R `"$wlPath`""
}

# ─── 完成提示 ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           cn-security 插件安装成功！                        ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  插件目录：  $InstallDir"
Write-Host "  白名单文件：$wlPath"
Write-Host "  审计日志：  $env:USERPROFILE\.openclaw\cn-security-audit.log"
Write-Host ""
Write-Host "  下一步："
Write-Host "  1. （可选）编辑白名单文件添加您需要放行的路径或命令"
Write-Host "     记事本: notepad `"$wlPath`""
Write-Host "  2. 重启 OpenClaw 网关使插件生效"
Write-Host "     openclaw gateway stop"
Write-Host "     openclaw gateway run"
Write-Host ""
Write-Host "  如需卸载，运行：powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall"
Write-Host ""
