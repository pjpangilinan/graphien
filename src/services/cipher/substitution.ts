const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function validateSubstitutionAlphabet(alphabet: string): boolean {
  if (alphabet.length !== 26) return false;
  const seen = new Set<string>();
  for (const ch of alphabet.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') return false;
    if (seen.has(ch)) return false;
    seen.add(ch);
  }
  return true;
}

function buildMapping(alphabet: string): { enc: Record<string, string>; dec: Record<string, string> } {
  const enc: Record<string, string> = {};
  const dec: Record<string, string> = {};
  const upper = alphabet.toUpperCase();
  for (let i = 0; i < 26; i++) {
    enc[ALPHABET[i]] = upper[i];
    dec[upper[i]] = ALPHABET[i];
  }
  return { enc, dec };
}

function transform(text: string, map: Record<string, string>): string {
  let result = '';
  for (const char of text) {
    const isUpper = char === char.toUpperCase();
    const upper = char.toUpperCase();
    const mapped = map[upper];
    if (mapped) {
      result += isUpper ? mapped : mapped.toLowerCase();
    } else {
      result += char;
    }
  }
  return result;
}

export function substitutionEncrypt(text: string, alphabet: string): string {
  if (!validateSubstitutionAlphabet(alphabet)) {
    throw new Error('Invalid substitution alphabet. Must be 26 unique letters A-Z.');
  }
  const { enc } = buildMapping(alphabet);
  return transform(text, enc);
}

export function substitutionDecrypt(text: string, alphabet: string): string {
  if (!validateSubstitutionAlphabet(alphabet)) {
    throw new Error('Invalid substitution alphabet. Must be 26 unique letters A-Z.');
  }
  const { dec } = buildMapping(alphabet);
  return transform(text, dec);
}
