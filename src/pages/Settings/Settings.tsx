import { useState } from 'react';
import { useStore } from '../../store';
import { useToastStore } from '../../store/toast';
import * as storage from '../../services/storage';
import type { EncryptionMethod } from '../../types/JournalEntry';
import { getIterations, setIterations, encryptData, decryptData, encodeEncryptionMeta, decodeEncryptionMeta } from '../../services/encryption';

export default function Settings() {
  const password = useStore((s) => s.password);
  const setPassword = useStore((s) => s.setPassword);
  const rememberMe = useStore((s) => s.rememberMe);
  const setRememberMe = useStore((s) => s.setRememberMe);
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const addToast = useToastStore((s) => s.addToast);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgType, setPasswordMsgType] = useState<'success' | 'error'>('success');
  const [changeMode, setChangeMode] = useState(false);
  const [iterations, setLocalIterations] = useState(getIterations());

  const handleSetPassword = () => {
    if (newPassword.length < 4) {
      setPasswordMsg('Password must be at least 4 characters.');
      setPasswordMsgType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setPasswordMsgType('error');
      return;
    }
    setPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg('Password set successfully.');
    setPasswordMsgType('success');
  };

  const handleChangePassword = async () => {
    if (oldPassword.length < 4) {
      setPasswordMsg('Current password is required.');
      setPasswordMsgType('error');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg('New password must be at least 4 characters.');
      setPasswordMsgType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setPasswordMsgType('error');
      return;
    }
    try {
      const entries = await storage.getAllEntries();
      const encryptedEntries = entries.filter(e => e.encrypted);
      if (encryptedEntries.length > 0) {
        const entry = encryptedEntries[0];
        const { method, iv, salt, iterations } = entry.encryptionMethod
          ? decodeEncryptionMeta(entry.encryptionMethod)
          : { method: 'AES-256-CBC' as EncryptionMethod, iv: '', salt: '', iterations: undefined };
        await decryptData(oldPassword, entry.content, iv, salt, method, iterations);
        for (const e of encryptedEntries) {
          const meta = e.encryptionMethod
            ? decodeEncryptionMeta(e.encryptionMethod)
            : { method: 'AES-256-CBC' as EncryptionMethod, iv: '', salt: '', iterations: undefined };
          const rawContent = await decryptData(oldPassword, e.content, meta.iv, meta.salt, meta.method, meta.iterations);
          const result = await encryptData(newPassword, rawContent, meta.method);
          e.content = result.ciphertext;
          e.encryptionMethod = encodeEncryptionMeta(result.method, result.iv, result.salt, getIterations());
          await storage.updateEntry(e);
        }
      }
      setPassword(newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangeMode(false);
      setPasswordMsg('Password changed successfully.');
      setPasswordMsgType('success');
    } catch {
      setPasswordMsg('Current password is incorrect.');
      setPasswordMsgType('error');
    }
  };

  const handleClearPassword = () => {
    setPassword(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangeMode(false);
    setPasswordMsg('Password cleared. Any encrypted entries can no longer be decrypted.');
    setPasswordMsgType('success');
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleExport = async () => {
    const entries = await storage.getAllEntries();
    const symbols = await storage.getAllSymbols();
    const mappings = await storage.getAllMappings();
    const fonts = await storage.getAllFonts();

    const symbolsForExport = await Promise.all(
      symbols.map(async (s) => ({ ...s, data: await blobToBase64(s.data) })),
    );
    const fontsForExport = await Promise.all(
      fonts.map(async (f) => ({ ...f, data: await blobToBase64(f.data) })),
    );

    const blob = new Blob(
      [JSON.stringify({ entries, symbols: symbolsForExport, mappings, fonts: fontsForExport }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graphien-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEncryptedExport = async () => {
    if (!password) return;
    try {
      const entries = await storage.getAllEntries();
      const symbols = await storage.getAllSymbols();
      const mappings = await storage.getAllMappings();
      const fonts = await storage.getAllFonts();
      const symbolsForExport = await Promise.all(
        symbols.map(async (s) => ({ ...s, data: await blobToBase64(s.data) })),
      );
      const fontsForExport = await Promise.all(
        fonts.map(async (f) => ({ ...f, data: await blobToBase64(f.data) })),
      );
      const json = JSON.stringify({ entries, symbols: symbolsForExport, mappings, fonts: fontsForExport });
      const result = await encryptData(password, json, 'AES-256-CBC');
      const payload = JSON.stringify({ encrypted: true, ...result });
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graphien-export-${Date.now()}.json.enc`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Encrypted export downloaded', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('Export failed: ' + msg.slice(0, 100), 'error');
      console.error('Export failed:', err);
    }
  };

  const importObjects = async <T extends { id: string }>(
    objects: Record<string, unknown>[] | undefined,
    getExisting: () => Promise<T[]>,
    addFn: (obj: T) => Promise<void>,
  ) => {
    if (!objects?.length) return { imported: 0, skipped: 0 };
    const existing = new Set((await getExisting()).map((o) => o.id));
    let imported = 0;
    let skipped = 0;
    for (const obj of objects) {
      const restored = (typeof obj.data === 'string' && obj.data.startsWith('data:')
        ? { ...obj, data: base64ToBlob(obj.data as string) }
        : obj) as unknown as T;
      if (existing.has(restored.id)) {
        skipped++;
      } else {
        await addFn(restored);
        imported++;
      }
    }
    return { imported, skipped };
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const parsed = data.encrypted
        ? (() => {
            if (!password) throw new Error('Password required');
            return decryptData(password, data.ciphertext, data.iv, data.salt, data.method).then(JSON.parse);
          })()
        : data;

      const resolved = await parsed;

      if (!resolved.entries && !resolved.symbols && !resolved.mappings && !resolved.fonts) {
        addToast('Invalid import file', 'error');
        return;
      }

      const r1 = await importObjects(resolved.entries, storage.getAllEntries, storage.addEntry);
      const r2 = await importObjects(resolved.symbols, storage.getAllSymbols, storage.addSymbol);
      const r3 = await importObjects(resolved.mappings, storage.getAllMappings, storage.addMapping);
      const r4 = await importObjects(resolved.fonts, storage.getAllFonts, storage.addFont);

      const totalImported = r1.imported + r2.imported + r3.imported + r4.imported;
      const totalSkipped = r1.skipped + r2.skipped + r3.skipped + r4.skipped;
      const msg = `Imported ${totalImported} item(s)${totalSkipped > 0 ? `, ${totalSkipped} duplicate(s) skipped` : ''}`;
      addToast(msg, totalImported > 0 ? 'success' : 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('Import failed: ' + msg.slice(0, 100), 'error');
      console.error('Import failed:', err);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div className="retro-border p-5 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-4">Password</h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 outline-none"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 outline-none"
          />
          <div className="space-y-3">
            {changeMode ? (
              <>
                <input
                  type="password"
                  placeholder="Current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
                  >
                    Confirm Change
                  </button>
                  <button
                    onClick={() => { setChangeMode(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMsg(''); }}
                    className="px-4 py-3 retro-border bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer select-none"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleSetPassword}
                className="w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
              >
                Set Password
              </button>
            )}
            {password && !changeMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => setChangeMode(true)}
                  className="flex-1 px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
                >
                  Change Password
                </button>
                <button
                  onClick={handleClearPassword}
                  className="flex-1 px-6 py-3 retro-border bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer select-none"
                >
                  Clear Password
                </button>
              </div>
            )}
          </div>
          {passwordMsg && (
            <p className={`text-sm mt-2 ${passwordMsgType === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {passwordMsg}
            </p>
          )}
          {password && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Password is set (in memory only).
            </p>
          )}
        </div>
      </div>

      <div className="retro-border p-5 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-4">Preferences</h2>
        <label className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
          Dark Mode
        </label>
        <label className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember Me (session)
        </label>
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm mb-1">PBKDF2 Iterations</label>
          <input
            type="number"
            min={1000}
            max={1000000}
            step={1000}
            value={iterations}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (n >= 1000 && n <= 1000000) {
                setIterations(n);
                setLocalIterations(n);
              }
            }}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 outline-none text-center"
          />
          <p className="text-xs text-gray-500 mt-2">Higher = more secure but slower. Default: 10,000. Stored per-entry on save.</p>
        </div>
      </div>

      <div className="retro-border p-5 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-4">Data</h2>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            Export JSON
          </button>
          {password && (
            <button
              onClick={handleEncryptedExport}
              className="w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
            >
              Export Encrypted
            </button>
          )}
          <div>
            <label className="text-sm block mb-2">Import JSON:</label>
            <label className="block w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none text-center text-sm">
              Choose File
              <input type="file" accept=".json,.json.enc" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
