/**
 * Utilities for evidence extraction, 1-based line/column calculation, and credential redaction.
 */

/**
 * Computes 1-based line number and 1-based column number from character offset.
 * @param {string} content - Full file text
 * @param {number} offset - Match character offset
 * @returns {{ line: number|null, column: number|null }}
 */
function getLineAndColumn(content, offset) {
    if (typeof content !== 'string' || typeof offset !== 'number' || offset < 0 || offset > content.length) {
        return { line: null, column: null };
    }
    let line = 1;
    let lastLineBreak = -1;
    for (let i = 0; i < offset; i++) {
        if (content[i] === '\n') {
            line++;
            lastLineBreak = i;
        }
    }
    const column = offset - lastLineBreak;
    return { line, column };
}

/**
 * Extracts a single trimmed line snippet surrounding the match offset.
 * @param {string} content - Full file text
 * @param {number} offset - Match offset
 * @returns {string}
 */
function getEvidenceSnippet(content, offset) {
    if (typeof content !== 'string' || typeof offset !== 'number' || offset < 0) {
        return '';
    }
    const lineStart = content.lastIndexOf('\n', offset) + 1;
    let lineEnd = content.indexOf('\n', offset);
    if (lineEnd === -1) lineEnd = content.length;

    let lineText = content.substring(lineStart, lineEnd).trim();
    if (lineText.length > 200) {
        lineText = lineText.substring(0, 197) + '...';
    }
    return lineText;
}

/**
 * Centralized credential/secret redaction for evidence strings.
 * Replaces hardcoded secrets, keys, tokens, and passwords with [REDACTED].
 * @param {string} text - Raw evidence string
 * @returns {string} Redacted evidence string
 */
const REDACTION_PATTERNS = [
    // OpenAI API keys
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: "sk-[REDACTED]" },
    // AWS Access Key ID
    { pattern: /AKIA[0-9A-Z]{16}/g, replacement: "AKIA[REDACTED]" },
    // AWS Secret Access Key or token assignments
    { pattern: /(aws_secret_access_key|secret_key|private_key|api_key|token|password|auth|jwt|bearer)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi,
      replacement: "$1 = \"[REDACTED]\"" },
    // Standard Bearer tokens
    { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{16,}/gi, replacement: "Bearer [REDACTED]" },
    // JWT Tokens (3 base64url parts)
    { pattern: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, replacement: "eyJ[REDACTED]" },
    // Private Key Blocks
    { pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g, replacement: "-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END PRIVATE KEY-----" },
    { pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g, replacement: "-----BEGIN PRIVATE KEY----- [REDACTED]" },
    // MongoDB Credentials in connection string
    { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g, replacement: "mongodb$1://[REDACTED]:[REDACTED]@" },
    // Generic key / password value strings
    { pattern: /(['"`]?)(api[-_]?key|secret|password|passwd|auth[-_]?token|access[-_]?token)(['"`]?)\s*[:=]\s*(['"`])[^'"`]{8,}\4/gi,
      replacement: "$1$2$3: $4[REDACTED]$4" }
];

function redactEvidence(text) {
    if (typeof text !== 'string' || !text) return '';
    let redacted = text;
    for (const item of REDACTION_PATTERNS) {
        redacted = redacted.replace(item.pattern, item.replacement);
    }
    return redacted;
}

/**
 * Replaces characters inside JS/TS single-line (//) and multi-line (/* *\/) comments
 * with spaces while preserving newline characters (\n) so character offsets,
 * line numbers, and column numbers match the original content 1-to-1.
 * Ignores slashes inside string literals ("...", '...', `...`).
 *
 * @param {string} code - Source code string
 * @returns {string} Masked source code string
 */
function maskComments(code) {
    if (typeof code !== 'string' || !code) return '';

    const buf = code.split('');
    const len = buf.length;

    let i = 0;
    let inString = false;
    let stringQuote = null;

    while (i < len) {
        const char = buf[i];
        const next = buf[i + 1];

        if (inString) {
            if (char === '\\') {
                i += 2;
                continue;
            }
            if (char === stringQuote) {
                inString = false;
                stringQuote = null;
            }
            i++;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringQuote = char;
            i++;
            continue;
        }

        if (char === '/' && next === '/') {
            buf[i] = ' ';
            buf[i + 1] = ' ';
            i += 2;
            while (i < len && buf[i] !== '\n' && buf[i] !== '\r') {
                buf[i] = ' ';
                i++;
            }
            continue;
        }

        if (char === '/' && next === '*') {
            buf[i] = ' ';
            buf[i + 1] = ' ';
            i += 2;
            while (i < len) {
                if (buf[i] === '*' && buf[i + 1] === '/') {
                    buf[i] = ' ';
                    buf[i + 1] = ' ';
                    i += 2;
                    break;
                }
                if (buf[i] !== '\n' && buf[i] !== '\r') {
                    buf[i] = ' ';
                }
                i++;
            }
            continue;
        }

        i++;
    }

    return buf.join('');
}

module.exports = {
    getLineAndColumn,
    getEvidenceSnippet,
    redactEvidence,
    maskComments
};
