const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz';

function shiftChar(char: string, shift: number, alphabet: string): string {
  const idx = alphabet.indexOf(char);
  if (idx === -1) return char;
  return alphabet[(idx + shift + alphabet.length) % alphabet.length];
}

export function validateCaesarShift(shift: number): boolean {
  return Number.isInteger(shift) && shift >= 0 && shift <= 25;
}

export function caesarEncrypt(text: string, shift: number): string {
  if (!validateCaesarShift(shift)) {
    throw new Error('Invalid Caesar shift. Must be an integer between 0 and 25.');
  }
  let result = '';
  for (const char of text) {
    if (ALPHABET_UPPER.includes(char)) {
      result += shiftChar(char, shift, ALPHABET_UPPER);
    } else if (ALPHABET_LOWER.includes(char)) {
      result += shiftChar(char, shift, ALPHABET_LOWER);
    } else {
      result += char;
    }
  }
  return result;
}

export function caesarDecrypt(text: string, shift: number): string {
  if (!validateCaesarShift(shift)) {
    throw new Error('Invalid Caesar shift. Must be an integer between 0 and 25.');
  }
  const reverseShift = (26 - shift) % 26;
  let result = '';
  for (const char of text) {
    if (ALPHABET_UPPER.includes(char)) {
      result += shiftChar(char, reverseShift, ALPHABET_UPPER);
    } else if (ALPHABET_LOWER.includes(char)) {
      result += shiftChar(char, reverseShift, ALPHABET_LOWER);
    } else {
      result += char;
    }
  }
  return result;
}
