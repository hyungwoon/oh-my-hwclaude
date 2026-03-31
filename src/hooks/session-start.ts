/**
 * SessionStart hook — introduce hashline system at session start.
 *
 * Provides different guidance depending on session source:
 * - startup: Full hashline system introduction
 * - resume/compact: Stale hash warning
 * - clear: Fresh start guidance
 */

import type { SessionStartInput, HookResponse } from './types.js'

const STARTUP_CONTEXT =
  '[oh-my-hwclaude] Hashline Edit System is available in this session.\n' +
  'For editing existing files, prefer hashline_read → hashline_edit over Edit/Write:\n' +
  '- hashline_read: Returns lines with LINE#HASH anchors (e.g. 3#VR|export function ...)\n' +
  '- hashline_edit: Uses LINE#HASH to apply precise edits (replace, append, prepend)\n' +
  '- hashline_write: Creates new files (never overwrites existing)\n' +
  'Benefits: Hash-based anchoring prevents stale edits when files change between read and edit.'

const RESUME_CONTEXT =
  '[oh-my-hwclaude] Session resumed — hashline hashes may be stale.\n' +
  'Before editing any file, run hashline_read first to get fresh LINE#HASH references.\n' +
  'DO NOT reuse LINE#HASH references from before the session break.'

export function handleSessionStart(input: SessionStartInput): HookResponse | null {
  const { source } = input

  if (source === 'startup') {
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: STARTUP_CONTEXT,
      },
    }
  }

  if (source === 'resume' || source === 'compact') {
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: RESUME_CONTEXT,
      },
    }
  }

  // 'clear' — fresh session, same as startup
  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: STARTUP_CONTEXT,
    },
  }
}
