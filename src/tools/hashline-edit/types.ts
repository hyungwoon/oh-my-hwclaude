/**
 * Hashline edit operation types.
 *
 * Three operations, all reference positions via LINE#HASH format:
 * - replace: Replace line(s) at pos (optionally through end)
 * - append: Insert after pos (or at end of file if pos omitted)
 * - prepend: Insert before pos (or at start of file if pos omitted)
 */

export interface ReplaceEdit {
  op: 'replace'
  /** Line reference in LINE#HASH format (e.g., "42#VK") */
  pos: string
  /** Optional end of range in LINE#HASH format */
  end?: string
  /** Replacement content — single string or array of lines */
  lines: string | string[]
}

export interface AppendEdit {
  op: 'append'
  /** Line to insert after. If omitted, appends to end of file */
  pos?: string
  /** Content to insert */
  lines: string | string[]
}

export interface PrependEdit {
  op: 'prepend'
  /** Line to insert before. If omitted, prepends to start of file */
  pos?: string
  /** Content to insert */
  lines: string | string[]
}

export type HashlineEdit = ReplaceEdit | AppendEdit | PrependEdit

export interface ParsedLineRef {
  lineNumber: number
  hash: string
}

export interface EditResult {
  success: boolean
  filePath: string
  diff: string
  additions: number
  deletions: number
  firstChangedLine: number
}

export interface ValidationError {
  type: 'hash_mismatch' | 'line_out_of_range' | 'invalid_ref' | 'overlap'
  message: string
  details?: {
    expected?: string
    actual?: string
    lineNumber?: number
    suggestedRef?: string
  }
}
