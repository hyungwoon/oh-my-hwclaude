/**
 * Mistake logger — records hook catches to JSONL for escalation analysis.
 *
 * Hooks catch mistakes in real-time but don't persist what they caught.
 * This logger fills that gap: every catch is appended to a JSONL file,
 * enabling pattern detection and escalation decisions.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface MistakeEntry {
  ts: string
  category: 'ai-slop' | 'edit-error' | 'write-guard' | 'interactive-block' | 'json-error'
  detail: string
  file?: string
  session_id?: string
}

const LOG_DIR = join(
  process.env.HOME || '/tmp',
  '.omc',
  'mistake-log',
)

function getLogPath(): string {
  const date = new Date().toISOString().slice(0, 10)
  return join(LOG_DIR, `${date}.jsonl`)
}

export function logMistake(entry: MistakeEntry): void {
  try {
    const logPath = getLogPath()
    mkdirSync(dirname(logPath), { recursive: true })
    const line = JSON.stringify(entry) + '\n'
    appendFileSync(logPath, line, 'utf-8')
  } catch {
    // logging must never break the hook
  }
}
