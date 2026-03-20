/**
 * Text normalization for edit content.
 * Handles common LLM mistakes in replacement text:
 * - Including hashline prefixes in replacement content
 * - Including diff markers (+/-) in replacement
 * - Echoing boundary lines (surrounding context)
 */

import { HASHLINE_PREFIX_REGEX } from './constants.js'

/**
 * Normalize replacement lines — strip hashline prefixes and diff markers.
 * Only strips if a majority of lines have the pattern (>50%).
 */
export function normalizeReplacementLines(lines: string[]): string[] {
  if (lines.length === 0) return lines

  // Check for hashline prefix contamination
  const hashlineCount = lines.filter(l => HASHLINE_PREFIX_REGEX.test(l)).length
  if (hashlineCount > lines.length * 0.5) {
    return lines.map(line => {
      const match = line.match(HASHLINE_PREFIX_REGEX)
      return match ? line.slice(match[0].length) : line
    })
  }

  // Check for diff marker contamination (all lines start with +)
  const plusCount = lines.filter(l => l.startsWith('+')).length
  if (plusCount === lines.length && lines.length > 1) {
    return lines.map(l => l.slice(1))
  }

  return lines
}

/**
 * Convert lines input to array.
 * Handles string (split by newline) and string[] inputs.
 */
export function toLineArray(input: string | string[]): string[] {
  if (Array.isArray(input)) return input
  return input.split('\n')
}

/**
 * Strip boundary echo lines.
 * When LLM includes surrounding context in replacement, detect and remove.
 * Only strips if first/last line exactly matches the line before/after the edit range.
 */
export function stripBoundaryEcho(
  replacementLines: string[],
  originalLines: string[],
  startIndex: number,
  endIndex: number
): string[] {
  if (replacementLines.length <= 1) return replacementLines

  let result = [...replacementLines]

  // Check if first replacement line matches the line BEFORE the edit range
  if (startIndex > 0) {
    const lineBefore = originalLines[startIndex - 1]
    if (result[0].trim() === lineBefore.trim() && result.length > 1) {
      result = result.slice(1)
    }
  }

  // Check if last replacement line matches the line AFTER the edit range
  if (endIndex < originalLines.length - 1) {
    const lineAfter = originalLines[endIndex + 1]
    if (result[result.length - 1].trim() === lineAfter.trim() && result.length > 1) {
      result = result.slice(0, -1)
    }
  }

  return result
}
