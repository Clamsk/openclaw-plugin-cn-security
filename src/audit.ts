/**
 * cn-security: Append-only audit log.
 *
 * Log file: %USERPROFILE%\.openclaw\cn-security-audit.log
 *
 * Each line is a JSON object (NDJSON format):
 * {
 *   "ts": "2024-01-01T00:00:00.000Z",
 *   "action": "block" | "allow" | "warn",
 *   "reason": "BROWSER_PASSWORD_PATH",
 *   "tool": "read",
 *   "detail": "C:\\Users\\alice\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data",
 *   "channel": "discord"   // optional context from hook
 * }
 *
 * The log file is append-only; existing entries are never modified or deleted
 * by this plugin. The AI cannot shrink or overwrite it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type AuditAction = "block" | "allow_whitelist" | "warn_content";

export type AuditEntry = {
  ts: string;
  action: AuditAction;
  reason: string;
  tool: string;
  detail: string;
  channel?: string;
  runId?: string;
};

/** Resolve audit log path. */
export function resolveAuditLogPath(): string {
  return path.join(os.homedir(), ".openclaw", "cn-security-audit.log");
}

/**
 * Append one audit entry to the log file (fire-and-forget, non-blocking).
 * Errors are swallowed — audit failures must not block tool execution flow.
 */
export function appendAuditEntry(entry: AuditEntry): void {
  // Use setImmediate to avoid blocking the hook return path
  setImmediate(() => {
    const logPath = resolveAuditLogPath();
    const line = JSON.stringify(entry) + "\n";
    try {
      // Ensure the directory exists
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      // Append-only (flag: 'a') — never truncates existing content
      fs.appendFileSync(logPath, line, { encoding: "utf8", flag: "a" });
    } catch {
      // Silently ignore audit write failures — security blocking still works
    }
  });
}

/**
 * Build a block audit entry for a file-access attempt.
 */
export function blockFileAudit(params: {
  tool: string;
  filePath: string;
  reason: string;
  channel?: string;
  runId?: string;
}): AuditEntry {
  return {
    ts: new Date().toISOString(),
    action: "block",
    reason: params.reason,
    tool: params.tool,
    detail: params.filePath,
    channel: params.channel,
    runId: params.runId,
  };
}

/**
 * Build a block audit entry for a command-execution attempt.
 */
export function blockCommandAudit(params: {
  tool: string;
  command: string;
  reason: string;
  channel?: string;
  runId?: string;
}): AuditEntry {
  return {
    ts: new Date().toISOString(),
    action: "block",
    reason: params.reason,
    tool: params.tool,
    detail: params.command.slice(0, 300), // truncate very long commands
    channel: params.channel,
    runId: params.runId,
  };
}

/**
 * Build a warn audit entry for a suspicious outbound message.
 */
export function warnContentAudit(params: {
  tool: string;
  snippet: string;
  reason: string;
  channel?: string;
}): AuditEntry {
  return {
    ts: new Date().toISOString(),
    action: "warn_content",
    reason: params.reason,
    tool: params.tool,
    detail: params.snippet.slice(0, 200),
    channel: params.channel,
  };
}

/**
 * Build an allow-by-whitelist audit entry (for transparency).
 */
export function allowWhitelistAudit(params: {
  tool: string;
  detail: string;
  channel?: string;
  runId?: string;
}): AuditEntry {
  return {
    ts: new Date().toISOString(),
    action: "allow_whitelist",
    reason: "USER_WHITELIST",
    tool: params.tool,
    detail: params.detail.slice(0, 300),
    channel: params.channel,
    runId: params.runId,
  };
}
