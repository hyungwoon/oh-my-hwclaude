/**
 * Hashline edit executor — main orchestration.
 *
 * Pipeline:
 * 1. Read file → canonicalize (BOM/CRLF)
 * 2. Deduplicate edits
 * 3. Validate all references
 * 4. Apply edits (bottom-up)
 * 5. Detect no-op
 * 6. Write file → decanonicalize
 * 7. Generate diff report
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { canonicalize, decanonicalize } from './canonicalization.js'
import { applyHashlineEdits, deduplicateEdits } from './edit-operations.js'
import { generateDiff, findFirstChangedLine } from './diff-utils.js'
import type { HashlineEdit, EditResult } from './types.js'

export interface ExecuteOptions {
  filePath: string
  edits?: HashlineEdit[]
  deleteFile?: boolean
  renameTo?: string
}

export async function executeHashlineEdit(options: ExecuteOptions): Promise<EditResult> {
  const { filePath, edits, deleteFile, renameTo } = options

  // Validate mutually exclusive operations
  if (deleteFile && renameTo) {
    throw new Error('Cannot both delete and rename a file')
  }
  if (deleteFile && edits && edits.length > 0) {
    throw new Error('Cannot apply edits and delete a file simultaneously')
  }

  const resolvedPath = path.resolve(filePath)

  // Handle delete
  if (deleteFile) {
    await fs.unlink(resolvedPath)
    return {
      success: true,
      filePath: resolvedPath,
      diff: `File deleted: ${resolvedPath}`,
      additions: 0,
      deletions: 0,
      firstChangedLine: 0,
    }
  }

  // Read file
  let rawContent: string
  try {
    rawContent = await fs.readFile(resolvedPath, 'utf-8')
  } catch (err) {
    throw new Error(`Cannot read file: ${resolvedPath}. ${(err as Error).message}`)
  }

  // Handle rename without edits
  if (renameTo && (!edits || edits.length === 0)) {
    const targetPath = path.resolve(path.dirname(resolvedPath), renameTo)
    await fs.rename(resolvedPath, targetPath)
    return {
      success: true,
      filePath: targetPath,
      diff: `File renamed: ${resolvedPath} → ${targetPath}`,
      additions: 0,
      deletions: 0,
      firstChangedLine: 0,
    }
  }

  if (!edits || edits.length === 0) {
    throw new Error('No edits provided')
  }

  // Canonicalize
  const canonical = canonicalize(rawContent)
  const oldContent = canonical.text
  const oldLines = oldContent.split('\n')

  // Deduplicate
  const uniqueEdits = deduplicateEdits(edits)

  // Apply edits
  const result = applyHashlineEdits(oldContent, uniqueEdits)

  if (result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join('\n\n')
    throw new Error(`Edit validation failed:\n${errorMessages}`)
  }

  const newContent = result.lines.join('\n')

  // Detect no-op
  if (newContent === oldContent) {
    throw new Error(
      'No changes detected — the replacement content is identical to the original. ' +
      'Please verify your edits produce actual changes.'
    )
  }

  // Write file (with original encoding restored)
  const outputContent = decanonicalize(newContent, canonical)
  await fs.writeFile(resolvedPath, outputContent, 'utf-8')

  // Handle rename after edit
  if (renameTo) {
    const targetPath = path.resolve(path.dirname(resolvedPath), renameTo)
    await fs.rename(resolvedPath, targetPath)
  }

  // Generate diff
  const diffResult = generateDiff(
    path.basename(filePath),
    oldContent,
    newContent
  )
  const firstChanged = findFirstChangedLine(oldLines, result.lines)

  return {
    success: true,
    filePath: renameTo
      ? path.resolve(path.dirname(resolvedPath), renameTo)
      : resolvedPath,
    diff: diffResult.diff,
    additions: diffResult.additions,
    deletions: diffResult.deletions,
    firstChangedLine: firstChanged,
  }
}
