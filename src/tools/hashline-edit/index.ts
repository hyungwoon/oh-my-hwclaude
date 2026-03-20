/**
 * Hashline Edit — hash-anchored file editing tool.
 *
 * Instead of matching exact strings (which LLMs frequently get wrong),
 * each line is tagged with a content hash when read. Edits reference
 * positions using LINE#HASH format, verified before application.
 *
 * This is the MCP tool definition for Claude Code integration.
 */

export { executeHashlineEdit } from './executor.js'
export { computeLineHash, formatHashLine, formatHashLines } from './hash-computation.js'
export { canonicalize, decanonicalize } from './canonicalization.js'
export type { HashlineEdit, EditResult, ReplaceEdit, AppendEdit, PrependEdit } from './types.js'
