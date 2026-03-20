/**
 * Hashline Read — enhanced file reader with hash annotations.
 *
 * Reads a file and returns each line annotated with LINE#HASH format:
 *   42#VK|  function hello() {
 *
 * These hash tags are used by hashline_edit to reference positions.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { formatHashLines } from '../hashline-edit/index.js'

export interface ReadOptions {
  filePath: string
  offset?: number
  limit?: number
}

export interface ReadResult {
  content: string
  totalLines: number
  startLine: number
  endLine: number
  filePath: string
}

const DEFAULT_LIMIT = 2000

export async function hashlineRead(options: ReadOptions): Promise<ReadResult> {
  const { filePath, offset = 0, limit = DEFAULT_LIMIT } = options
  const resolvedPath = path.resolve(filePath)

  let rawContent: string
  try {
    rawContent = await fs.readFile(resolvedPath, 'utf-8')
  } catch (err) {
    throw new Error(`Cannot read file: ${resolvedPath}. ${(err as Error).message}`)
  }

  const allLines = rawContent.split('\n')
  const totalLines = allLines.length

  // Apply offset and limit
  const startLine = Math.max(1, offset + 1)
  const startIndex = startLine - 1
  const endIndex = Math.min(startIndex + limit, totalLines)
  const selectedLines = allLines.slice(startIndex, endIndex)

  // Format with hash annotations
  const annotatedLines = formatHashLines(selectedLines, startLine)
  const content = annotatedLines.join('\n')

  return {
    content,
    totalLines,
    startLine,
    endLine: startIndex + selectedLines.length,
    filePath: resolvedPath,
  }
}

/**
 * List directory contents with basic info.
 */
export async function hashlineListDir(dirPath: string): Promise<string> {
  const resolvedPath = path.resolve(dirPath)
  const entries = await fs.readdir(resolvedPath, { withFileTypes: true })

  const lines = entries.map(entry => {
    const type = entry.isDirectory() ? '[DIR]' : '[FILE]'
    return `${type} ${entry.name}`
  })

  return lines.join('\n')
}
