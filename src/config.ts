/**
 * cn-security: User-controlled whitelist loader.
 *
 * The whitelist file lives at:
 *   %USERPROFILE%\.openclaw\cn-security-whitelist.json
 *
 * The AI (plugin) ONLY READS this file — it never writes or modifies it.
 * Users edit it manually with any text editor.
 *
 * Format:
 * {
 *   "paths": [
 *     "C:\\Users\\alice\\projects\\myapp\\Login Data"   // exact path to allow
 *   ],
 *   "commandPatterns": [
 *     "sqlite3 myapp.db"   // substring of a command to allow
 *   ],
 *   "tools": [
 *     "web_fetch"  // tool name to skip checks for
 *   ]
 * }
 *
 * Anti-tampering: we record the file's mtime + size on first load and warn
 * loudly if they change during a session (indicating the AI may have been
 * tricked into reloading modified content).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SecurityWhitelist = {
  /** Exact (or substring) paths the user has approved for access */
  paths: string[];
  /** Substrings of commands the user has pre-approved */
  commandPatterns: string[];
  /** Tool names to skip checks for (e.g. user trusts web_fetch fully) */
  tools: string[];
};

type WhitelistMeta = {
  mtimeMs: number;
  size: number;
};

/** Cached whitelist state for the current process */
let cachedWhitelist: SecurityWhitelist | null = null;
let cachedMeta: WhitelistMeta | null = null;
/** Timestamp (Date.now()) of the last statSync check — throttles filesystem probes */
let lastStatCheckMs = 0;
const STAT_CHECK_INTERVAL_MS = 5_000;

/** Resolve the whitelist file path. */
export function resolveWhitelistPath(): string {
  return path.join(os.homedir(), ".openclaw", "cn-security-whitelist.json");
}

/** Return an empty (deny-all) whitelist. */
function emptyWhitelist(): SecurityWhitelist {
  return { paths: [], commandPatterns: [], tools: [] };
}

/**
 * Load the user whitelist from disk (read-only).
 *
 * - If the file does not exist, returns an empty whitelist (deny-all default).
 * - If the file exists but is malformed, returns empty whitelist and logs a warning.
 * - Caches the result for the process lifetime; re-reads if the file changes
 *   but emits a tamper warning.
 */
export function loadWhitelist(logger?: {
  warn: (msg: string) => void;
  info: (msg: string) => void;
}): SecurityWhitelist {
  const wlPath = resolveWhitelistPath();

  // Fast path: skip statSync if we checked recently (tamper detection has a 5s window)
  const now = Date.now();
  if (cachedWhitelist && now - lastStatCheckMs < STAT_CHECK_INTERVAL_MS) {
    return cachedWhitelist;
  }
  lastStatCheckMs = now;

  // Check current file state
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(wlPath);
  } catch {
    // File does not exist — that's fine, use empty whitelist
    cachedWhitelist = emptyWhitelist();
    cachedMeta = null;
    return cachedWhitelist;
  }

  const currentMeta: WhitelistMeta = { mtimeMs: stat.mtimeMs, size: stat.size };

  // Detect tampering: if already cached but file metadata changed, warn
  if (cachedWhitelist && cachedMeta) {
    const changed =
      currentMeta.mtimeMs !== cachedMeta.mtimeMs || currentMeta.size !== cachedMeta.size;
    if (!changed) {
      return cachedWhitelist;
    }
    // File changed since last load
    logger?.warn(
      "[cn-security] TAMPER WARNING: whitelist file changed since last load. " +
        "Reloading. If you did not edit it manually, investigate immediately.",
    );
  }

  // Read and parse
  try {
    const raw = fs.readFileSync(wlPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const wl = normalizeWhitelist(parsed, logger);
    cachedWhitelist = wl;
    cachedMeta = currentMeta;
    logger?.info(
      `[cn-security] Whitelist loaded from ${wlPath} (${wl.paths.length} path(s), ${wl.commandPatterns.length} command pattern(s), ${wl.tools.length} tool(s))`,
    );
    return wl;
  } catch (err) {
    logger?.warn(
      `[cn-security] Failed to parse whitelist at ${wlPath}: ${String(err)}. Using deny-all defaults.`,
    );
    cachedWhitelist = emptyWhitelist();
    cachedMeta = currentMeta;
    return cachedWhitelist;
  }
}

/** Normalise the parsed JSON into a well-typed SecurityWhitelist. */
function normalizeWhitelist(
  raw: unknown,
  logger?: { warn: (msg: string) => void },
): SecurityWhitelist {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    logger?.warn("[cn-security] Whitelist file is not a JSON object. Using deny-all defaults.");
    return emptyWhitelist();
  }

  const obj = raw as Record<string, unknown>;

  return {
    paths: toStringArray(obj["paths"], "paths", logger),
    commandPatterns: toStringArray(obj["commandPatterns"], "commandPatterns", logger),
    tools: toStringArray(obj["tools"], "tools", logger),
  };
}

function toStringArray(
  value: unknown,
  key: string,
  logger?: { warn: (msg: string) => void },
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    logger?.warn(`[cn-security] Whitelist "${key}" must be an array. Ignoring.`);
    return [];
  }
  return value.filter((v) => {
    if (typeof v !== "string") {
      logger?.warn(`[cn-security] Whitelist "${key}" contains non-string entry. Ignoring.`);
      return false;
    }
    return true;
  }) as string[];
}

// ---------------------------------------------------------------------------
// Whitelist check helpers (used in index.ts)
// ---------------------------------------------------------------------------

/**
 * Returns true if a file/path is explicitly allowed by the whitelist.
 * Matching is case-insensitive substring (Windows paths vary in case).
 */
export function isPathWhitelisted(filePath: string, wl: SecurityWhitelist): boolean {
  const lower = filePath.toLowerCase().replace(/\//g, "\\");
  return wl.paths.some((p) => lower.includes(p.toLowerCase().replace(/\//g, "\\")));
}

/**
 * Returns true if a command string matches a user-approved command pattern.
 * Matching is case-insensitive substring.
 */
export function isCommandWhitelisted(command: string, wl: SecurityWhitelist): boolean {
  const lower = command.toLowerCase();
  return wl.commandPatterns.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Returns true if a tool is on the user-approved tool list.
 */
export function isToolWhitelisted(toolName: string, wl: SecurityWhitelist): boolean {
  return wl.tools.includes(toolName);
}

/** Reset cached whitelist (for testing). */
export function resetWhitelistCache(): void {
  cachedWhitelist = null;
  cachedMeta = null;
  lastStatCheckMs = 0;
}
