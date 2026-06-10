import { describe, it, expect } from 'vitest';
import { atbashEncrypt, atbashDecrypt } from './atbash';

describe('atbash', () => {
  it('encrypts basic text', () => {
    expect(atbashEncrypt('ABC')).toBe('ZYX');
  });

  it('preserves case', () => {
    expect(atbashEncrypt('AbC')).toBe('ZyX');
  });

  it('preserves non-letters', () => {
    expect(atbashEncrypt('hello!')).toBe('svool!');
  });

  it('decrypt is same as encrypt', () => {
    const text = 'Hello, World!';
    expect(atbashDecrypt(atbashEncrypt(text))).toBe(text);
  });
});
