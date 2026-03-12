/**
 * cn-security plugin — main entry point.
 *
 * Registers three defensive layers:
 *
 * 1. before_tool_call (priority 100)
 *    - File tools (read, write_file, list_dir, glob, …): blocks access to
 *      sensitive paths (browser passwords, social app data, system credentials).
 *    - Exec tools (bash, run_command, powershell, …): blocks dangerous command
 *      keyword patterns.
 *    - Web tools (web_fetch, …): currently pass-through (configurable via whitelist).
 *
 * 2. message_sending
 *    - Scans outbound content for credential-looking patterns and cancels the
 *      message if any are found.
 *
 * 3. All blocked/allowed-by-whitelist events are appended to an audit log:
 *    ~/.openclaw/cn-security-audit.log  (NDJSON, append-only)
 *
 * User whitelist: ~/.openclaw/cn-security-whitelist.json  (AI never writes this)
 */

import fs from "node:fs";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/cn-security";
import {
  appendAuditEntry,
  blockCommandAudit,
  blockFileAudit,
  allowWhitelistAudit,
  warnContentAudit,
} from "./src/audit.js";
import {
  isCommandWhitelisted,
  isPathWhitelisted,
  isToolWhitelisted,
  loadWhitelist,
  resolveWhitelistPath,
} from "./src/config.js";
import {
  ALL_SENSITIVE_PATHS,
  DANGEROUS_COMMAND_PATTERNS,
  INTERCEPTED_TOOLS_EXEC,
  INTERCEPTED_TOOLS_FILE,
  SENSITIVE_CONTENT_PATTERNS,
} from "./src/rules.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a file path from tool params.
 * Different tools use different param names.
 */
function extractFilePath(params: Record<string, unknown>): string | null {
  // Most file tools use "path" or "filePath"
  for (const key of ["path", "filePath", "file_path", "filepath", "target"]) {
    const v = params[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Extract a command string from exec tool params.
 * bash/shell tools use "command", run_command uses "command" or "cmd".
 */
function extractCommand(params: Record<string, unknown>): string | null {
  for (const key of ["command", "cmd", "script", "code", "input"]) {
    const v = params[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Check if a (lowercase, backslash-normalised) path matches any sensitive rule.
 * Returns the name of the first matching rule category, or null if safe.
 */
function matchSensitivePath(filePath: string): string | null {
  const lower = filePath.toLowerCase().replace(/\//g, "\\");
  // ALL_SENSITIVE_PATHS entries are already lowercase — no redundant toLowerCase needed
  for (const fragment of ALL_SENSITIVE_PATHS) {
    if (lower.includes(fragment)) {
      // Determine the category for the audit log
      return categorizeSensitivePath(fragment);
    }
  }
  return null;
}

function categorizeSensitivePath(fragment: string): string {
  const f = fragment.toLowerCase();
  if (f.includes("login data") || f.includes("firefox") || f.includes("cookies"))
    return "BROWSER_CREDENTIAL";
  if (f.includes("history")) return "BROWSER_HISTORY";
  if (f.includes("tencent") || f.includes("dingtalk") || f.includes("feishu") || f.includes("lark"))
    return "SOCIAL_APP_DATA";
  if (f.includes("sam") || f.includes("credentials") || f.includes("protect")) {
    return "SYSTEM_CREDENTIAL";
  }
  if (f.includes(".ssh") || f.includes(".gnupg")) return "SSH_GPG_KEY";
  if (f.includes(".openclaw")) return "OPENCLAW_CONFIG";
  return "SENSITIVE_FILE";
}

/**
 * Check if a command matches any dangerous-command pattern.
 * Returns the matched pattern description, or null if safe.
 */
function matchDangerousCommand(command: string): string | null {
  for (const re of DANGEROUS_COMMAND_PATTERNS) {
    if (re.test(command)) {
      return `DANGEROUS_COMMAND_PATTERN:${re.source.slice(0, 60)}`;
    }
  }
  return null;
}

/**
 * Check if a message body contains credential-like content.
 * Returns the first matching pattern description, or null if clean.
 */
function matchSensitiveContent(content: string): string | null {
  for (const re of SENSITIVE_CONTENT_PATTERNS) {
    if (re.test(content)) {
      return `SENSITIVE_CONTENT:${re.source.slice(0, 60)}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

const plugin = {
  id: "cn-security",
  name: "CN Security",
  description:
    "Blocks access to browser credentials, social app data, system security files, and dangerous commands. Append-only audit log. User-editable whitelist.",

  register(api: OpenClawPluginApi) {
    const log = api.logger;

    log.info("[cn-security] Plugin loaded. Audit log: ~/.openclaw/cn-security-audit.log");
    log.info(
      "[cn-security] Whitelist: ~/.openclaw/cn-security-whitelist.json (read-only, edit manually)",
    );

    // Warn if the whitelist file is writable — OS-level read-only protection may have been removed.
    // A writable whitelist means Node.js (and thus a compromised AI session) can modify it.
    try {
      const wlPath = resolveWhitelistPath();
      const stat = fs.statSync(wlPath);
      // On Windows IsReadOnly maps to the win32 FILE_ATTRIBUTE_READONLY bit (mode & 0o200 === 0)
      const isWritable = (stat.mode & 0o200) !== 0;
      if (isWritable) {
        log.warn(
          "[cn-security] SECURITY WARNING: whitelist file is writable by the current process. " +
            'Run: attrib +R "' +
            wlPath +
            '" to restore OS-level protection.',
        );
      }
    } catch {
      // File doesn't exist yet — fine, will be created on first access
    }

    // ------------------------------------------------------------------
    // Hook 1: before_tool_call  (priority 100 — runs before other hooks)
    // ------------------------------------------------------------------
    api.on(
      "before_tool_call",
      (event, ctx) => {
        const { toolName, params, runId } = event;
        const channel = ctx.sessionKey ?? undefined;

        // Load whitelist fresh each call (detects file changes + tamper)
        const wl = loadWhitelist(log);

        // Skip if this entire tool is whitelisted
        if (isToolWhitelisted(toolName, wl)) {
          return;
        }

        // ---- File-access tools ----
        if (INTERCEPTED_TOOLS_FILE.includes(toolName)) {
          const filePath = extractFilePath(params);
          if (!filePath) return;

          const matchedRule = matchSensitivePath(filePath);
          if (matchedRule) {
            // Check user whitelist before blocking
            if (isPathWhitelisted(filePath, wl)) {
              appendAuditEntry(
                allowWhitelistAudit({ tool: toolName, detail: filePath, channel, runId }),
              );
              log.warn(`[cn-security] WHITELIST ALLOW: ${toolName} → ${filePath}`);
              return; // allow
            }

            // Block
            const auditEntry = blockFileAudit({
              tool: toolName,
              filePath,
              reason: matchedRule,
              channel,
              runId,
            });
            appendAuditEntry(auditEntry);
            log.warn(
              `[cn-security] BLOCKED ${toolName}: sensitive path detected [${matchedRule}] → ${filePath}`,
            );
            return {
              block: true,
              blockReason: `[cn-security] Access to this path is blocked (${matchedRule}). This path contains sensitive credentials or security-critical data.`,
            };
          }
          return;
        }

        // ---- Command-execution tools ----
        if (INTERCEPTED_TOOLS_EXEC.includes(toolName)) {
          const command = extractCommand(params);
          if (!command) return;

          // Check 1: does the command reference a sensitive path?
          // This catches exec-based bypass attempts like:
          //   Set-Content "$env:USERPROFILE\.openclaw\cn-security-whitelist.json" '...'
          const pathInCmd = matchSensitivePath(command);
          if (pathInCmd) {
            if (isCommandWhitelisted(command, wl)) {
              appendAuditEntry(
                allowWhitelistAudit({ tool: toolName, detail: command, channel, runId }),
              );
              return;
            }
            const auditEntry = blockCommandAudit({
              tool: toolName,
              command,
              reason: `EXEC_SENSITIVE_PATH:${pathInCmd}`,
              channel,
              runId,
            });
            appendAuditEntry(auditEntry);
            log.warn(
              `[cn-security] BLOCKED ${toolName}: command references sensitive path [${pathInCmd}]`,
            );
            return {
              block: true,
              blockReason: `[cn-security] This command references a protected path (${pathInCmd}) and has been blocked.`,
            };
          }

          // Check 2: dangerous command keyword patterns
          const matchedRule = matchDangerousCommand(command);
          if (matchedRule) {
            // Check user whitelist before blocking
            if (isCommandWhitelisted(command, wl)) {
              appendAuditEntry(
                allowWhitelistAudit({ tool: toolName, detail: command, channel, runId }),
              );
              log.warn(`[cn-security] WHITELIST ALLOW command: ${toolName}`);
              return; // allow
            }

            // Block
            const auditEntry = blockCommandAudit({
              tool: toolName,
              command,
              reason: matchedRule,
              channel,
              runId,
            });
            appendAuditEntry(auditEntry);
            log.warn(
              `[cn-security] BLOCKED ${toolName}: dangerous command pattern [${matchedRule}]`,
            );
            return {
              block: true,
              blockReason: `[cn-security] This command matches a dangerous pattern (${matchedRule.split(":")[0]}) and has been blocked for security reasons.`,
            };
          }
          return;
        }

        // ---- Web fetch tools: pass through (future: URL allowlist) ----
        // Currently not blocked; SENSITIVE_CONTENT_PATTERNS covers exfiltration
        // via the message_sending hook below.
        return;
      },
      { priority: 100 },
    );

    // ------------------------------------------------------------------
    // Hook 2: message_sending — block outbound sensitive content
    // ------------------------------------------------------------------
    api.on("message_sending", (event, ctx) => {
      const { content, to } = event;
      if (!content) return;

      const channel = ctx.channelId;

      const matchedRule = matchSensitiveContent(content);
      if (matchedRule) {
        const snippet = content.slice(0, 100);
        const auditEntry = warnContentAudit({
          tool: "message_sending",
          snippet,
          reason: matchedRule,
          channel,
        });
        appendAuditEntry(auditEntry);
        log.warn(
          `[cn-security] BLOCKED outbound message to "${to}" — sensitive content detected [${matchedRule}]`,
        );
        return { cancel: true };
      }
    });

    log.info("[cn-security] Hooks registered: before_tool_call (priority 100) + message_sending");
  },
};

export default plugin;
