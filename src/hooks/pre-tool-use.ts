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

  // 3. Non-interactive env — block interactive commands in Bash
  if (tool_name === 'Bash') {
    return nonInteractiveGuard(tool_input)
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

const INTERACTIVE_COMMANDS = [
  'vim', 'vi', 'nvim', 'nano', 'emacs', 'pico',
  'less', 'more', 'man',
  'python', 'python3', 'node', 'irb', 'ghci',  // REPLs without args
]

const INTERACTIVE_GIT_PATTERNS = [
  /git\s+add\s+-p/,
  /git\s+add\s+--patch/,
  /git\s+rebase\s+-i/,
  /git\s+rebase\s+--interactive/,
]

function nonInteractiveGuard(input: Record<string, unknown>): HookDecision | null {
  const command = (input.command as string || '').trim()
  if (!command) return null

  // Check for interactive commands
  const firstWord = command.split(/\s+/)[0]
  if (INTERACTIVE_COMMANDS.includes(firstWord)) {
    // Allow python/node with script arguments
    const parts = command.split(/\s+/)
    if (['python', 'python3', 'node'].includes(firstWord) && parts.length > 1 && !parts[1].startsWith('-')) {
      return null
    }
    return {
      decision: 'block',
      reason: `[oh-my-hwclaude] Interactive command blocked: "${firstWord}" requires terminal interaction. Use non-interactive alternatives instead.`,
    }
  }

  // Check for interactive git patterns
  for (const pattern of INTERACTIVE_GIT_PATTERNS) {
    if (pattern.test(command)) {
      return {
        decision: 'block',
        reason: `[oh-my-hwclaude] Interactive git command blocked. Use non-interactive alternatives (e.g., git add specific files instead of -p).`,
      }
    }
  }

  return null
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
