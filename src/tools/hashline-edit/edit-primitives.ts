/**
 * Low-level edit primitives.
 * All operations work on a mutable lines array and return the modified array.
 * The caller is responsible for sorting edits bottom-up to avoid index shifts.
 */

/** Replace a single line */
export function applySetLine(
  lines: string[],
  lineIndex: number,
  newContent: string
): string[] {
  const result = [...lines]
  result[lineIndex] = newContent
  return result
}

/** Replace a range of lines (startIndex..endIndex inclusive) */
export function applyReplaceLines(
  lines: string[],
  startIndex: number,
  endIndex: number,
  newLines: string[]
): string[] {
  const result = [...lines]
  result.splice(startIndex, endIndex - startIndex + 1, ...newLines)
  return result
}

/** Insert lines after a given index */
export function applyInsertAfter(
  lines: string[],
  afterIndex: number,
  newLines: string[]
): string[] {
  const result = [...lines]
  result.splice(afterIndex + 1, 0, ...newLines)
  return result
}

/** Insert lines before a given index */
export function applyInsertBefore(
  lines: string[],
  beforeIndex: number,
  newLines: string[]
): string[] {
  const result = [...lines]
  result.splice(beforeIndex, 0, ...newLines)
  return result
}

/** Append lines at end of file */
export function applyAppend(
  lines: string[],
  newLines: string[]
): string[] {
  return [...lines, ...newLines]
}

/** Prepend lines at start of file */
export function applyPrepend(
  lines: string[],
  newLines: string[]
): string[] {
  return [...newLines, ...lines]
}
