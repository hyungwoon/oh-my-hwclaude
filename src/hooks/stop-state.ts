/**
 * Verification state management for the stop hook.
 *
 * Tracks whether the LLM has been asked to verify and whether
 * it actually ran verification commands (detected via post-tool-use).
 * Also detects active OMC persistent modes to avoid double-blocking.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface VerificationState {
  session_id: string
  requested: boolean
  verified: boolean
  attempts: number
  requestedAt: number
}

const STATE_FILENAME = 'stop-verification.json'
const OMC_MODE_FILES = [
  'ralph-state.json',
  'ultrawork-state.json',
  'autopilot-state.json',
  'ultraqa-state.json',
  'pipeline-state.json',
  'team-state.json',
]

function getStateDir(): string {
  return join(process.cwd(), '.omc', 'state')
}

function getStatePath(): string {
  return join(getStateDir(), STATE_FILENAME)
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function readVerificationState(sessionId: string): VerificationState | null {
  const path = getStatePath()
  if (!existsSync(path)) return null
  try {
    const state: VerificationState = JSON.parse(readFileSync(path, 'utf-8'))
    if (state.session_id !== sessionId) return null
    return state
  } catch {
    return null
  }
}

export function writeVerificationState(state: VerificationState): void {
  const path = getStatePath()
  ensureDir(path)
  writeFileSync(path, JSON.stringify(state, null, 2))
}

export function markVerified(sessionId: string): void {
  const state = readVerificationState(sessionId)
  if (state?.requested && !state.verified) {
    state.verified = true
    writeVerificationState(state)
  }
}

export function isOmcModeActive(): boolean {
  const dirs = [
    getStateDir(),
    join(process.env.HOME || '', '.omc', 'state'),
  ]

  for (const dir of dirs) {
    for (const file of OMC_MODE_FILES) {
      const path = join(dir, file)
      if (!existsSync(path)) continue
      try {
        const data = JSON.parse(readFileSync(path, 'utf-8'))
        if (data?.active) return true
      } catch {
        continue
      }
    }
  }

  return false
}
