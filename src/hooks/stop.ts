/**
 * Stop hook — runs when Claude Code is about to stop.
 *
 * Verification gate:
 * 1. First end_turn → block, request verification
 * 2. LLM runs tools (post-tool-use marks verified) → allow through
 * 3. LLM doesn't verify → keep blocking up to MAX_UNVERIFIED_ATTEMPTS
 * 4. OMC persistent modes active → passthrough (let OMC manage the loop)
 */

import type { StopInput, HookResponse } from './types.js'
import {
  readVerificationState,
  writeVerificationState,
  isOmcModeActive,
} from './stop-state.js'

const MAX_UNVERIFIED_ATTEMPTS = 5

const VERIFICATION_REQUEST =
  '[oh-my-hwclaude] STOP CHECK: Before finishing, verify:\n' +
  '- All edits have been applied correctly\n' +
  '- No build errors introduced (run build/lint if applicable)\n' +
  '- Changes match the user\'s request\n' +
  'Run verification commands, then you may stop.'

const VERIFICATION_REMINDER =
  '[oh-my-hwclaude] VERIFICATION INCOMPLETE: You have not run verification commands yet.\n' +
  'Please run build/lint/test to verify your changes before stopping.'

export function handleStop(input: StopInput): HookResponse | null {
  const { stop_reason, session_id } = input

  // Only intercept assistant-initiated end_turn
  if (stop_reason !== 'end_turn') return null

  // Don't interfere when OMC persistent modes manage the loop
  if (isOmcModeActive()) return null

  const state = readVerificationState(session_id)

  // First attempt — request verification
  if (!state) {
    writeVerificationState({
      session_id,
      requested: true,
      verified: false,
      attempts: 1,
      requestedAt: Date.now(),
    })
    return { decision: 'block', reason: VERIFICATION_REQUEST }
  }

  // Verification done (post-tool-use marked it) — allow through
  if (state.verified) return null

  // Safety valve — prevent infinite loop after max attempts
  if (state.attempts >= MAX_UNVERIFIED_ATTEMPTS) return null

  // Not verified yet — block with reminder
  state.attempts += 1
  writeVerificationState(state)
  return { decision: 'block', reason: VERIFICATION_REMINDER }
}
