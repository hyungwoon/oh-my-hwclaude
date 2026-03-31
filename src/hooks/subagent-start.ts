/**
 * SubagentStart hook — inject hashline system guidance when subagents spawn.
 *
 * Ensures all subagents are aware of the hashline_read → hashline_edit workflow
 * for file editing, preventing stale edit issues.
 */

import type { SubagentStartInput, HookResponse } from './types.js'

const HASHLINE_GUIDANCE =
  '[oh-my-hwclaude] Hashline Edit System available.\n' +
  'When editing existing files, use hashline_read → hashline_edit workflow:\n' +
  '1. hashline_read to get LINE#HASH references (e.g. 4#WS)\n' +
  '2. hashline_edit with op: replace/append/prepend using LINE#HASH anchors\n' +
  'This prevents stale edits by detecting file changes via hash mismatches.\n' +
  'For new files, use hashline_write instead of Write.'

export function handleSubagentStart(_input: SubagentStartInput): HookResponse | null {
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: HASHLINE_GUIDANCE,
    },
  }
}
