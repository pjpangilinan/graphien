import { describe, it, expect } from 'vitest';
import { substitutionEncrypt, substitutionDecrypt, validateSubstitutionAlphabet } from './substitution';

const QWERTY = 'QWERTYUIOPASDFGHJKLZXCVBNM';

describe('substitution', () => {
  it('encrypts with QWERTY alphabet', () => {
    expect(substitutionEncrypt('ABC', QWERTY)).toBe('QWE');
  });

  it('preserves case', () => {
    expect(substitutionEncrypt('AbC', QWERTY)).toBe('QwE');
  });

  it('preserves non-letters', () => {
    expect(substitutionEncrypt('A!B', QWERTY)).toBe('Q!W');
  });

  it('round-trips', () => {
    const text = 'Hello, World!';
    expect(substitutionDecrypt(substitutionEncrypt(text, QWERTY), QWERTY)).toBe(text);
  });
});

describe('validateSubstitutionAlphabet', () => {
  it('accepts valid 26-letter alphabet', () => {
    expect(validateSubstitutionAlphabet(QWERTY)).toBe(true);
  });

  it('rejects short alphabet', () => {
    expect(validateSubstitutionAlphabet('ABC')).toBe(false);
  });

  it('rejects with duplicates', () => {
    expect(validateSubstitutionAlphabet('AAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
  });

  it('rejects with non-letters', () => {
    expect(validateSubstitutionAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXY1')).toBe(false);
  });
});
