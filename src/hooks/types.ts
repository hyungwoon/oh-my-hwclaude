/**
 * Shared hook types for oh-my-hwclaude.
 *
 * Aligns with Claude Code's internal hook response schema
 * (syncHookResponseSchema in types/hooks.ts).
 */

// --- Hook-specific output per event ---

export interface PreToolUseOutput {
  hookEventName: 'PreToolUse'
  additionalContext?: string
  updatedInput?: Record<string, unknown>
  permissionDecision?: 'allow' | 'deny' | 'ask' | 'passthrough'
  permissionDecisionReason?: string
}

export interface PostToolUseOutput {
  hookEventName: 'PostToolUse'
  additionalContext?: string
  updatedMCPToolOutput?: unknown
}

export interface PostToolUseFailureOutput {
  hookEventName: 'PostToolUseFailure'
  additionalContext?: string
}

export interface SubagentStartOutput {
  hookEventName: 'SubagentStart'
  additionalContext?: string
}

export interface SessionStartOutput {
  hookEventName: 'SessionStart'
  additionalContext?: string
  initialUserMessage?: string
  watchPaths?: string[]
}

export type HookSpecificOutput =
  | PreToolUseOutput
  | PostToolUseOutput
  | PostToolUseFailureOutput
  | SubagentStartOutput
  | SessionStartOutput

// --- Unified hook response ---

export interface HookResponse {
  decision?: 'approve' | 'block' | 'ask'
  reason?: string
  message?: string
  continue?: boolean
  suppressOutput?: boolean
  stopReason?: string
  systemMessage?: string
  hookSpecificOutput?: HookSpecificOutput
}

// --- Input types per hook event ---

export interface PreToolUseInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface PostToolUseInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
  tool_output: string
}

export interface PostToolUseFailureInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
  error: string
  error_type?: string
}

export interface StopInput {
  session_id: string
  stop_reason: string
}

export interface SubagentStartInput {
  session_id: string
  agent_id: string
  agent_type?: string
}

export interface SessionStartInput {
  session_id: string
  source: 'startup' | 'resume' | 'clear' | 'compact'
}
