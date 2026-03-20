/**
 * Autocorrect pipeline for LLM-generated replacement text.
 * Compensates for common mistakes:
 * 1. Single-line merge: LLM merges multiple original lines into one
 * 2. Wrapped lines: LLM wraps a single line across multiple
 * 3. Lost indentation: LLM drops leading whitespace
 */

/**
 * Detect and fix single-line merge.
 * If LLM returns 1 line replacing N lines, and the single line
 * contains content from multiple originals concatenated, re-split.
 */
export function fixMergedLines(
  replacementLines: string[],
  originalLines: string[]
): string[] {
  if (replacementLines.length !== 1 || originalLines.length <= 1) {
    return replacementLines
  }

  const merged = replacementLines[0]

  // Check if the single replacement contains all original lines' content
  const trimmedOriginals = originalLines.map(l => l.trim()).filter(l => l.length > 0)
  if (trimmedOriginals.length <= 1) return replacementLines

  // Check if merged line contains all original trimmed content
  let remaining = merged
  const allFound = trimmedOriginals.every(orig => {
    const idx = remaining.indexOf(orig)
    if (idx >= 0) {
      remaining = remaining.slice(idx + orig.length)
      return true
    }
    return false
  })

  if (!allFound) return replacementLines

  // Re-split preserving original indentation
  return originalLines.map((original, i) => {
    const indent = original.match(/^(\s*)/)?.[1] || ''
    const trimmed = original.trim()

    // Find the corresponding content in the merged line
    const mergedIdx = merged.indexOf(trimmed)
    if (mergedIdx >= 0) {
      // Look for replacement content at the same position
      return indent + trimmed
    }
    return original
  })
}

/**
 * Detect and fix wrapped lines.
 * If LLM returns N lines replacing 1 line, and the N lines
 * when joined produce the original content, re-join.
 */
export function fixWrappedLines(
  replacementLines: string[],
  originalLines: string[]
): string[] {
  if (replacementLines.length <= 1 || originalLines.length !== 1) {
    return replacementLines
  }

  const originalTrimmed = originalLines[0].trim()
  const joinedReplacement = replacementLines.map(l => l.trim()).join(' ')

  if (joinedReplacement === originalTrimmed) {
    // LLM just wrapped the same content — keep original
    return originalLines
  }

  return replacementLines
}

/**
 * Restore lost indentation.
 * If replacement lines lost leading whitespace that exists in originals,
 * restore the indentation from the first original line.
 */
export function restoreIndentation(
  replacementLines: string[],
  originalLines: string[]
): string[] {
  if (replacementLines.length === 0 || originalLines.length === 0) {
    return replacementLines
  }

  // Detect original indentation from first non-empty line
  const firstOriginal = originalLines.find(l => l.trim().length > 0) || originalLines[0]
  const originalIndent = firstOriginal.match(/^(\s*)/)?.[1] || ''

  if (originalIndent.length === 0) return replacementLines

  // Check if replacement lines are missing indentation
  const firstReplacement = replacementLines.find(l => l.trim().length > 0) || replacementLines[0]
  const replacementIndent = firstReplacement.match(/^(\s*)/)?.[1] || ''

  if (replacementIndent.length >= originalIndent.length) {
    return replacementLines
  }

  // All replacement lines have less indent — restore
  const indentDiff = originalIndent.length - replacementIndent.length
  const padding = originalIndent.slice(0, indentDiff)

  return replacementLines.map(line => {
    if (line.trim().length === 0) return line // Keep empty lines as-is
    return padding + line
  })
}

/**
 * Run the full autocorrect pipeline on replacement lines.
 */
export function autocorrectReplacement(
  replacementLines: string[],
  originalLines: string[]
): string[] {
  let result = replacementLines

  result = fixMergedLines(result, originalLines)
  result = fixWrappedLines(result, originalLines)
  result = restoreIndentation(result, originalLines)

  return result
}
