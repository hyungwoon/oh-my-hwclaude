/**
 * Stop hook — runs when Claude Code is about to stop.
 *
 * Checks:
 * 1. Unfinished tasks in the conversation
 * 2. Unverified changes (remind to test)
 */

interface StopInput {
  session_id: string
  stop_reason: string
}

interface HookDecision {
  decision: 'block'
  reason: string
}

export function handleStop(input: StopInput): HookDecision | null {
  const { stop_reason } = input

  // Only intercept assistant-initiated stops, not user-forced stops
  if (stop_reason === 'user') {
    return null
  }

  // For end_turn, let the AI know it should verify work
  if (stop_reason === 'end_turn') {
    return {
      decision: 'block',
      reason:
        '[oh-my-hwclaude] STOP CHECK: Before finishing, verify:\n' +
        '- All edits have been applied correctly\n' +
        '- No build errors introduced (run build/lint if applicable)\n' +
        '- Changes match the user\'s request\n' +
        'If everything is verified, you may proceed to stop.',
    }
  }

  return null
}
