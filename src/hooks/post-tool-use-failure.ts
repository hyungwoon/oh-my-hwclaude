/**
 * PostToolUseFailure hook — handle tool execution failures with recovery guidance.
 *
 * Provides targeted recovery instructions based on the tool that failed
 * and the type of error encountered.
 */

import type { PostToolUseFailureInput, HookResponse } from './types.js'

export function handlePostToolUseFailure(input: PostToolUseFailureInput): HookResponse | null {
  const { tool_name, error } = input

  if (tool_name === 'hashline_edit') {
    return hashlineEditFailure(error)
  }

  if (tool_name === 'Edit') {
    return editFailure(error)
  }

  if (tool_name === 'Write') {
    return writeFailure(error)
  }

  return generalFailure(tool_name, error)
}

function hashlineEditFailure(error: string): HookResponse {
  const isHashMismatch = /hash mismatch/i.test(error)

  const guidance = isHashMismatch
    ? '[oh-my-hwclaude] hashline_edit FAILED: Hash mismatch — the file changed since your last hashline_read.\n' +
      'ACTION REQUIRED:\n' +
      '1. Run hashline_read on the file to get fresh LINE#HASH references\n' +
      '2. Identify the correct lines with updated hashes\n' +
      '3. Retry hashline_edit with the new references\n' +
      'DO NOT reuse stale LINE#HASH references.'
    : '[oh-my-hwclaude] hashline_edit FAILED.\n' +
      'ACTION REQUIRED:\n' +
      '1. Run hashline_read to refresh LINE#HASH references\n' +
      '2. Verify your edit parameters (op, pos, end, lines)\n' +
      '3. Retry with corrected parameters'

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: guidance,
    },
  }
}

function editFailure(error: string): HookResponse {
  const guidance =
    '[oh-my-hwclaude] Edit FAILED.\n' +
    'RECOMMENDATION: Use hashline_read + hashline_edit instead of Edit.\n' +
    'hashline_edit uses hash-anchored line references that prevent stale edits.\n' +
    'Workflow: hashline_read → identify LINE#HASH → hashline_edit with precise references.'

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: guidance,
    },
  }
}

function writeFailure(error: string): HookResponse {
  const isExistingFile = /already exists/i.test(error) || /overwrite/i.test(error)

  const guidance = isExistingFile
    ? '[oh-my-hwclaude] Write FAILED: File already exists.\n' +
      'Use hashline_read + hashline_edit to modify existing files.\n' +
      'Write should only be used for creating new files.'
    : '[oh-my-hwclaude] Write FAILED.\n' +
      'Check file path and permissions, then retry.'

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: guidance,
    },
  }
}

function generalFailure(toolName: string, error: string): HookResponse | null {
  if (!error) return null

  const guidance =
    `[oh-my-hwclaude] ${toolName} FAILED.\n` +
    'ACTION REQUIRED:\n' +
    '1. Analyze the error message above\n' +
    '2. Check input parameters for correctness\n' +
    '3. Retry with corrected parameters'

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: guidance,
    },
  }
}
