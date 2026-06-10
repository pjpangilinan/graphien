const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz';

export function atbashTransform(text: string): string {
  let result = '';
  for (const char of text) {
    const upperIdx = ALPHABET_UPPER.indexOf(char);
    const lowerIdx = ALPHABET_LOWER.indexOf(char);
    if (upperIdx !== -1) {
      result += ALPHABET_UPPER[25 - upperIdx];
    } else if (lowerIdx !== -1) {
      result += ALPHABET_LOWER[25 - lowerIdx];
    } else {
      result += char;
    }
  }
  return result;
}

export function atbashEncrypt(text: string): string {
  return atbashTransform(text);
}

export function atbashDecrypt(text: string): string {
  return atbashTransform(text);
}
