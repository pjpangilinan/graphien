import { describe, it, expect } from 'vitest';
import { vigenereEncrypt, vigenereDecrypt, validateVigenereKeyword } from './vigenere';

describe('vigenereEncrypt', () => {
  it('encrypts with keyword', () => {
    expect(vigenereEncrypt('HELLO', 'KEY')).toBe('RIJVS');
  });

  it('preserves case', () => {
    const result = vigenereEncrypt('Hello', 'key');
    expect(result).toBe('Rijvs');
  });

  it('preserves non-letters', () => {
    expect(vigenereEncrypt('hello!', 'key')).toBe('rijvs!');
  });

  it('cycles keyword', () => {
    const result = vigenereEncrypt('aaaa', 'abc');
    expect(result).toBe('abca');
  });
});

describe('vigenereDecrypt', () => {
  it('decrypts with keyword', () => {
    expect(vigenereDecrypt('RIJVS', 'KEY')).toBe('HELLO');
  });

  it('round-trips', () => {
    const text = 'Hello, World!';
    const kw = 'secret';
    expect(vigenereDecrypt(vigenereEncrypt(text, kw), kw)).toBe(text);
  });
});

describe('validateVigenereKeyword', () => {
  it('accepts alphabetic keyword', () => {
    expect(validateVigenereKeyword('keyword')).toBe(true);
    expect(validateVigenereKeyword('Hello')).toBe(true);
  });

  it('rejects empty keyword', () => {
    expect(validateVigenereKeyword('')).toBe(false);
  });

  it('rejects non-alphabetic', () => {
    expect(validateVigenereKeyword('hello1')).toBe(false);
    expect(validateVigenereKeyword('he-llo')).toBe(false);
  });
});
