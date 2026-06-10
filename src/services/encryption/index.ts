import CryptoJS from 'crypto-js';
import type { EncryptionMethod } from '../../types/JournalEntry';

const keyCache = new Map<string, CryptoJS.lib.WordArray>();

export function getIterations(): number {
  const stored = localStorage.getItem('graphien-pbkdf2-iterations');
  if (stored) {
    const n = parseInt(stored, 10);
    if (n >= 1000 && n <= 1000000) return n;
  }
  return 10000;
}

export function setIterations(n: number): void {
  localStorage.setItem('graphien-pbkdf2-iterations', String(n));
  keyCache.clear();
}

function deriveKey(password: string, salt: string, iterations?: number): CryptoJS.lib.WordArray {
  const iter = iterations ?? getIterations();
  const cacheKey = `${password}::${salt}::${iter}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: iter,
    hasher: CryptoJS.algo.SHA256,
  });
  if (keyCache.size > 50) keyCache.clear();
  keyCache.set(cacheKey, key);
  return key;
}

export async function encryptData(
  password: string,
  plaintext: string,
  method: EncryptionMethod = 'AES-256-CBC',
): Promise<{ ciphertext: string; iv: string; salt: string; method: EncryptionMethod }> {
  const salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
  const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
  const key = deriveKey(password, salt);

  let encrypted: CryptoJS.lib.CipherParams;
  if (method === 'AES-256-CTR') {
    encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });
  } else {
    encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
  }

  return {
    ciphertext: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
    iv,
    salt,
    method,
  };
}

export async function decryptData(
  password: string,
  ciphertext: string,
  iv: string,
  salt: string,
  method: EncryptionMethod = 'AES-256-CBC',
  iterations?: number,
): Promise<string> {
  const key = deriveKey(password, salt, iterations);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertext),
  });

  let decrypted: CryptoJS.lib.WordArray;
  if (method === 'AES-256-CTR') {
    decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });
  } else {
    decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
  }

  const result = decrypted.toString(CryptoJS.enc.Utf8);
  if (!result) throw new Error('Decryption failed');
  return result;
}

export function encodeEncryptionMeta(
  method: EncryptionMethod,
  iv: string,
  salt: string,
  iterations?: number,
): string {
  if (iterations !== undefined) {
    return `${method}::${iv}::${salt}::${iterations}`;
  }
  return `${method}::${iv}::${salt}`;
}

export function decodeEncryptionMeta(
  meta: string,
): { method: EncryptionMethod; iv: string; salt: string; iterations?: number } {
  const parts = meta.split('::');
  const method = (parts[0] as EncryptionMethod) || 'AES-256-CBC';
  const iv = parts[1] || '';
  const salt = parts[2] || '';
  let iterations: number | undefined;
  if (parts[3]) {
    const n = parseInt(parts[3], 10);
    if (n > 0) iterations = n;
  }
  return { method, iv, salt, iterations };
}
