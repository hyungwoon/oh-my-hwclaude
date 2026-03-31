#!/usr/bin/env node
/**
 * oh-my-hwclaude hook dispatcher.
 *
 * Claude Code hooks call this script with a hook type argument.
 * Receives JSON on stdin, outputs JSON response.
 *
 * Supported hook types:
 *   pre-tool-use        — intercept tool calls before execution
 *   post-tool-use       — process tool output after execution
 *   post-tool-use-failure — handle tool execution failures
 *   stop                — verify work before stopping
 *   subagent-start      — inject hashline guidance into subagents
 *   session-start       — introduce hashline system at session start
 */

import { handlePreToolUse } from './pre-tool-use.js'
import { handlePostToolUse } from './post-tool-use.js'
import { handlePostToolUseFailure } from './post-tool-use-failure.js'
import { handleStop } from './stop.js'
import { handleSubagentStart } from './subagent-start.js'
import { handleSessionStart } from './session-start.js'

const SUPPORTED_HOOKS = [
  'pre-tool-use',
  'post-tool-use',
  'post-tool-use-failure',
  'stop',
  'subagent-start',
  'session-start',
] as const

async function main() {
  const hookType = process.argv[2]

  if (!hookType) {
    console.error(`Usage: hwclaude-hook <${SUPPORTED_HOOKS.join('|')}>`)
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
    case 'post-tool-use-failure':
      result = handlePostToolUseFailure(input)
      break
    case 'stop':
      result = handleStop(input)
      break
    case 'subagent-start':
      result = handleSubagentStart(input)
      break
    case 'session-start':
      result = handleSessionStart(input)
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
