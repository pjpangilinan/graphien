import { describe, it, expect } from 'vitest';
import { rot13Encrypt, rot13Decrypt } from './rot13';

describe('rot13', () => {
  it('encrypts basic text', () => {
    expect(rot13Encrypt('Hello')).toBe('Uryyb');
  });

  it('round-trips', () => {
    const text = 'Hello, World!';
    expect(rot13Decrypt(rot13Encrypt(text))).toBe(text);
  });

  it('applying twice returns original', () => {
    expect(rot13Encrypt(rot13Encrypt('Test'))).toBe('Test');
  });
});
