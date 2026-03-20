/**
 * Hash validation — verifies LINE#HASH references against current file content.
 * Rejects stale edits, suggests corrections.
 */

import { computeLineHash, computeLegacyLineHash } from './hash-computation.js'
import { HASHLINE_REF_REGEX } from './constants.js'
import type { ParsedLineRef, ValidationError } from './types.js'

/** Parse a LINE#HASH reference string */
export function parseLineRef(ref: string): ParsedLineRef | null {
  // Normalize: strip leading markers (>>>, +/-, spaces)
  const cleaned = ref.trim().replace(/^[>+\-\s]+/, '')
  const match = cleaned.match(HASHLINE_REF_REGEX)

  if (!match) return null

  return {
    lineNumber: parseInt(match[1], 10),
    hash: match[2],
  }
}

/** Validate a single line reference against file content */
export function validateLineRef(
  ref: string,
  lines: string[]
): { valid: true; lineIndex: number } | { valid: false; error: ValidationError } {
  const parsed = parseLineRef(ref)

  if (!parsed) {
    return {
      valid: false,
      error: {
        type: 'invalid_ref',
        message: `Invalid line reference format: "${ref}". Expected format: LINE#HASH (e.g., "42#VK")`,
      },
    }
  }

  const { lineNumber, hash } = parsed
  const lineIndex = lineNumber - 1

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return {
      valid: false,
      error: {
        type: 'line_out_of_range',
        message: `Line ${lineNumber} is out of range. File has ${lines.length} lines.`,
        details: { lineNumber },
      },
    }
  }

  const actualHash = computeLineHash(lines[lineIndex], lineNumber)

  if (actualHash === hash) {
    return { valid: true, lineIndex }
  }

  // Try legacy hash for backward compatibility
  const legacyHash = computeLegacyLineHash(lines[lineIndex], lineNumber)
  if (legacyHash === hash) {
    return { valid: true, lineIndex }
  }

  // Hash mismatch — try to find the correct line
  const suggestedRef = findLineByHash(hash, lines)

  return {
    valid: false,
    error: {
      type: 'hash_mismatch',
      message: buildMismatchMessage(lineNumber, hash, actualHash, lines[lineIndex], suggestedRef),
      details: {
        expected: hash,
        actual: actualHash,
        lineNumber,
        suggestedRef: suggestedRef
          ? `${suggestedRef.lineNumber}#${suggestedRef.hash}`
          : undefined,
      },
    },
  }
}

/** Validate all line references in a batch */
export function validateLineRefs(
  refs: string[],
  lines: string[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const ref of refs) {
    if (!ref) continue
    const result = validateLineRef(ref, lines)
    if (!result.valid) {
      errors.push(result.error)
    }
  }

  return errors
}

/** Search for a line that matches the given hash */
function findLineByHash(
  targetHash: string,
  lines: string[]
): { lineNumber: number; hash: string; content: string } | null {
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const hash = computeLineHash(lines[i], lineNumber)
    if (hash === targetHash) {
      return { lineNumber, hash, content: lines[i] }
    }
  }
  return null
}

/** Build a descriptive error message for hash mismatches */
function buildMismatchMessage(
  lineNumber: number,
  expectedHash: string,
  actualHash: string,
  actualContent: string,
  suggested: { lineNumber: number; hash: string; content: string } | null
): string {
  const lines = [
    `Hash mismatch at line ${lineNumber}: expected #${expectedHash}, got #${actualHash}.`,
    `Current content at line ${lineNumber}: "${truncate(actualContent, 80)}"`,
  ]

  if (suggested) {
    lines.push(
      `Did you mean line ${suggested.lineNumber}? Content: "${truncate(suggested.content, 80)}"`,
      `Correct reference: ${suggested.lineNumber}#${suggested.hash}`
    )
  } else {
    lines.push(
      'The file may have been modified since you last read it.',
      'Please re-read the file with hashline_read to get updated references.'
    )
  }

  return lines.join('\n')
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

/** Detect overlapping edit ranges */
export function detectOverlaps(
  ranges: Array<{ start: number; end: number; editIndex: number }>
): ValidationError[] {
  const errors: ValidationError[] = []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end >= sorted[i + 1].start) {
      errors.push({
        type: 'overlap',
        message: `Edits ${sorted[i].editIndex} and ${sorted[i + 1].editIndex} have overlapping ranges: lines ${sorted[i].start + 1}-${sorted[i].end + 1} and ${sorted[i + 1].start + 1}-${sorted[i + 1].end + 1}`,
      })
    }
  }

  return errors
}
