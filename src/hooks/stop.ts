/**
 * Stop hook — runs when Claude Code is about to stop.
 *
 * Checks:
 * 1. Unfinished tasks in the conversation
 * 2. Unverified changes (remind to test)
 */

import type { StopInput, HookResponse } from './types.js'

const STOP_CHECK_REASON =
  '[oh-my-hwclaude] STOP CHECK: Before finishing, verify:\n' +
  '- All edits have been applied correctly\n' +
  '- No build errors introduced (run build/lint if applicable)\n' +
  '- Changes match the user\'s request\n' +
  'If everything is verified, you may proceed to stop.'

export function handleStop(input: StopInput): HookResponse | null {
  const { stop_reason } = input

  // Only intercept assistant-initiated stops, not user-forced stops
  if (stop_reason === 'user') {
    return null
  }

  // For end_turn, let the AI know it should verify work
  if (stop_reason === 'end_turn') {
    return {
      decision: 'block',
      reason: STOP_CHECK_REASON,
    }
  }

  return null
}
