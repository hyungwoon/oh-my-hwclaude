/**
 * Diff utilities — generates unified diffs for edit results.
 */

import { createTwoFilesPatch } from 'diff'

export interface DiffResult {
  diff: string
  additions: number
  deletions: number
}

/**
 * Generate a unified diff between two file contents.
 */
export function generateDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): DiffResult {
  const diff = createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldContent,
    newContent,
    undefined,
    undefined,
    { context: 3 }
  )

  let additions = 0
  let deletions = 0

  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++
    }
  }

  return { diff, additions, deletions }
}

/**
 * Find the first changed line number between old and new content.
 */
export function findFirstChangedLine(
  oldLines: string[],
  newLines: string[]
): number {
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      return i + 1 // 1-based
    }
  }

  return 1
}
