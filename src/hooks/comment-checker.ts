/**
 * Comment checker — detects AI placeholder comments in edited code.
 * Warns when LLM leaves behind slop like "// TODO: implement" or "// ... rest of code".
 */

const AI_COMMENT_PATTERNS = [
  /\/\/\s*TODO:\s*implement/i,
  /\/\/\s*TODO:\s*add/i,
  /\/\/\s*\.\.\.\s*rest\s*(of\s*)?(the\s*)?code/i,
  /\/\/\s*\.\.\.\s*existing\s*code/i,
  /\/\/\s*add\s*your\s*code\s*here/i,
  /\/\/\s*implement\s*this/i,
  /\/\/\s*placeholder/i,
  /\/\/\s*FIXME:\s*implement/i,
  /\/\*\s*\.\.\.\s*\*\//,
  /throw\s+new\s+Error\s*\(\s*['"]Not\s+implemented['"]\s*\)/,
]

export function checkForAIComments(content: string): string[] {
  const warnings: string[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const pattern of AI_COMMENT_PATTERNS) {
      if (pattern.test(line)) {
        warnings.push(`Line ${i + 1}: AI placeholder detected — "${line.trim()}"`)
        break
      }
    }
  }

  return warnings
}
