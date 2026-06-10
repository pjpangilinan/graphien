import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getAllEntries,
  addEntry,
  getEntry,
  deleteEntry,
} from './storage/index';
import { encryptData, decryptData, setIterations, getIterations, encodeEncryptionMeta, decodeEncryptionMeta } from './encryption/index';

beforeAll(() => {
  setIterations(1000);
});
import { caesarEncrypt, caesarDecrypt } from './cipher/caesar';
import { vigenereEncrypt, vigenereDecrypt } from './cipher/vigenere';
import { atbashEncrypt, atbashDecrypt } from './cipher/atbash';
import { rot13Encrypt, rot13Decrypt } from './cipher/rot13';
import {
  substitutionEncrypt,
  substitutionDecrypt,
} from './cipher/substitution';
import { pigpenEncrypt, pigpenDecrypt } from './cipher/pigpen';
import { generateId } from '../utils/id';
import type { JournalEntry, CipherMetadata, EncryptionMethod } from '../types/JournalEntry';

const METHODS: EncryptionMethod[] = ['AES-256-CBC', 'AES-256-CTR'];
const PASSWORD = 'integration-test-password';

function applyCipher(text: string, meta: CipherMetadata): string {
  switch (meta.type) {
    case 'caesar': return caesarEncrypt(text, meta.key as number);
    case 'vigenere': return vigenereEncrypt(text, meta.key as string);
    case 'atbash': return atbashEncrypt(text);
    case 'rot13': return rot13Encrypt(text);
    case 'substitution': return substitutionEncrypt(text, meta.key as string);
    case 'pigpen': return pigpenEncrypt(text);
    default: return text;
  }
}

function reverseCipher(text: string, meta: CipherMetadata): string {
  switch (meta.type) {
    case 'caesar': return caesarDecrypt(text, meta.key as number);
    case 'vigenere': return vigenereDecrypt(text, meta.key as string);
    case 'atbash': return atbashDecrypt(text);
    case 'rot13': return rot13Decrypt(text);
    case 'substitution': return substitutionDecrypt(text, meta.key as string);
    case 'pigpen': return pigpenDecrypt(text);
    default: return text;
  }
}

beforeEach(async () => {
  const existing = await getAllEntries();
  for (const e of existing) {
    await deleteEntry(e.id);
  }
});

describe('full integration: create → cipher → encrypt → store → load → decrypt → reverse', () => {
  const ciphers: { name: string; meta: CipherMetadata }[] = [
    { name: 'none', meta: { type: 'none', key: '' } },
    { name: 'caesar', meta: { type: 'caesar', key: 3 } },
    { name: 'vigenere', meta: { type: 'vigenere', key: 'key' } },
    { name: 'atbash', meta: { type: 'atbash', key: '' } },
    { name: 'rot13', meta: { type: 'rot13', key: '' } },
    { name: 'substitution', meta: { type: 'substitution', key: 'QWERTYUIOPASDFGHJKLZXCVBNM' } },
    { name: 'pigpen', meta: { type: 'pigpen', key: '' } },
  ];

  const plaintext = 'Hello World 123!';
  const plainTitle = 'My Entry';

  for (const encryptionMethod of METHODS) {
    for (const { name, meta } of ciphers) {
      it(`works with ${encryptionMethod} + ${name}`, async () => {
        const eid = generateId();

        const cipherText = meta.type === 'none' ? plaintext : applyCipher(plaintext, meta);
        const cipherTitle = meta.type === 'none' ? plainTitle : applyCipher(plainTitle, meta);

        const combined = JSON.stringify({ title: cipherTitle, content: cipherText });
        const enc = await encryptData(PASSWORD, combined, encryptionMethod);

        const entry: JournalEntry = {
          id: eid,
          title: '',
          content: enc.ciphertext,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          encrypted: true,
          encryptionMethod: encodeEncryptionMeta(enc.method, enc.iv, enc.salt, getIterations()),
          cipher: meta.type === 'none' ? null : meta,
        };

        await addEntry(entry);

        const loaded = await getEntry(eid);
        expect(loaded).toBeDefined();
        expect(loaded!.encrypted).toBe(true);

        const { method, iv, salt, iterations } = decodeEncryptionMeta(loaded!.encryptionMethod!);

        const rawContent = await decryptData(PASSWORD, loaded!.content, iv, salt, method, iterations);

        const parsed = JSON.parse(rawContent);
        const decryptedTitle = parsed.title ?? '';
        const decryptedBody = parsed.content ?? rawContent;

        const finalContent = loaded!.cipher ? reverseCipher(decryptedBody, loaded!.cipher) : decryptedBody;
        const finalTitle = loaded!.cipher ? reverseCipher(decryptedTitle, loaded!.cipher) : decryptedTitle;

        expect(finalContent).toBe(plaintext);
        expect(finalTitle).toBe(plainTitle);
      });
    }
  }
});

describe('non-encrypted save/load with cipher', () => {
  it('saves and loads a ciphered plain entry', async () => {
    const eid = generateId();
    const meta: CipherMetadata = { type: 'caesar', key: 5 };
    const cipheredContent = applyCipher('Secret message', meta);
    const cipheredTitle = applyCipher('Title', meta);

    const entry: JournalEntry = {
      id: eid,
      title: cipheredTitle,
      content: cipheredContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encrypted: false,
      cipher: meta,
    };

    await addEntry(entry);

    const loaded = await getEntry(eid);
    expect(loaded).toBeDefined();

    const finalContent = loaded!.cipher ? reverseCipher(loaded!.content, loaded!.cipher) : loaded!.content;
    const finalTitle = loaded!.cipher ? reverseCipher(loaded!.title, loaded!.cipher) : loaded!.title;

    expect(finalContent).toBe('Secret message');
    expect(finalTitle).toBe('Title');
  });
});

describe('multiple entries search', () => {
  it('saves multiple entries and lists them', async () => {
    const e1: JournalEntry = { id: generateId(), title: 'A', content: 'First', createdAt: 1, updatedAt: 1, encrypted: false };
    const e2: JournalEntry = { id: generateId(), title: 'B', content: 'Second', createdAt: 2, updatedAt: 2, encrypted: false };
    const e3: JournalEntry = { id: generateId(), title: 'C', content: 'Third', createdAt: 3, updatedAt: 3, encrypted: false };

    await addEntry(e1);
    await addEntry(e2);
    await addEntry(e3);

    const all = await getAllEntries();
    expect(all.length).toBeGreaterThanOrEqual(3);
  });
});
