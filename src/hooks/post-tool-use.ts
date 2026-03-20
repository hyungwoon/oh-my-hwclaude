/**
 * PostToolUse hooks — process tool output after execution.
 *
 * Hooks:
 * 1. edit-error-recovery: When Edit/hashline_edit fails, inject recovery instructions
 * 2. json-error-recovery: When JSON parse errors occur, inject fix guidance
 * 3. context-monitor: Warn about context window usage
 */

interface PostToolUseInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
  tool_output: string
}

interface HookDecision {
  decision: 'block'
  reason: string
}

export function handlePostToolUse(input: PostToolUseInput): HookDecision | null {
  const { tool_name, tool_output } = input

  // 1. Edit error recovery
  if (isEditTool(tool_name) && isEditError(tool_output)) {
    return editErrorRecovery(tool_output)
  }

  // 2. JSON error recovery
  if (isJsonError(tool_output)) {
    return jsonErrorRecovery()
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

function editErrorRecovery(output: string): HookDecision {
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

  return { decision: 'block', reason: guidance }
}

function jsonErrorRecovery(): HookDecision {
  return {
    decision: 'block',
    reason:
      '[oh-my-hwclaude] JSON RECOVERY: A JSON parsing error occurred in the tool call.\n' +
      'ACTION REQUIRED:\n' +
      '1. Check for trailing commas, missing quotes, or unescaped characters\n' +
      '2. Ensure all strings are properly quoted with double quotes\n' +
      '3. Verify array/object brackets are balanced\n' +
      '4. Retry the tool call with corrected JSON',
  }
}
