import { caesarEncrypt, caesarDecrypt } from './caesar';

export function rot13Encrypt(text: string): string {
  return caesarEncrypt(text, 13);
}

export function rot13Decrypt(text: string): string {
  return caesarDecrypt(text, 13);
}

export function validateRot13(_key?: string): boolean {
  return true;
}
