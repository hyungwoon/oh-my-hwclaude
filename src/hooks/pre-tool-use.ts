/**
 * PreToolUse hooks — intercept tool calls before execution.
 *
 * Hooks:
 * 1. edit-guard: When built-in Edit is used, suggest hashline_edit instead
 *    - With HWCLAUDE_AUTO_REDIRECT=1, transparently redirects via updatedInput
 * 2. write-guard: When Write is used on existing file, block and suggest hashline_edit
 * 3. non-interactive guard: Block interactive commands in Bash
 */

import * as fs from 'node:fs'
import type { PreToolUseInput, HookResponse } from './types.js'
import { logMistake } from './mistake-logger.js'

export function handlePreToolUse(input: PreToolUseInput): HookResponse | null {
  const { tool_name, tool_input, session_id } = input

  // 1. Edit guard — suggest hashline_edit over built-in Edit
  if (tool_name === 'Edit') {
    return editGuard(tool_input)
  }

  // 2. Write guard — block Write on existing files
  if (tool_name === 'Write') {
    return writeGuard(tool_input, session_id)
  }

  // 3. Non-interactive env — block interactive commands in Bash
  if (tool_name === 'Bash') {
    return nonInteractiveGuard(tool_input, session_id)
  }

  return null
}

const EDIT_GUARD_CONTEXT =
  '[oh-my-hwclaude] Consider using hashline_edit instead of Edit for better accuracy. ' +
  'hashline_edit uses hash-anchored references that prevent stale edits. ' +
  'Use hashline_read first to get LINE#HASH references, then hashline_edit to apply changes.'

function editGuard(input: Record<string, unknown>): HookResponse | null {
  // When auto-redirect is enabled, approve with updatedInput hint
  if (process.env.HWCLAUDE_AUTO_REDIRECT === '1') {
    return {
      decision: 'approve',
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        updatedInput: { ...input, _redirected_from: 'Edit' },
        additionalContext:
          '[oh-my-hwclaude] Edit → hashline_edit auto-redirect active. ' +
          'Use hashline_read to get LINE#HASH references, then hashline_edit to apply changes.',
      },
    }
  }

  // Default: ask with additionalContext guidance
  return {
    decision: 'ask',
    message: EDIT_GUARD_CONTEXT,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: EDIT_GUARD_CONTEXT,
    },
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

function nonInteractiveGuard(input: Record<string, unknown>, sessionId?: string): HookResponse | null {
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
    const reason = `[oh-my-hwclaude] Interactive command blocked: "${firstWord}" requires terminal interaction. Use non-interactive alternatives instead.`
    logMistake({
      ts: new Date().toISOString(),
      category: 'interactive-block',
      detail: command.slice(0, 200),
      session_id: sessionId,
    })
    return {
      decision: 'block',
      reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: reason,
      },
    }
  }

  // Check for interactive git patterns
  for (const pattern of INTERACTIVE_GIT_PATTERNS) {
    if (pattern.test(command)) {
      const reason = '[oh-my-hwclaude] Interactive git command blocked. Use non-interactive alternatives (e.g., git add specific files instead of -p).'
      logMistake({
        ts: new Date().toISOString(),
        category: 'interactive-block',
        detail: command.slice(0, 200),
        session_id: sessionId,
      })
      return {
        decision: 'block',
        reason,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: reason,
        },
      }
    }
  }

  return null
}

function writeGuard(input: Record<string, unknown>, sessionId?: string): HookResponse | null {
  const filePath = input.file_path as string
  if (!filePath) return null

  // Check if file exists
  try {
    fs.accessSync(filePath)
    // File exists — block Write
    const reason =
      '[oh-my-hwclaude] File already exists. Use hashline_read + hashline_edit ' +
      'to modify existing files instead of Write (which overwrites the entire file).'
    logMistake({
      ts: new Date().toISOString(),
      category: 'write-guard',
      detail: `Write attempted on existing file: ${filePath}`,
      file: filePath,
      session_id: sessionId,
    })
    return {
      decision: 'block',
      reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: reason,
      },
    }
  } catch {
    // File doesn't exist — allow Write for new files
    return null
  }
}
