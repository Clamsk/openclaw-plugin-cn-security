/**
 * cn-security: Sensitive path and command deny-rules.
 *
 * These lists define what the AI is NOT allowed to access.
 * All path patterns are lowercased for case-insensitive matching on Windows.
 * Environment variable placeholders (e.g. %APPDATA%) are expanded at runtime
 * in config.ts before being compared.
 */

// ---------------------------------------------------------------------------
// Sensitive path fragments (matched case-insensitively, substring match)
// ---------------------------------------------------------------------------

/** Browser credential databases */
export const BROWSER_PASSWORD_PATHS: readonly string[] = [
  // Chrome / Chromium variants
  "google\\chrome\\user data\\default\\login data",
  "google\\chrome\\user data\\default\\login data-journal",
  "chromium\\user data\\default\\login data",
  "microsoft\\edge\\user data\\default\\login data",
  "brave-browser\\user data\\default\\login data",
  "opera software\\opera stable\\login data",
  "vivaldi\\user data\\default\\login data",
  "yandex\\yandexbrowser\\user data\\default\\login data",
  // Firefox
  "mozilla\\firefox\\profiles",
  // Cookies (also sensitive)
  "google\\chrome\\user data\\default\\cookies",
  "microsoft\\edge\\user data\\default\\cookies",
];

/** Browser history databases */
export const BROWSER_HISTORY_PATHS: readonly string[] = [
  "google\\chrome\\user data\\default\\history",
  "microsoft\\edge\\user data\\default\\history",
  // Firefox profiles already covered by BROWSER_PASSWORD_PATHS — no duplicate needed
];

/** WeChat / QQ / DingTalk local data directories */
export const SOCIAL_APP_PATHS: readonly string[] = [
  "tencent\\wechat",
  "tencent\\qq",
  "tencent\\tim",
  "dingtalk",
  "alibaba\\dingtalk",
  "feishu",
  "\\lark\\", // narrow: must be a directory segment, not part of a username like "clark"
];

/** Windows credential stores and SAM hives */
export const SYSTEM_SECURITY_PATHS: readonly string[] = [
  "windows\\system32\\config\\sam",
  "windows\\system32\\config\\system",
  "windows\\system32\\config\\security",
  "microsoft\\credentials",
  "microsoft\\protect",
  "microsoft\\crypto\\rsa",
  // SSH private keys
  "\\.ssh\\id_rsa",
  "\\.ssh\\id_ed25519",
  "\\.ssh\\id_ecdsa",
  // GPG keyring
  "\\.gnupg\\",
  // OpenClaw auth token (prevent self-exfiltration)
  "\\.openclaw\\credentials",
  "\\.openclaw\\openclaw.json",
  // cn-security own files — prevent AI from tampering with whitelist or plugin code
  "\\.openclaw\\cn-security-whitelist.json",
  "\\.openclaw\\plugins\\cn-security\\",
];

/** All sensitive path rule groups, used for a single combined check */
export const ALL_SENSITIVE_PATHS: readonly string[] = [
  ...BROWSER_PASSWORD_PATHS,
  ...BROWSER_HISTORY_PATHS,
  ...SOCIAL_APP_PATHS,
  ...SYSTEM_SECURITY_PATHS,
];

// ---------------------------------------------------------------------------
// Dangerous command keyword patterns (matched against the full command string)
// ---------------------------------------------------------------------------

/**
 * Regex patterns matched case-insensitively against the entire command string.
 * Any match → block the command.
 *
 * Keep patterns narrow enough to avoid false positives while still catching
 * the realistic attack surface.
 */
export const DANGEROUS_COMMAND_PATTERNS: readonly RegExp[] = [
  // Direct SQLite read of Chrome Login Data
  /sqlite3\s+.*login\s*data/i,
  // `type` or `cat` reading the raw Login Data binary
  /\btype\b.*login\s*data/i,
  // Registry reads of credential hives
  /reg\s+(query|export|save)\s+hklm\\sam/i,
  /reg\s+(query|export|save)\s+hklm\\security/i,
  /reg\s+(query|export|save)\s+hklm\\system/i,
  // Mimikatz / sekurlsa keywords
  /mimikatz/i,
  /sekurlsa/i,
  /lsadump/i,
  /privilege::debug/i,
  // Dump LSASS process memory
  /lsass\.exe.*dump/i,
  /procdump.*lsass/i,
  /comsvcs.*minidump/i,
  // net user / net localgroup escalation
  /net\s+(user|localgroup)\s+.*\/add/i,
  // PowerShell encoded commands (a common obfuscation technique)
  /powershell.*-enc[odedcommand\s]+[a-z0-9+/=]{20,}/i,
  // Invoke-Expression with download cradles
  /iex\s*\(.*downloadstring/i,
  /invoke-expression.*downloadstring/i,
  // curl/wget piped into bash/powershell
  /curl.*\|\s*(bash|sh|powershell|pwsh)/i,
  /wget.*\|\s*(bash|sh|powershell|pwsh)/i,
  // Scheduled task creation pointing to remote payload
  /schtasks.*\/create.*http/i,
];

// ---------------------------------------------------------------------------
// Sensitive content patterns for outbound message scanning
// ---------------------------------------------------------------------------

/**
 * Regex patterns checked against AI reply content before sending.
 * If a reply appears to contain raw credential material, it is blocked.
 */
export const SENSITIVE_CONTENT_PATTERNS: readonly RegExp[] = [
  // Base64-encoded blocks that look like dump payloads (>200 chars of b64)
  /(?:[A-Za-z0-9+/]{60,}\n?){3,}={0,2}/,
  // Windows NTLM hash lines from registry/pwdump output
  /[a-f0-9]{32}:[a-f0-9]{32}/i,
  // Private key PEM blocks
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  // Hex dumps of known credential magic bytes (sqlite3 magic)
  /53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33/i,
];

// ---------------------------------------------------------------------------
// Tool names that this plugin should intercept
// ---------------------------------------------------------------------------

/**
 * Tool names to apply path-based and command-based rules to.
 * Exact match against `toolName` from the before_tool_call event.
 */
export const INTERCEPTED_TOOLS_FILE: readonly string[] = [
  "read",
  "write_file",
  "list_dir",
  "glob",
  "find_files",
  "file_search",
];

export const INTERCEPTED_TOOLS_EXEC: readonly string[] = [
  "bash",
  "run_command",
  "execute_command",
  "shell",
  "terminal",
  "powershell",
];

export const INTERCEPTED_TOOLS_WEB: readonly string[] = [
  "web_fetch",
  "fetch",
  "http_request",
  "browser",
  "web_search",
];
