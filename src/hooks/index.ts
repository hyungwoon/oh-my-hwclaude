#!/usr/bin/env node
/**
 * oh-my-hwclaude hook dispatcher.
 *
 * Claude Code hooks call this script with a hook type argument.
 * Receives JSON on stdin, outputs JSON response.
 *
 * Usage in settings.json:
 *   "hooks": {
 *     "PreToolUse": [
 *       { "matcher": "Edit", "command": "hwclaude-hook pre-tool-use" }
 *     ],
 *     "PostToolUse": [
 *       { "matcher": "", "command": "hwclaude-hook post-tool-use" }
 *     ]
 *   }
 */

import { handlePreToolUse } from './pre-tool-use.js'
import { handlePostToolUse } from './post-tool-use.js'
import { handleStop } from './stop.js'

async function main() {
  const hookType = process.argv[2]

  if (!hookType) {
    console.error('Usage: hwclaude-hook <pre-tool-use|post-tool-use|stop>')
    process.exit(1)
  }

  // Read stdin
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf-8'))

  let result: object | null = null

  switch (hookType) {
    case 'pre-tool-use':
      result = handlePreToolUse(input)
      break
    case 'post-tool-use':
      result = handlePostToolUse(input)
      break
    case 'stop':
      result = handleStop(input)
      break
    default:
      console.error(`Unknown hook type: ${hookType}`)
      process.exit(1)
  }

  if (result) {
    process.stdout.write(JSON.stringify(result))
  }
}

main().catch((err) => {
  console.error('Hook error:', err.message)
  process.exit(1)
})
