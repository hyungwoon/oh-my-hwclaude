/**
 * Hash dictionary for 2-character line identification.
 * Built from 16-char alphabet: ZPMQVRWSNKTXJBYH
 * Produces 256 unique 2-character codes (16 × 16).
 *
 * Ported from oh-my-openagent (Can Boluk's "The Harness Problem").
 */

const ALPHABET = 'ZPMQVRWSNKTXJBYH'

export const HASH_DICTIONARY: string[] = (() => {
  const dict: string[] = []
  for (let i = 0; i < ALPHABET.length; i++) {
    for (let j = 0; j < ALPHABET.length; j++) {
      dict.push(ALPHABET[i] + ALPHABET[j])
    }
  }
  return dict
})()

/** Format: {lineNumber}#{hash}|{content} */
export const HASHLINE_PREFIX_REGEX = /^(\d+)#([A-Z]{2})\|/

/** Matches hashline references like 42#VK */
export const HASHLINE_REF_REGEX = /^[>+\-\s]*(\d+)#([A-Z]{2})$/

/** Max lines per chunk for streaming output */
export const MAX_CHUNK_LINES = 200

/** Max bytes per chunk */
export const MAX_CHUNK_BYTES = 65536
