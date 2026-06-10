const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz';

export function validateVigenereKeyword(keyword: string): boolean {
  if (!keyword || keyword.length === 0) return false;
  return /^[A-Za-z]+$/.test(keyword);
}

function vigenereTransform(text: string, keyword: string, encrypt: boolean): string {
  if (!validateVigenereKeyword(keyword)) {
    throw new Error('Invalid Vigenère keyword. Must be non-empty and alphabetic only.');
  }
  let result = '';
  let keyIndex = 0;
  const upperKeyword = keyword.toUpperCase();

  for (const char of text) {
    let shift = upperKeyword[keyIndex % upperKeyword.length].charCodeAt(0) - 65;
    if (!encrypt) shift = -shift;

    if (ALPHABET_UPPER.includes(char)) {
      result += String.fromCharCode(
        ((char.charCodeAt(0) - 65 + shift + 26) % 26) + 65,
      );
      keyIndex++;
    } else if (ALPHABET_LOWER.includes(char)) {
      result += String.fromCharCode(
        ((char.charCodeAt(0) - 97 + shift + 26) % 26) + 97,
      );
      keyIndex++;
    } else {
      result += char;
    }
  }
  return result;
}

export function vigenereEncrypt(text: string, keyword: string): string {
  return vigenereTransform(text, keyword, true);
}

export function vigenereDecrypt(text: string, keyword: string): string {
  return vigenereTransform(text, keyword, false);
}
