import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { computeLineHash, formatHashLine, formatHashLines } from '../tools/hashline-edit/hash-computation.js'
import { executeHashlineEdit } from '../tools/hashline-edit/executor.js'
import { hashlineRead } from '../tools/hashline-read/index.js'

const TEST_DIR = path.join(os.tmpdir(), 'hwclaude-test-' + Date.now())
const TEST_FILE = path.join(TEST_DIR, 'test.ts')

const SAMPLE_CONTENT = `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}`

describe('hash-computation', () => {
  it('produces consistent 2-char hashes', () => {
    const hash1 = computeLineHash('const x = 1', 1)
    const hash2 = computeLineHash('const x = 1', 1)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(2)
  })

  it('blank lines get different hashes at different positions', () => {
    const hash1 = computeLineHash('', 1)
    const hash2 = computeLineHash('', 5)
    expect(hash1).not.toBe(hash2)
  })

  it('content lines get same hash regardless of position', () => {
    const hash1 = computeLineHash('const x = 1', 1)
    const hash2 = computeLineHash('const x = 1', 100)
    expect(hash1).toBe(hash2)
  })

  it('formats hash lines correctly', () => {
    const formatted = formatHashLine('const x = 1', 42)
    expect(formatted).toMatch(/^42#[A-Z]{2}\|const x = 1$/)
  })

  it('formats multiple lines with correct numbering', () => {
    const lines = ['line one', 'line two', 'line three']
    const formatted = formatHashLines(lines, 10)
    expect(formatted).toHaveLength(3)
    expect(formatted[0]).toMatch(/^10#[A-Z]{2}\|line one$/)
    expect(formatted[1]).toMatch(/^11#[A-Z]{2}\|line two$/)
    expect(formatted[2]).toMatch(/^12#[A-Z]{2}\|line three$/)
  })
})

describe('hashline-read', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    await fs.writeFile(TEST_FILE, SAMPLE_CONTENT)
  })

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  it('reads file with hash annotations', async () => {
    const result = await hashlineRead({ filePath: TEST_FILE })

    expect(result.totalLines).toBe(6)
    expect(result.startLine).toBe(1)
    expect(result.endLine).toBe(6)

    const lines = result.content.split('\n')
    expect(lines).toHaveLength(6)
    // Each line should have LINE#HASH|content format
    for (const line of lines) {
      expect(line).toMatch(/^\d+#[A-Z]{2}\|/)
    }
  })

  it('supports offset and limit', async () => {
    const result = await hashlineRead({ filePath: TEST_FILE, offset: 2, limit: 2 })

    expect(result.startLine).toBe(3)
    expect(result.endLine).toBe(4)

    const lines = result.content.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^3#[A-Z]{2}\|/)
  })
})

describe('hashline-edit', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    await fs.writeFile(TEST_FILE, SAMPLE_CONTENT)
  })

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  it('replaces a single line using LINE#HASH', async () => {
    // First read to get hashes
    const readResult = await hashlineRead({ filePath: TEST_FILE })
    const lines = readResult.content.split('\n')

    // Get the reference for line 4 (const [count, ...])
    const line4 = lines[3] // 0-indexed
    const refMatch = line4.match(/^(\d+#[A-Z]{2})/)
    expect(refMatch).not.toBeNull()

    const ref = refMatch![1]

    // Edit using the reference
    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      edits: [{
        op: 'replace',
        pos: ref,
        lines: '  const [count, setCount] = useState(42)',
      }],
    })

    expect(result.success).toBe(true)
    expect(result.additions).toBeGreaterThan(0)

    // Verify the edit
    const newContent = await fs.readFile(TEST_FILE, 'utf-8')
    expect(newContent).toContain('useState(42)')
    expect(newContent).not.toContain('useState(0)')
  })

  it('replaces a range of lines', async () => {
    const readResult = await hashlineRead({ filePath: TEST_FILE })
    const lines = readResult.content.split('\n')

    const ref4 = lines[3].match(/^(\d+#[A-Z]{2})/)![1]
    const ref5 = lines[4].match(/^(\d+#[A-Z]{2})/)![1]

    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      edits: [{
        op: 'replace',
        pos: ref4,
        end: ref5,
        lines: [
          '  const [value, setValue] = useState(0)',
          '  const label = `Value: ${value}`',
          '  return <span>{label}</span>',
        ],
      }],
    })

    expect(result.success).toBe(true)

    const newContent = await fs.readFile(TEST_FILE, 'utf-8')
    expect(newContent).toContain('const [value, setValue]')
    expect(newContent).toContain('const label')
  })

  it('appends lines after a position', async () => {
    const readResult = await hashlineRead({ filePath: TEST_FILE })
    const lines = readResult.content.split('\n')

    const ref3 = lines[2].match(/^(\d+#[A-Z]{2})/)![1]

    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      edits: [{
        op: 'append',
        pos: ref3,
        lines: '  // Component body starts here',
      }],
    })

    expect(result.success).toBe(true)

    const newContent = await fs.readFile(TEST_FILE, 'utf-8')
    const newLines = newContent.split('\n')
    expect(newLines[3]).toBe('  // Component body starts here')
  })

  it('prepends lines at start of file', async () => {
    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      edits: [{
        op: 'prepend',
        lines: '// Auto-generated file',
      }],
    })

    expect(result.success).toBe(true)

    const newContent = await fs.readFile(TEST_FILE, 'utf-8')
    expect(newContent.startsWith('// Auto-generated file')).toBe(true)
  })

  it('rejects edits with stale hash', async () => {
    await expect(
      executeHashlineEdit({
        filePath: TEST_FILE,
        edits: [{
          op: 'replace',
          pos: '4#ZZ', // Wrong hash
          lines: 'replacement',
        }],
      })
    ).rejects.toThrow(/validation failed|mismatch/i)
  })

  it('handles multiple edits in one call', async () => {
    const readResult = await hashlineRead({ filePath: TEST_FILE })
    const lines = readResult.content.split('\n')

    const ref1 = lines[0].match(/^(\d+#[A-Z]{2})/)![1]
    const ref4 = lines[3].match(/^(\d+#[A-Z]{2})/)![1]

    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      edits: [
        {
          op: 'replace',
          pos: ref1,
          lines: "import { useState, useEffect } from 'react'",
        },
        {
          op: 'replace',
          pos: ref4,
          lines: '  const [count, setCount] = useState(99)',
        },
      ],
    })

    expect(result.success).toBe(true)

    const newContent = await fs.readFile(TEST_FILE, 'utf-8')
    expect(newContent).toContain('useEffect')
    expect(newContent).toContain('useState(99)')
  })

  it('deletes a file', async () => {
    const result = await executeHashlineEdit({
      filePath: TEST_FILE,
      deleteFile: true,
    })

    expect(result.success).toBe(true)
    await expect(fs.access(TEST_FILE)).rejects.toThrow()
  })
})
