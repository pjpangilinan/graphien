import { describe, it, expect } from 'vitest';
import { caesarEncrypt, caesarDecrypt, validateCaesarShift } from './caesar';

describe('caesarEncrypt', () => {
  it('encrypts with shift 1', () => {
    expect(caesarEncrypt('abc', 1)).toBe('bcd');
  });

  it('wraps around alphabet', () => {
    expect(caesarEncrypt('xyz', 3)).toBe('abc');
  });

  it('preserves case', () => {
    expect(caesarEncrypt('AbC', 1)).toBe('BcD');
  });

  it('preserves non-letters', () => {
    expect(caesarEncrypt('hello!', 1)).toBe('ifmmp!');
  });

  it('shift 0 returns same text', () => {
    expect(caesarEncrypt('hello', 0)).toBe('hello');
  });

  it('shift 25 wraps', () => {
    expect(caesarEncrypt('a', 25)).toBe('z');
  });
});

describe('caesarDecrypt', () => {
  it('decrypts with shift 1', () => {
    expect(caesarDecrypt('bcd', 1)).toBe('abc');
  });

  it('round-trips', () => {
    const text = 'Hello, World!';
    const shift = 13;
    expect(caesarDecrypt(caesarEncrypt(text, shift), shift)).toBe(text);
  });
});

describe('validateCaesarShift', () => {
  it('accepts 0-25', () => {
    expect(validateCaesarShift(0)).toBe(true);
    expect(validateCaesarShift(25)).toBe(true);
  });

  it('rejects negative', () => {
    expect(validateCaesarShift(-1)).toBe(false);
  });

  it('rejects > 25', () => {
    expect(validateCaesarShift(26)).toBe(false);
  });

  it('rejects non-integer', () => {
    expect(validateCaesarShift(3.5)).toBe(false);
  });
});
