/**
 * Pure TypeScript xxHash32 implementation for line hashing.
 * No native dependencies — works on any Node.js 20+ runtime.
 *
 * Produces 2-character hash codes from the HASH_DICTIONARY.
 * For blank/non-alphanumeric lines, the seed is the line number
 * to differentiate identical blank lines at different positions.
 */

import { HASH_DICTIONARY } from './constants.js'

// xxHash32 prime constants
const PRIME32_1 = 0x9e3779b1
const PRIME32_2 = 0x85ebca77
const PRIME32_3 = 0xc2b2ae3d
const PRIME32_4 = 0x27d4eb2f
const PRIME32_5 = 0x165667b1

function rotl32(x: number, r: number): number {
  return ((x << r) | (x >>> (32 - r))) >>> 0
}

function readU32(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset]) |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    (buf[offset + 3] << 24)
  ) >>> 0
}

function xxHash32(input: Uint8Array, seed: number): number {
  let h32: number
  let i = 0
  const len = input.length

  if (len >= 16) {
    let v1 = (seed + PRIME32_1 + PRIME32_2) >>> 0
    let v2 = (seed + PRIME32_2) >>> 0
    let v3 = seed >>> 0
    let v4 = (seed - PRIME32_1) >>> 0

    while (i <= len - 16) {
      v1 = Math.imul(rotl32((v1 + Math.imul(readU32(input, i), PRIME32_2)) >>> 0, 13), PRIME32_1) >>> 0
      i += 4
      v2 = Math.imul(rotl32((v2 + Math.imul(readU32(input, i), PRIME32_2)) >>> 0, 13), PRIME32_1) >>> 0
      i += 4
      v3 = Math.imul(rotl32((v3 + Math.imul(readU32(input, i), PRIME32_2)) >>> 0, 13), PRIME32_1) >>> 0
      i += 4
      v4 = Math.imul(rotl32((v4 + Math.imul(readU32(input, i), PRIME32_2)) >>> 0, 13), PRIME32_1) >>> 0
      i += 4
    }

    h32 = (rotl32(v1, 1) + rotl32(v2, 7) + rotl32(v3, 12) + rotl32(v4, 18)) >>> 0
  } else {
    h32 = (seed + PRIME32_5) >>> 0
  }

  h32 = (h32 + len) >>> 0

  while (i <= len - 4) {
    h32 = Math.imul(
      rotl32((h32 + Math.imul(readU32(input, i), PRIME32_3)) >>> 0, 17),
      PRIME32_4
    ) >>> 0
    i += 4
  }

  while (i < len) {
    h32 = Math.imul(
      rotl32((h32 + Math.imul(input[i], PRIME32_5)) >>> 0, 11),
      PRIME32_1
    ) >>> 0
    i += 1
  }

  h32 = Math.imul(h32 ^ (h32 >>> 15), PRIME32_2) >>> 0
  h32 = Math.imul(h32 ^ (h32 >>> 13), PRIME32_3) >>> 0
  h32 = (h32 ^ (h32 >>> 16)) >>> 0

  return h32
}

const encoder = new TextEncoder()

/** Check if line has any alphanumeric content */
function hasAlphanumeric(line: string): boolean {
  return /[a-zA-Z0-9]/.test(line)
}

/**
 * Compute 2-character hash for a line.
 * - Lines with content: seed = 0 (consistent hash regardless of position)
 * - Blank/whitespace lines: seed = lineNumber (differentiate identical blanks)
 */
export function computeLineHash(line: string, lineNumber: number): string {
  const seed = hasAlphanumeric(line) ? 0 : lineNumber
  const bytes = encoder.encode(line)
  const hash = xxHash32(bytes, seed)
  return HASH_DICTIONARY[hash % 256]
}

/**
 * Legacy hash: normalizes all whitespace before hashing.
 * Used for backward-compatible validation when current hash mismatches.
 */
export function computeLegacyLineHash(line: string, lineNumber: number): string {
  const normalized = line.replace(/\s+/g, ' ').trim()
  const seed = hasAlphanumeric(normalized) ? 0 : lineNumber
  const bytes = encoder.encode(normalized)
  const hash = xxHash32(bytes, seed)
  return HASH_DICTIONARY[hash % 256]
}

/**
 * Format a single line with hash annotation.
 * Output: "{lineNumber}#{hash}|{content}"
 */
export function formatHashLine(content: string, lineNumber: number): string {
  const hash = computeLineHash(content, lineNumber)
  return `${lineNumber}#${hash}|${content}`
}

/**
 * Format multiple lines with hash annotations.
 * lineNumber is 1-based.
 */
export function formatHashLines(lines: string[], startLine: number = 1): string[] {
  return lines.map((line, i) => formatHashLine(line, startLine + i))
}
