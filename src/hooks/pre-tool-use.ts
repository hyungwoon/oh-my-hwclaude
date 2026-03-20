/**
 * PreToolUse hooks — intercept tool calls before execution.
 *
 * Hooks:
 * 1. edit-guard: When built-in Edit is used, suggest hashline_edit instead
 * 2. write-guard: When Write is used on existing file, block and suggest hashline_edit
 */

import * as fs from 'node:fs'

interface PreToolUseInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
}

interface HookDecision {
  decision: 'approve' | 'block' | 'ask'
  reason?: string
  message?: string
}

export function handlePreToolUse(input: PreToolUseInput): HookDecision | null {
  const { tool_name, tool_input } = input

  // 1. Edit guard — suggest hashline_edit over built-in Edit
  if (tool_name === 'Edit') {
    return editGuard(tool_input)
  }

  // 2. Write guard — block Write on existing files
  if (tool_name === 'Write') {
    return writeGuard(tool_input)
  }

  return null
}

function editGuard(_input: Record<string, unknown>): HookDecision | null {
  // Don't block — just remind. The user can still approve.
  return {
    decision: 'ask',
    message:
      '[oh-my-hwclaude] Consider using hashline_edit instead of Edit for better accuracy. ' +
      'hashline_edit uses hash-anchored references that prevent stale edits. ' +
      'Use hashline_read first to get LINE#HASH references, then hashline_edit to apply changes.',
  }
}

function writeGuard(input: Record<string, unknown>): HookDecision | null {
  const filePath = input.file_path as string
  if (!filePath) return null

  // Check if file exists
  try {
    fs.accessSync(filePath)
    // File exists — block Write
    return {
      decision: 'block',
      reason:
        '[oh-my-hwclaude] File already exists. Use hashline_read + hashline_edit ' +
        'to modify existing files instead of Write (which overwrites the entire file).',
    }
  } catch {
    // File doesn't exist — allow Write for new files
    return null
  }
}
