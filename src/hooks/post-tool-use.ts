/**
 * PostToolUse hooks — process tool output after execution.
 *
 * Hooks:
 * 1. edit-error-recovery: When Edit/hashline_edit fails, inject recovery instructions
 * 2. json-error-recovery: When JSON parse errors occur, inject fix guidance
 * 3. comment-checker: Detect AI placeholder comments after successful edits
 */

import type { PostToolUseInput, HookResponse } from './types.js'

export function handlePostToolUse(input: PostToolUseInput): HookResponse | null {
  const { tool_name, tool_input, tool_output } = input

  // 1. Edit error recovery
  if (isEditTool(tool_name) && isEditError(tool_output)) {
    return editErrorRecovery(tool_output)
  }

  // 2. JSON error recovery
  if (isJsonError(tool_output)) {
    return jsonErrorRecovery()
  }

  // 3. Comment checker — detect AI placeholder comments after successful edits
  if (isEditTool(tool_name) && !isEditError(tool_output)) {
    return commentChecker(tool_input, tool_output)
  }

  return null
}

function isEditTool(name: string): boolean {
  return ['Edit', 'hashline_edit', 'Write'].includes(name)
}

function isEditError(output: string): boolean {
  const errorPatterns = [
    'old_string.*not found',
    'oldString.*not found',
    'is not unique',
    'Hash mismatch',
    'Edit validation failed',
    'No changes detected',
    'Cannot read file',
  ]
  return errorPatterns.some(pattern => new RegExp(pattern, 'i').test(output))
}

function isJsonError(output: string): boolean {
  const patterns = [
    'JSON parse error',
    'Unexpected token',
    'SyntaxError.*JSON',
    'invalid JSON',
  ]
  return patterns.some(pattern => new RegExp(pattern, 'i').test(output))
}

function editErrorRecovery(output: string): HookResponse {
  const isHashMismatch = /hash mismatch/i.test(output)
  const isNotFound = /not found/i.test(output)
  const isNoChange = /no changes detected/i.test(output)

  let guidance: string

  if (isHashMismatch) {
    guidance =
      '[oh-my-hwclaude] EDIT RECOVERY: Hash mismatch detected — the file has changed since you last read it.\n' +
      'ACTION REQUIRED:\n' +
      '1. Re-read the file with hashline_read to get updated LINE#HASH references\n' +
      '2. Identify the correct lines using the new references\n' +
      '3. Retry the edit with updated references\n' +
      'DO NOT guess or reuse stale references.'
  } else if (isNotFound) {
    guidance =
      '[oh-my-hwclaude] EDIT RECOVERY: old_string not found in the file.\n' +
      'ACTION REQUIRED:\n' +
      '1. Re-read the file to see its current content\n' +
      '2. Use hashline_read for precise LINE#HASH references\n' +
      '3. Match the exact content including whitespace\n' +
      '4. If using hashline_edit, verify your LINE#HASH references are current'
  } else if (isNoChange) {
    guidance =
      '[oh-my-hwclaude] EDIT RECOVERY: Your edit produced no changes — replacement is identical to original.\n' +
      'ACTION REQUIRED:\n' +
      '1. Re-read the file to confirm current content\n' +
      '2. Ensure your replacement text is actually different\n' +
      '3. Check you are editing the correct lines'
  } else {
    guidance =
      '[oh-my-hwclaude] EDIT RECOVERY: Edit failed.\n' +
      'ACTION REQUIRED:\n' +
      '1. Re-read the file with hashline_read\n' +
      '2. Analyze the error message above\n' +
      '3. Retry with corrected parameters'
  }

  return {
    decision: 'block',
    reason: guidance,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: guidance,
    },
  }
}

const AI_COMMENT_PATTERNS = [
  /\/\/\s*TODO:\s*implement/i,
  /\/\/\s*TODO:\s*add\s+your/i,
  /\/\/\s*\.\.\.\s*rest\s*(of\s*)?(the\s*)?code/i,
  /\/\/\s*\.\.\.\s*existing\s*code/i,
  /\/\/\s*add\s+your\s+code\s+here/i,
  /\/\/\s*implement\s+this/i,
  /\/\/\s*placeholder/i,
  /throw\s+new\s+Error\s*\(\s*['"]Not\s+implemented['"]\s*\)/,
]

function commentChecker(input: Record<string, unknown>, _output: string): HookResponse | null {
  // Check new_string (Edit) or content in tool_output for AI placeholder comments
  const newString = (input.new_string as string) || (input.content as string) || ''
  if (!newString) return null

  const warnings: string[] = []
  const lines = newString.split('\n')

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of AI_COMMENT_PATTERNS) {
      if (pattern.test(lines[i])) {
        warnings.push(`  - Line ${i + 1}: "${lines[i].trim()}"`)
        break
      }
    }
  }

  if (warnings.length === 0) return null

  const reason =
    '[oh-my-hwclaude] AI PLACEHOLDER DETECTED: Your edit contains placeholder comments that should be replaced with actual implementation:\n' +
    warnings.join('\n') +
    '\n\nReplace these with real code before proceeding.'

  return {
    decision: 'block',
    reason,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: reason,
    },
  }
}

function jsonErrorRecovery(): HookResponse {
  const reason =
    '[oh-my-hwclaude] JSON RECOVERY: A JSON parsing error occurred in the tool call.\n' +
    'ACTION REQUIRED:\n' +
    '1. Check for trailing commas, missing quotes, or unescaped characters\n' +
    '2. Ensure all strings are properly quoted with double quotes\n' +
    '3. Verify array/object brackets are balanced\n' +
    '4. Retry the tool call with corrected JSON'

  return {
    decision: 'block',
    reason,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: reason,
    },
  }
}
