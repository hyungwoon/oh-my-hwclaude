#!/usr/bin/env bun
/**
 * gen-skill-docs — .tmpl → SKILL.md 생성기
 *
 * 출처: garrytan/gstack scripts/gen-skill-docs.ts (MIT)
 *
 * 사용법:
 *   bun run src/tools/gen-skill-docs.ts --file <path-to.tmpl>
 *   bun run src/tools/gen-skill-docs.ts --all
 *   bun run src/tools/gen-skill-docs.ts --file <path> --dry-run
 *
 * SKILL.md 파일은 생성물이지 수동 편집 대상이 아님.
 * 수정이 필요하면 .tmpl 파일과 resolvers/ 를 수정 후 regenerate.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { resolvePreamble } from './resolvers/preamble.js'
import { resolveBoilTheLake, resolveCompletenessTable } from './resolvers/completeness.js'
import { resolveAskuserFormat } from './resolvers/askuser-format.js'
import { resolveSearchBeforeBuilding } from './resolvers/search-building.js'

// ─── Constants ───────────────────────────────────────────────

const AUTO_GENERATED_MARKER = '<!-- AUTO-GENERATED from'
const TOKEN_WARNING_BYTES = 40 * 1024 // 40KB

// ─── Placeholder resolution ───────────────────────────────────

const RESOLVERS: Record<string, () => string> = {
  PREAMBLE: resolvePreamble,
  BOIL_THE_LAKE: resolveBoilTheLake,
  COMPLETENESS_TABLE: resolveCompletenessTable,
  ASKUSER_FORMAT: resolveAskuserFormat,
  SEARCH_BEFORE_BUILDING: resolveSearchBeforeBuilding,
  // COMMAND_REFERENCE and WRITING_STYLE intentionally left for per-skill definition
}

function applyResolvers(template: string, tmplPath: string): string {
  let result = template

  // Replace all known placeholders
  for (const [key, resolver] of Object.entries(RESOLVERS)) {
    const placeholder = `{{${key}}}`
    if (result.includes(placeholder)) {
      result = result.replaceAll(placeholder, resolver())
    }
  }

  // Prepend AUTO-GENERATED header
  const header = `<!-- AUTO-GENERATED from ${tmplPath} — do not edit directly -->\n`
  return header + result
}

// ─── File operations ──────────────────────────────────────────

function tmplToMdPath(tmplPath: string): string {
  return tmplPath.replace(/\.tmpl$/, '.md')
}

async function checkExistingMd(mdPath: string): Promise<'auto-generated' | 'user-edited' | 'missing'> {
  try {
    const content = await fs.readFile(mdPath, 'utf-8')
    if (content.startsWith(AUTO_GENERATED_MARKER)) {
      return 'auto-generated'
    }
    return 'user-edited'
  } catch {
    return 'missing'
  }
}

async function generateFromTmpl(
  tmplPath: string,
  opts: { dryRun: boolean }
): Promise<{ skipped: boolean; reason?: string; outputPath: string; bytes: number }> {
  const resolvedTmpl = path.resolve(tmplPath)
  const outputPath = tmplToMdPath(resolvedTmpl)

  // Read template
  let template: string
  try {
    template = await fs.readFile(resolvedTmpl, 'utf-8')
  } catch (err) {
    throw new Error(`Cannot read template: ${resolvedTmpl}. ${(err as Error).message}`)
  }

  // Check existing output
  const existingStatus = await checkExistingMd(outputPath)
  if (existingStatus === 'user-edited') {
    process.stderr.write(
      `WARNING: ${outputPath} exists without AUTO-GENERATED header — user-edited file detected. Skipping.\n`
    )
    return { skipped: true, reason: 'user-edited', outputPath, bytes: 0 }
  }

  // Apply resolvers
  const output = applyResolvers(template, resolvedTmpl)
  const bytes = Buffer.byteLength(output, 'utf-8')

  // Token ceiling warning
  if (bytes > TOKEN_WARNING_BYTES) {
    process.stderr.write(
      `WARNING: ${outputPath} is ${(bytes / 1024).toFixed(1)}KB — exceeds 40KB recommendation.\n`
    )
  }

  if (opts.dryRun) {
    process.stdout.write(`--- DRY RUN: ${outputPath} (${bytes} bytes) ---\n`)
    process.stdout.write(output)
    process.stdout.write('\n')
    return { skipped: false, outputPath, bytes }
  }

  await fs.writeFile(outputPath, output, 'utf-8')
  return { skipped: false, outputPath, bytes }
}

async function findAllTmplFiles(rootDir: string): Promise<string[]> {
  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.tmpl')) {
        results.push(fullPath)
      }
    }
  }

  await walk(rootDir)
  return results
}

// ─── CLI entrypoint ───────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const fileIdx = args.indexOf('--file')
  const allMode = args.includes('--all')

  if (!allMode && fileIdx === -1) {
    process.stderr.write(
      'Usage: gen-skill-docs.ts [--file <path.tmpl>|--all] [--dry-run]\n'
    )
    process.exit(1)
  }

  const tmplPaths: string[] = []

  if (allMode) {
    // Scan from project root (two levels up from src/tools/)
    const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
    const found = await findAllTmplFiles(projectRoot)
    tmplPaths.push(...found)
    if (tmplPaths.length === 0) {
      process.stdout.write('No .tmpl files found.\n')
      return
    }
  } else {
    const filePath = args[fileIdx + 1]
    if (!filePath) {
      process.stderr.write('Error: --file requires a path argument\n')
      process.exit(1)
    }
    tmplPaths.push(filePath)
  }

  let generated = 0
  let skipped = 0

  for (const tmplPath of tmplPaths) {
    try {
      const result = await generateFromTmpl(tmplPath, { dryRun })
      if (result.skipped) {
        skipped++
        process.stdout.write(`SKIP  ${result.outputPath} (${result.reason})\n`)
      } else if (!dryRun) {
        generated++
        process.stdout.write(`OK    ${result.outputPath} (${(result.bytes / 1024).toFixed(1)}KB)\n`)
      }
    } catch (err) {
      process.stderr.write(`ERROR ${tmplPath}: ${(err as Error).message}\n`)
      process.exit(1)
    }
  }

  if (!dryRun) {
    process.stdout.write(`\n${generated} generated, ${skipped} skipped.\n`)
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
