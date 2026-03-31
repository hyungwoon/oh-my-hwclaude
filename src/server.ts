#!/usr/bin/env node
/**
 * oh-my-hwclaude MCP Server
 *
 * Provides hashline-based file editing tools for Claude Code.
 * Runs as a stdio MCP server registered in Claude Code settings.
 *
 * Tools:
 * - hashline_read: Read file with LINE#HASH annotations
 * - hashline_edit: Edit file using LINE#HASH references
 * - hashline_write: Create new file (tracked for consistency)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { hashlineRead } from './tools/hashline-read/index.js'
import { executeHashlineEdit } from './tools/hashline-edit/index.js'
import type { HashlineEdit } from './tools/hashline-edit/types.js'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const server = new McpServer({
  name: 'oh-my-hwclaude',
  version: '0.1.0',
})

// ─── hashline_read ───────────────────────────────────────────

server.registerTool(
  'hashline_read',
  {
    description: `Read a file with hash-annotated line references.

Each line is returned in the format: LINE#HASH|content
Example: 42#VK|  function hello() {

Use these LINE#HASH references with hashline_edit to make precise edits.
The hash verifies the line content hasn't changed since you read it.

IMPORTANT: Always use hashline_read instead of the built-in Read tool
when you plan to edit the file afterward.`,
    inputSchema: {
      file_path: z.string().describe('Absolute path to the file to read'),
      offset: z.number().optional().describe('Line offset (0-based). Default: 0'),
      limit: z.number().optional().describe('Max lines to read. Default: 2000'),
    },
    _meta: {
      'anthropic/alwaysLoad': true,
      'anthropic/searchHint': 'hash-anchored file reading with line references',
    },
  },
  async ({ file_path, offset, limit }) => {
    try {
      const result = await hashlineRead({ filePath: file_path, offset, limit })

      const header = `File: ${result.filePath} (${result.totalLines} lines total, showing ${result.startLine}-${result.endLine})`
      const body = result.content

      return {
        content: [{ type: 'text' as const, text: `${header}\n\n${body}` }],
      }
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      }
    }
  }
)

// ─── hashline_edit ───────────────────────────────────────────

const editSchema = z.object({
  op: z.enum(['replace', 'append', 'prepend']).describe(
    'Operation type: replace (swap lines), append (insert after), prepend (insert before)'
  ),
  pos: z.string().optional().describe(
    'Line reference in LINE#HASH format (e.g., "42#VK"). Required for replace, optional for append/prepend.'
  ),
  end: z.string().optional().describe(
    'End of range for replace (LINE#HASH format). If omitted, replaces single line at pos.'
  ),
  lines: z.union([z.string(), z.array(z.string())]).describe(
    'Replacement content — single string or array of lines'
  ),
})

server.registerTool(
  'hashline_edit',
  {
    description: `Edit a file using hash-anchored line references.

WORKFLOW:
1. First read the file with hashline_read to get LINE#HASH references
2. Then use those references to make edits

OPERATIONS:
- replace: Replace line(s) at pos (optionally through end)
  { op: "replace", pos: "42#VK", lines: "new content" }
  { op: "replace", pos: "42#VK", end: "45#MB", lines: ["line1", "line2"] }

- append: Insert after pos (or at end of file if pos omitted)
  { op: "append", pos: "42#VK", lines: ["new line 1", "new line 2"] }
  { op: "append", lines: "appended to end" }

- prepend: Insert before pos (or at start of file if pos omitted)
  { op: "prepend", pos: "1#ZZ", lines: "inserted before line 1" }

ADVANTAGES over string-matching Edit:
- No need to reproduce exact whitespace/content
- Hash verification prevents stale edits
- Auto-corrects common LLM mistakes (lost indent, merged lines)
- Multiple edits in a single call

IMPORTANT: Always use hashline_read first to get fresh LINE#HASH references.`,
    inputSchema: {
      file_path: z.string().describe('Absolute path to the file to edit'),
      edits: z.array(editSchema).optional().describe('Array of edit operations'),
      delete: z.boolean().optional().describe('Delete the file instead of editing'),
      rename: z.string().optional().describe('Rename the file (new filename, not full path)'),
    },
    _meta: {
      'anthropic/alwaysLoad': true,
      'anthropic/searchHint': 'hash-anchored line-level file editing with stale-edit prevention',
    },
  },
  async ({ file_path, edits, delete: deleteFile, rename }) => {
    try {
      const result = await executeHashlineEdit({
        filePath: file_path,
        edits: edits as HashlineEdit[] | undefined,
        deleteFile,
        renameTo: rename,
      })

      const summary = [
        `✓ ${result.filePath}`,
        `  +${result.additions} -${result.deletions} (first change: line ${result.firstChangedLine})`,
      ]

      return {
        content: [
          { type: 'text' as const, text: summary.join('\n') },
          { type: 'text' as const, text: `\n\n${result.diff}` },
        ],
      }
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      }
    }
  }
)

// ─── hashline_write ──────────────────────────────────────────

server.registerTool(
  'hashline_write',
  {
    description: `Create a new file. Use this only for NEW files — for existing files, use hashline_edit.

This tool will REFUSE to overwrite an existing file. If the file exists,
use hashline_read + hashline_edit instead.`,
    inputSchema: {
      file_path: z.string().describe('Absolute path for the new file'),
      content: z.string().describe('File content to write'),
    },
    _meta: {
      'anthropic/alwaysLoad': true,
      'anthropic/searchHint': 'create new files with hash tracking',
    },
  },
  async ({ file_path, content }) => {
    try {
      const resolvedPath = path.resolve(file_path)

      // Check if file exists
      try {
        await fs.access(resolvedPath)
        return {
          content: [{
            type: 'text' as const,
            text: `Error: File already exists: ${resolvedPath}\nUse hashline_read + hashline_edit to modify existing files.`,
          }],
          isError: true,
        }
      } catch {
        // File doesn't exist — good, proceed
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true })

      // Write file
      await fs.writeFile(resolvedPath, content, 'utf-8')

      const lineCount = content.split('\n').length

      return {
        content: [{
          type: 'text' as const,
          text: `✓ Created ${resolvedPath} (${lineCount} lines)`,
        }],
      }
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      }
    }
  }
)

// ─── Start server ────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('Failed to start oh-my-hwclaude MCP server:', err)
  process.exit(1)
})
