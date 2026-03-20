/**
 * High-level edit operations pipeline.
 * Validates, sorts, deduplicates, and applies edits.
 */

import { parseLineRef, validateLineRef, detectOverlaps } from './validation.js'
import {
  applySetLine,
  applyReplaceLines,
  applyInsertAfter,
  applyInsertBefore,
  applyAppend,
  applyPrepend,
} from './edit-primitives.js'
import { normalizeReplacementLines, toLineArray, stripBoundaryEcho } from './normalization.js'
import { autocorrectReplacement } from './autocorrect.js'
import type { HashlineEdit, ValidationError } from './types.js'

interface ApplyResult {
  lines: string[]
  errors: ValidationError[]
}

/**
 * Apply a batch of hashline edits to file content.
 * Edits are validated, sorted bottom-up, and applied in sequence.
 */
export function applyHashlineEdits(
  content: string,
  edits: HashlineEdit[]
): ApplyResult {
  let lines = content.split('\n')
  const allErrors: ValidationError[] = []

  // Collect and validate all line references upfront
  const resolvedEdits = resolveEdits(edits, lines)

  if (resolvedEdits.errors.length > 0) {
    return { lines, errors: resolvedEdits.errors }
  }

  // Check for overlapping ranges
  const overlapErrors = detectOverlaps(resolvedEdits.ranges)
  if (overlapErrors.length > 0) {
    return { lines, errors: overlapErrors }
  }

  // Sort edits bottom-up (descending by start line)
  const sorted = resolvedEdits.resolved.sort((a, b) => b.startIndex - a.startIndex)

  // Apply each edit
  for (const edit of sorted) {
    let replacementLines = toLineArray(edit.edit.lines)

    // Normalize: strip hashline prefixes, diff markers
    replacementLines = normalizeReplacementLines(replacementLines)

    if (edit.edit.op === 'replace') {
      // Strip boundary echo
      replacementLines = stripBoundaryEcho(
        replacementLines,
        lines,
        edit.startIndex,
        edit.endIndex
      )

      // Autocorrect common LLM mistakes
      const originalLines = lines.slice(edit.startIndex, edit.endIndex + 1)
      replacementLines = autocorrectReplacement(replacementLines, originalLines)

      if (edit.startIndex === edit.endIndex && replacementLines.length === 1) {
        lines = applySetLine(lines, edit.startIndex, replacementLines[0])
      } else {
        lines = applyReplaceLines(lines, edit.startIndex, edit.endIndex, replacementLines)
      }
    } else if (edit.edit.op === 'append') {
      if (edit.startIndex === -1) {
        lines = applyAppend(lines, replacementLines)
      } else {
        lines = applyInsertAfter(lines, edit.startIndex, replacementLines)
      }
    } else if (edit.edit.op === 'prepend') {
      if (edit.startIndex === -1) {
        lines = applyPrepend(lines, replacementLines)
      } else {
        lines = applyInsertBefore(lines, edit.startIndex, replacementLines)
      }
    }
  }

  return { lines, errors: allErrors }
}

interface ResolvedEdit {
  edit: HashlineEdit
  startIndex: number
  endIndex: number
  editIndex: number
}

interface ResolvedResult {
  resolved: ResolvedEdit[]
  ranges: Array<{ start: number; end: number; editIndex: number }>
  errors: ValidationError[]
}

function resolveEdits(edits: HashlineEdit[], lines: string[]): ResolvedResult {
  const resolved: ResolvedEdit[] = []
  const ranges: Array<{ start: number; end: number; editIndex: number }> = []
  const errors: ValidationError[] = []

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]

    if (edit.op === 'replace') {
      // Replace requires pos
      const startResult = validateLineRef(edit.pos, lines)
      if (!startResult.valid) {
        errors.push(startResult.error)
        continue
      }

      let endIndex = startResult.lineIndex
      if (edit.end) {
        const endResult = validateLineRef(edit.end, lines)
        if (!endResult.valid) {
          errors.push(endResult.error)
          continue
        }
        endIndex = endResult.lineIndex
      }

      if (endIndex < startResult.lineIndex) {
        errors.push({
          type: 'invalid_ref',
          message: `End reference must be after start reference in edit ${i}`,
        })
        continue
      }

      resolved.push({ edit, startIndex: startResult.lineIndex, endIndex, editIndex: i })
      ranges.push({ start: startResult.lineIndex, end: endIndex, editIndex: i })
    } else {
      // Append/Prepend — pos is optional
      let startIndex = -1
      if (edit.pos) {
        const result = validateLineRef(edit.pos, lines)
        if (!result.valid) {
          errors.push(result.error)
          continue
        }
        startIndex = result.lineIndex
      }

      resolved.push({ edit, startIndex, endIndex: startIndex, editIndex: i })
    }
  }

  return { resolved, ranges, errors }
}

/**
 * Deduplicate edits — remove exact duplicates based on canonical key.
 */
export function deduplicateEdits(edits: HashlineEdit[]): HashlineEdit[] {
  const seen = new Set<string>()
  const unique: HashlineEdit[] = []

  for (const edit of edits) {
    const key = canonicalEditKey(edit)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(edit)
    }
  }

  return unique
}

function canonicalEditKey(edit: HashlineEdit): string {
  const lines = Array.isArray(edit.lines) ? edit.lines.join('\n') : edit.lines
  if (edit.op === 'replace') {
    return `replace:${edit.pos}:${edit.end || ''}:${lines}`
  }
  return `${edit.op}:${edit.pos || ''}:${lines}`
}
