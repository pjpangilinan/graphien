import { describe, it, expect, beforeAll } from 'vitest';
import { encryptData, decryptData, encodeEncryptionMeta, decodeEncryptionMeta, getIterations, setIterations } from './index';

beforeAll(() => {
  setIterations(1000);
});

const METHODS = ['AES-256-CBC', 'AES-256-CTR'] as const;

describe('encryption', () => {
  for (const method of METHODS) {
    it(`encrypts and decrypts with ${method}`, async () => {
      const password = 'testpassword';
      const plaintext = 'Hello, World!';
      const result = await encryptData(password, plaintext, method);
      const decrypted = await decryptData(
        password,
        result.ciphertext,
        result.iv,
        result.salt,
        result.method,
      );
      expect(decrypted).toBe(plaintext);
    });
  }

  it('produces different ciphertext for different passwords', async () => {
    const text = 'secret';
    const r1 = await encryptData('pass1', text);
    const r2 = await encryptData('pass2', text);
    expect(r1.ciphertext).not.toBe(r2.ciphertext);
  });

  it('fails to decrypt with wrong password', async () => {
    const result = await encryptData('correct', 'data');
    await expect(
      decryptData('wrong', result.ciphertext, result.iv, result.salt, result.method),
    ).rejects.toThrow();
  });

  it('decrypts with per-entry iterations when global changes', async () => {
    const result = await encryptData('pass', 'stored with higher iter');
    const originalGlobal = getIterations();
    setIterations(50000);
    const decrypted = await decryptData('pass', result.ciphertext, result.iv, result.salt, result.method, originalGlobal);
    expect(decrypted).toBe('stored with higher iter');
    setIterations(originalGlobal);
  });
});

describe('encodeDecodeEncryptionMeta', () => {
  it('round-trips without iterations', () => {
    const meta = encodeEncryptionMeta('AES-256-CBC', 'iv123', 'salt456');
    const decoded = decodeEncryptionMeta(meta);
    expect(decoded.method).toBe('AES-256-CBC');
    expect(decoded.iv).toBe('iv123');
    expect(decoded.salt).toBe('salt456');
    expect(decoded.iterations).toBeUndefined();
  });

  it('round-trips with iterations', () => {
    const meta = encodeEncryptionMeta('AES-256-CBC', 'iv1', 'salt1', 5000);
    const decoded = decodeEncryptionMeta(meta);
    expect(decoded.method).toBe('AES-256-CBC');
    expect(decoded.iv).toBe('iv1');
    expect(decoded.salt).toBe('salt1');
    expect(decoded.iterations).toBe(5000);
  });

  it('defaults on missing parts', () => {
    const decoded = decodeEncryptionMeta('AES-256-CBC::abc');
    expect(decoded.method).toBe('AES-256-CBC');
    expect(decoded.iv).toBe('abc');
    expect(decoded.salt).toBe('');
    expect(decoded.iterations).toBeUndefined();
  });

  it('parses iterations from old 3-part format', () => {
    const decoded = decodeEncryptionMeta('AES-256-CTR::ivX::saltY');
    expect(decoded.method).toBe('AES-256-CTR');
    expect(decoded.iv).toBe('ivX');
    expect(decoded.salt).toBe('saltY');
    expect(decoded.iterations).toBeUndefined();
  });
});
