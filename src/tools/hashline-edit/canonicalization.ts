/**
 * File text canonicalization — BOM and line ending handling.
 * Normalizes to LF for editing, then restores original format on write.
 */

export interface CanonicalizedText {
  /** Text with LF line endings, BOM stripped */
  text: string
  /** Whether the original had a BOM */
  hasBom: boolean
  /** Original line ending style */
  lineEnding: 'lf' | 'crlf' | 'mixed'
}

const BOM = '\uFEFF'

/** Detect the dominant line ending in text */
function detectLineEnding(text: string): 'lf' | 'crlf' | 'mixed' {
  const crlfCount = (text.match(/\r\n/g) || []).length
  const lfCount = (text.match(/(?<!\r)\n/g) || []).length

  if (crlfCount > 0 && lfCount > 0) return 'mixed'
  if (crlfCount > 0) return 'crlf'
  return 'lf'
}

/** Strip BOM and normalize line endings to LF */
export function canonicalize(raw: string): CanonicalizedText {
  const hasBom = raw.startsWith(BOM)
  const stripped = hasBom ? raw.slice(1) : raw
  const lineEnding = detectLineEnding(stripped)
  const text = stripped.replace(/\r\n/g, '\n')

  return { text, hasBom, lineEnding }
}

/** Restore original BOM and line endings */
export function decanonicalize(text: string, meta: Pick<CanonicalizedText, 'hasBom' | 'lineEnding'>): string {
  let result = text

  if (meta.lineEnding === 'crlf') {
    result = result.replace(/\n/g, '\r\n')
  }

  if (meta.hasBom) {
    result = BOM + result
  }

  return result
}
