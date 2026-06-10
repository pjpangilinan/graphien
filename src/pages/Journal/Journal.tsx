import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as storage from '../../services/storage';
import {
  decryptData,
  encryptData,
  encodeEncryptionMeta,
  decodeEncryptionMeta,
  getIterations,
} from '../../services/encryption';
import { caesarEncrypt, caesarDecrypt, validateCaesarShift } from '../../services/cipher/caesar';
import { vigenereEncrypt, vigenereDecrypt, validateVigenereKeyword } from '../../services/cipher/vigenere';
import { atbashEncrypt, atbashDecrypt } from '../../services/cipher/atbash';
import { rot13Encrypt, rot13Decrypt } from '../../services/cipher/rot13';
import {
  substitutionEncrypt,
  substitutionDecrypt,
  validateSubstitutionAlphabet,
} from '../../services/cipher/substitution';
import { pigpenEncrypt, pigpenDecrypt, getPigpenPathData } from '../../services/cipher/pigpen';
import { generateId } from '../../utils/id';
import { useStore } from '../../store';
import { useToastStore } from '../../store/toast';
import type { JournalEntry, CipherType, EncryptionMethod, CipherMetadata, FontEntry } from '../../types/JournalEntry';

const PREMADE_TAGS = ['Personal', 'Work', 'Ideas', 'Health', 'Travel', 'Finance', 'Learning', 'Project'];

export default function Journal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storedPassword = useStore((s) => s.password);
  const setPassword = useStore((s) => s.setPassword);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [cipherType, setCipherType] = useState<CipherType>('none');
  const [caesarShift, setCaesarShift] = useState(0);
  const [vigenereKeyword, setVigenereKeyword] = useState('');
  const [substitutionAlphabet, setSubstitutionAlphabet] = useState('');
  const [loadError, setLoadError] = useState('');
  const [encMethod, setEncMethod] = useState<EncryptionMethod>('AES-256-CBC');

  const [tags, setTags] = useState<string[]>([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [promptPassword, setPromptPassword] = useState('');
  const [promptError, setPromptError] = useState('');
  const [pendingDecryptEntry, setPendingDecryptEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(id === 'new');
  const [pendingEditDecrypt, setPendingEditDecrypt] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [cipherRevealed, setCipherRevealed] = useState(false);
  const [pendingCipherReveal, setPendingCipherReveal] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeFontId = useStore((s) => s.activeFont);
  const setActiveFont = useStore((s) => s.setActiveFont);

  const savedRef = useRef({ title: '', content: '' });

  const hasUnsavedChanges = title !== savedRef.current.title || content !== savedRef.current.content;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (title !== savedRef.current.title || content !== savedRef.current.content) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [title, content]);

  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [symbolRenderMap, setSymbolRenderMap] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    storage.getAllFonts().then(setFonts);
  }, []);

  useEffect(() => {
    blobUrlsRef.current.forEach(URL.revokeObjectURL);
    blobUrlsRef.current = [];

    if (!activeFontId) {
      setSymbolRenderMap({});
      return;
    }

    let mounted = true;
    (async () => {
      const font = await storage.getFont(activeFontId);
      if (!font) return;
      const map: Record<string, string> = {};
      const urls: string[] = [];
      for (const mapping of font.mappings) {
        const symbol = await storage.getSymbol(mapping.symbolId);
        if (symbol) {
          const url = URL.createObjectURL(symbol.data);
          map[mapping.character] = url;
          urls.push(url);
        }
      }
      if (mounted) {
        blobUrlsRef.current = urls;
        setSymbolRenderMap(map);
      } else {
        urls.forEach(URL.revokeObjectURL);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeFontId]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const renderPreviewWithSymbols = (text: string, hideUnmapped = false) => {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (hideUnmapped) {
        const pd = getPigpenPathData(char);
        if (pd) {
          nodes.push(
            <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.5em" height="1.5em" className="inline-block align-text-bottom">
              <path d={pd.pathD} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" strokeLinejoin="miter" />
              {pd.hasDot && <circle cx={pd.dotCx} cy={pd.dotCy} r={3} fill="currentColor" />}
            </svg>
          );
        } else if (char === '\n') {
          nodes.push(<br key={i} />);
        } else {
          nodes.push(<span key={i} className="inline-block w-[0.15em]">&nbsp;</span>);
        }
      } else {
        const url = symbolRenderMap[char];
        if (url) {
          nodes.push(
            <img key={i} src={url} alt="" className="inline-block w-[1.5em] h-[1.5em] object-contain align-text-bottom" />
          );
        } else {
          nodes.push(<span key={i}>{char}</span>);
        }
      }
    }
    return nodes;
  };

  const getCipherMetadata = (): CipherMetadata | null => {
    if (cipherType === 'caesar') return { type: 'caesar', key: caesarShift };
    if (cipherType === 'vigenere') return { type: 'vigenere', key: vigenereKeyword };
    if (cipherType === 'substitution') return { type: 'substitution', key: substitutionAlphabet };
    if (cipherType === 'atbash') return { type: 'atbash', key: '' };
    if (cipherType === 'rot13') return { type: 'rot13', key: '' };
    if (cipherType === 'pigpen') return { type: 'pigpen', key: '' };
    return null;
  };

  const applyCipherToContent = (text: string, meta: CipherMetadata): string => {
    if (meta.type === 'caesar') return caesarEncrypt(text, meta.key as number);
    if (meta.type === 'vigenere') return vigenereEncrypt(text, meta.key as string);
    if (meta.type === 'atbash') return atbashEncrypt(text);
    if (meta.type === 'rot13') return rot13Encrypt(text);
    if (meta.type === 'substitution') return substitutionEncrypt(text, meta.key as string);
    if (meta.type === 'pigpen') return pigpenEncrypt(text);
    return text;
  };

  const reverseCipherOnContent = (text: string, meta: CipherMetadata): string => {
    if (meta.type === 'caesar') return caesarDecrypt(text, meta.key as number);
    if (meta.type === 'vigenere') return vigenereDecrypt(text, meta.key as string);
    if (meta.type === 'atbash') return atbashDecrypt(text);
    if (meta.type === 'rot13') return rot13Decrypt(text);
    if (meta.type === 'substitution') return substitutionDecrypt(text, meta.key as string);
    if (meta.type === 'pigpen') return pigpenDecrypt(text);
    return text;
  };

  const getPreviewText = (): string => {
    if (cipherType === 'none') return content;
    try {
      const meta = getCipherMetadata();
      if (!meta) return content;
      return applyCipherToContent(content, meta);
    } catch {
      return content;
    }
  };

  const tryDecryptEntry = async (entry: JournalEntry, pw: string, reverseForEdit = false) => {
    try {
      const { method, iv, salt, iterations } = entry.encryptionMethod
        ? decodeEncryptionMeta(entry.encryptionMethod)
        : { method: 'AES-256-CBC' as EncryptionMethod, iv: '', salt: '' };
      setEncMethod(method);
      const rawContent = await decryptData(pw, entry.content, iv, salt, method, iterations);
      let rawTitle = '';
      let rawBody = rawContent;
      try {
        const parsed = JSON.parse(rawContent);
        rawTitle = parsed.title ?? '';
        rawBody = parsed.content ?? rawContent;
      } catch {
        rawBody = rawContent;
        rawTitle = entry.title || '';
      }
      if (entry.cipher && reverseForEdit) {
        const decContent = reverseCipherOnContent(rawBody, entry.cipher);
        const decTitle = rawTitle ? reverseCipherOnContent(rawTitle, entry.cipher) : '';
        setContent(decContent);
        setTitle(decTitle);
        savedRef.current = { title: decTitle, content: decContent };
      } else {
        setContent(rawBody);
        setTitle(rawTitle);
        savedRef.current = { title: rawTitle, content: rawBody };
      }
      if (entry.cipher) {
        setCipherType(entry.cipher.type);
        if (entry.cipher.type === 'caesar') setCaesarShift(entry.cipher.key as number);
        if (entry.cipher.type === 'vigenere') setVigenereKeyword(entry.cipher.key as string);
        if (entry.cipher.type === 'substitution') setSubstitutionAlphabet(entry.cipher.key as string);
      }
      setTags(entry.tags || []);
      if (!storedPassword) setPassword(pw);
      setDecrypted(true);
      return true;
    } catch (err) {
      console.error('tryDecryptEntry failed:', err);
      return false;
    }
  };

  useEffect(() => {
    if (!id || id === 'new') return;
    (async () => {
      const loaded = await storage.getEntry(id);
      if (!loaded) {
        setLoadError('Entry not found.');
        return;
      }
      setEntry(loaded);
      setEntryId(loaded.id);
      setIsEditing(false);
      setDecrypted(false);
      if (loaded.cipher) {
        setCipherType(loaded.cipher.type);
        if (loaded.cipher.type === 'caesar') setCaesarShift(loaded.cipher.key as number);
        if (loaded.cipher.type === 'vigenere') setVigenereKeyword(loaded.cipher.key as string);
        if (loaded.cipher.type === 'substitution') setSubstitutionAlphabet(loaded.cipher.key as string);
      }
      setTags(loaded.tags || []);

      if (!loaded.encrypted) {
        if (loaded.cipher) {
          setContent(loaded.content);
          setTitle('');
          setCipherRevealed(false);
          savedRef.current = { title: '', content: loaded.content };
        } else {
          setContent(loaded.content);
          setTitle(loaded.title);
          savedRef.current = { title: loaded.title, content: loaded.content };
        }
        return;
      }

      // Encrypted entry: show raw ciphertext in view mode
      setContent(loaded.content);
      setTitle('');
      savedRef.current = { title: '', content: loaded.content };
    })();
  }, [id]);

  const handlePasswordSubmit = async () => {
    if (!promptPassword) return;
    setPromptError('');

    if (pendingCipherReveal) {
      if (promptPassword === storedPassword) {
        setShowPasswordPrompt(false);
        setPromptPassword('');
        setPendingCipherReveal(false);
        if (entry?.cipher) {
          const decContent = reverseCipherOnContent(content, entry.cipher);
          const decTitle = reverseCipherOnContent(title, entry.cipher);
          setContent(decContent);
          setTitle(decTitle);
          savedRef.current = { title: decTitle, content: decContent };
          setCipherRevealed(true);
        }
      } else {
        setPromptError('Incorrect password');
      }
      return;
    }

    if (!pendingDecryptEntry) return;
    const hasCipher = !!pendingDecryptEntry.cipher;
    const ok = await tryDecryptEntry(pendingDecryptEntry, promptPassword, pendingEditDecrypt);
    if (ok) {
      setShowPasswordPrompt(false);
      setPromptPassword('');
      if (pendingEditDecrypt) {
        setIsEditing(true);
        setPendingEditDecrypt(false);
        setDecrypted(false);
      } else {
        setCipherRevealed(!hasCipher);
      }
      setPendingDecryptEntry(null);
    } else {
      setPromptError('Incorrect password');
    }
  };

  const [entry, setEntry] = useState<JournalEntry | null>(null);

  const handleEditClick = () => {
    if (entry?.encrypted && !decrypted) {
      setPendingDecryptEntry(entry);
      setShowPasswordPrompt(true);
      setPromptPassword('');
      setPromptError('');
      setPendingEditDecrypt(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleRevealPlaintext = () => {
    if (!entry?.cipher) return;
    if (storedPassword) {
      setPendingCipherReveal(true);
      setShowPasswordPrompt(true);
      return;
    }
    const decContent = reverseCipherOnContent(content, entry.cipher);
    const decTitle = reverseCipherOnContent(title, entry.cipher);
    setContent(decContent);
    setTitle(decTitle);
    savedRef.current = { title: decTitle, content: decContent };
    setCipherRevealed(true);
  };

  const handleHidePlaintext = () => {
    if (!entry?.cipher) return;
    const encContent = applyCipherToContent(content, entry.cipher);
    const encTitle = applyCipherToContent(title, entry.cipher);
    setContent(encContent);
    setTitle(encTitle);
    savedRef.current = { title: encTitle, content: encContent };
    setCipherRevealed(false);
  };

  const handleSave = async (stay = false, silent = false) => {
    setSaving(true);
    if (!silent) setAutoSaveStatus('idle');
    try {
      const now = Date.now();
      const eid = entryId || generateId();
      const cipherMeta = getCipherMetadata();

      let finalContent = content;
      let finalTitle = title;
      if (cipherMeta) {
        finalContent = applyCipherToContent(content, cipherMeta);
        finalTitle = applyCipherToContent(title, cipherMeta);
      }

      let encrypted = false;
      let encryptionMethod: string | undefined;
      if (storedPassword) {
        const combined = JSON.stringify({ title: finalTitle, content: finalContent });
        const result = await encryptData(storedPassword, combined, encMethod);
        finalContent = result.ciphertext;
        finalTitle = '';
        encryptionMethod = encodeEncryptionMeta(result.method, result.iv, result.salt, getIterations());
        encrypted = true;
      }

      const entry: JournalEntry = {
        id: eid,
        title: finalTitle,
        content: finalContent,
        createdAt: entryId ? (await storage.getEntry(eid))?.createdAt || now : now,
        updatedAt: now,
        encrypted,
        encryptionMethod,
        cipher: cipherMeta,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (entryId) {
        await storage.updateEntry(entry);
      } else {
        await storage.addEntry(entry);
        setEntryId(eid);
      }
      savedRef.current = { title, content };
      if (silent) {
        setAutoSaveStatus('saved');
      } else {
        addToast('Entry saved', 'success');
      }
      if (!silent && !stay) navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('Save failed: ' + msg.slice(0, 100), 'error');
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const cipherConfigValid =
    cipherType === 'none' ||
    (cipherType === 'caesar' && validateCaesarShift(caesarShift)) ||
    (cipherType === 'vigenere' && validateVigenereKeyword(vigenereKeyword)) ||
    (cipherType === 'substitution' && validateSubstitutionAlphabet(substitutionAlphabet)) ||
    cipherType === 'atbash' ||
    cipherType === 'rot13' ||
    cipherType === 'pigpen';

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const cipherValidRef = useRef(cipherConfigValid);
  cipherValidRef.current = cipherConfigValid;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (cipherValidRef.current) handleSaveRef.current();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Auto-save after 4 seconds of inactivity
  useEffect(() => {
    if (!isEditing) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!hasUnsavedChanges) return;
    if (!cipherConfigValid) return;
    if (!entryId && (!title && !content)) return;

    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      handleSaveRef.current(true, true);
    }, 4000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, tags, cipherType, isEditing, entryId, cipherConfigValid, hasUnsavedChanges]);

  if (loadError) {
    return <p className="text-center text-red-500">{loadError}</p>;
  }

  if (showPasswordPrompt && (pendingDecryptEntry || pendingCipherReveal)) {
    const isEditPrompt = pendingEditDecrypt;
    const isCipherReveal = pendingCipherReveal;
    return (
      <div className="retro-border p-6 bg-white dark:bg-gray-800 max-w-sm w-full mx-auto mt-8">
        <h2 className="text-lg font-bold mb-4 text-center">Password Required</h2>
        {pendingDecryptEntry && (
          <>
            <p className="text-xs text-gray-500 text-center mb-1">
              {pendingDecryptEntry.title || 'Untitled'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-4">
              {new Date(pendingDecryptEntry.createdAt).toLocaleDateString()}
            </p>
          </>
        )}
        <p className="text-sm text-gray-500 mb-4 text-center">{isCipherReveal ? 'Enter your password to reveal the plaintext.' : isEditPrompt ? 'Enter your password to edit this entry.' : 'Enter the password to view this entry.'}</p>
        <input
          type="password"
          placeholder="Password"
          value={promptPassword}
          onChange={(e) => setPromptPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          className="w-full px-3 py-2 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none mb-3 text-center"
          autoFocus
        />
        {promptError && <p className="text-sm text-red-500 text-center mb-3">{promptError}</p>}
        <button
          onClick={handlePasswordSubmit}
          disabled={!promptPassword}
          className="w-full px-4 py-2 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold disabled:opacity-50 hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none mb-2"
        >
          Unlock
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full px-4 py-2 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none"
        >
          Back
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-full">
        <input
          type="text"
          placeholder="Entry title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 text-xl font-bold retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none text-center"
        />

        <textarea
          ref={textareaRef}
          placeholder="Write your journal entry..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            const el = textareaRef.current;
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
          rows={5}
          className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none resize-none"
        />

        <div className="space-y-2">
          <div className="flex flex-wrap justify-center gap-1">
            {PREMADE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={`px-2 py-0.5 text-[11px] cursor-pointer select-none rounded-sm ${
                  tags.includes(tag)
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="custom tags..."
            value={tags.filter((t) => !PREMADE_TAGS.includes(t)).join(', ')}
            onChange={(e) => {
              const raw = e.target.value;
              const custom = raw.split(',').map((s) => s.trim()).filter(Boolean);
              const builtin = tags.filter((t) => PREMADE_TAGS.includes(t));
              setTags(raw ? [...builtin, ...custom] : builtin);
            }}
            className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-transparent outline-none text-center text-xs text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600"
          />
        </div>

        <div className="retro-border p-5 bg-white dark:bg-gray-800">
          <h3 className="font-bold mb-3 text-center">Cipher Preview</h3>
          <div
            className={`p-4 bg-gray-100 dark:bg-gray-700 min-h-[3rem] whitespace-pre-wrap text-sm break-all${cipherType === 'pigpen' || activeFontId ? ' select-none' : ''}`}
            onCopy={cipherType === 'pigpen' || activeFontId ? ((e) => e.preventDefault()) : undefined}
          >
            {cipherConfigValid ? renderPreviewWithSymbols(getPreviewText(), cipherType === 'pigpen') : 'Invalid cipher configuration'}
          </div>
        </div>

        {fonts.length > 0 && (
          <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-4">
            <h3 className="font-bold text-center">Active Font</h3>
            <select
              value={activeFontId || ''}
              onChange={(e) => setActiveFont(e.target.value || null)}
              className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none text-center"
            >
              <option value="">None</option>
              {fonts.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 text-center">Mapped characters appear as symbols in Cipher Preview above</p>
          </div>
        )}

        <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-4">
          <h3 className="font-bold text-center">Cipher Settings</h3>
          <select
            value={cipherType}
            onChange={(e) => setCipherType(e.target.value as CipherType)}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none text-center"
          >
            <option value="none">None</option>
            <option value="caesar">Caesar</option>
            <option value="vigenere">Vigenère</option>
            <option value="atbash">Atbash</option>
            <option value="substitution">Simple Substitution</option>
            <option value="pigpen">Pigpen</option>
          </select>

          {cipherType === 'caesar' && (
            <div>
              <label className="block text-sm mb-1 text-center">Shift: {caesarShift}</label>
              <input
                type="range"
                min={0}
                max={25}
                value={caesarShift}
                onChange={(e) => setCaesarShift(parseInt(e.target.value) || 0)}
                className="w-full accent-gray-800 dark:accent-gray-200"
              />
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>A</span>
                <span>Z</span>
              </div>
            </div>
          )}

          {cipherType === 'vigenere' && (
            <div className="space-y-3">
              <label className="block text-sm mb-1 text-center">Keyword</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vigenereKeyword}
                  onChange={(e) => setVigenereKeyword(e.target.value)}
                  className="flex-1 px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 outline-none text-center font-mono"
                />
                <button
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const len = 4 + Math.floor(Math.random() * 8);
                    let kw = '';
                    for (let i = 0; i < len; i++) kw += chars[Math.floor(Math.random() * 26)];
                    setVigenereKeyword(kw);
                  }}
                  className="px-3 py-1.5 text-sm retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none shrink-0"
                >
                  Random
                </button>
              </div>
            </div>
          )}

          {cipherType === 'substitution' && (
            <div className="space-y-3">
              <label className="block text-sm mb-1 text-center">Alphabet (26-letter A-Z mapping)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={substitutionAlphabet}
                  onChange={(e) => setSubstitutionAlphabet(e.target.value.toUpperCase())}
                  maxLength={26}
                  placeholder="QWERTYUIOPASDFGHJKLZXCVBNM"
                  className="flex-1 px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 outline-none text-center font-mono text-sm"
                />
                <button
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                    for (let i = chars.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [chars[i], chars[j]] = [chars[j], chars[i]];
                    }
                    setSubstitutionAlphabet(chars.join(''));
                  }}
                  className="px-3 py-1.5 text-sm retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none shrink-0"
                >
                  Random
                </button>
              </div>
            </div>
          )}

          {(cipherType === 'atbash' || cipherType === 'pigpen') && (
            <p className="text-xs text-gray-500 text-center">No additional configuration needed.</p>
          )}
        </div>

        <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-4">
          <h3 className="font-bold text-center">Modern Encryption</h3>
          <select
            value={encMethod}
            onChange={(e) => setEncMethod(e.target.value as EncryptionMethod)}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none outline-none text-center"
          >
            <option value="AES-256-CBC">AES-256-CBC (default)</option>
            <option value="AES-256-CTR">AES-256-CTR</option>
          </select>
          <p className="text-xs text-gray-500 text-center">
            {storedPassword
              ? 'Encryption active'
              : 'Set a password in Settings to enable encryption'}
          </p>
        </div>

        <div className="space-y-4">
          {autoSaveStatus === 'saving' && (
            <p className="text-xs text-center text-gray-400">Saving...</p>
          )}
          {autoSaveStatus === 'saved' && (
            <p className="text-xs text-center text-green-500">Auto-saved</p>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="w-full px-8 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold disabled:opacity-50 hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="w-full px-8 py-3 retro-border bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900 font-bold disabled:opacity-50 hover:bg-gray-600 dark:hover:bg-gray-400 cursor-pointer select-none"
          >
            {saving ? 'Saving...' : 'Save & Continue Editing'}
          </button>
          <button
            onClick={() => {
              if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) return;
              navigate('/');
            }}
            className="w-full px-8 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="retro-border p-5 bg-white dark:bg-gray-800">
        <h2 className="text-xl font-bold text-center break-all">
          {decrypted ? title : (entry?.encrypted ? '🔒 Encrypted' : (title || 'Untitled'))}
        </h2>
        <p className="text-xs text-center text-gray-500 mt-2 flex flex-wrap justify-center gap-x-2">
          <span>{entry && new Date(entry.createdAt).toLocaleDateString()}</span>
          {entry?.encrypted && <span>· 🔒 Encrypted</span>}
          {entry?.cipher && <span>· {entry.cipher.type}</span>}
          {entry?.encryptionMethod && (
            <span>· {entry.encryptionMethod.split('::')[0]}</span>
          )}
        </p>
      </div>

      <div className={`retro-border p-5 bg-white dark:bg-gray-800 min-h-[8rem] whitespace-pre-wrap text-sm break-all${entry?.cipher && (!cipherRevealed || entry.cipher.type === 'pigpen') ? ' select-none' : ''}`}
        onCopy={entry?.cipher && (!cipherRevealed || entry.cipher.type === 'pigpen') ? ((e) => e.preventDefault()) : undefined}>
        {entry?.encrypted && !decrypted ? (
          <>
            <p className="text-xs text-gray-400 mb-2 italic">Raw encrypted data (ciphertext):</p>
            {content || <span className="text-gray-400 italic">No content</span>}
          </>
        ) : entry?.cipher && !cipherRevealed ? (
          <div className={`${entry.cipher.type === 'pigpen' ? '' : ''}`}>
            {content ? renderPreviewWithSymbols(content, entry.cipher.type === 'pigpen') : <span className="text-gray-400 italic">No content</span>}
          </div>
        ) : (
          content || <span className="text-gray-400 italic">No content</span>
        )}
      </div>

      <div className="space-y-4 w-full">
        {entry?.encrypted && !decrypted && (
          <button
            onClick={() => {
              setPendingDecryptEntry(entry);
              setShowPasswordPrompt(true);
              setPromptPassword('');
              setPromptError('');
              setPendingEditDecrypt(false);
            }}
            className="w-full px-8 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            View Decrypted
          </button>
        )}
        {entry?.encrypted && decrypted && (
          <button
            onClick={() => {
              setDecrypted(false);
              setContent(entry.content);
              setTitle('');
              savedRef.current = { title: '', content: entry.content };
            }}
            className="w-full px-8 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            Show Encrypted
          </button>
        )}
        {entry?.cipher && !cipherRevealed && (decrypted || !entry?.encrypted) && (
          <button
            onClick={handleRevealPlaintext}
            className="w-full px-8 py-3 retro-border bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900 font-bold hover:bg-gray-600 dark:hover:bg-gray-400 cursor-pointer select-none"
          >
            Reverse Cipher
          </button>
        )}
        {entry?.cipher && cipherRevealed && (decrypted || !entry?.encrypted) && (
          <button
            onClick={handleHidePlaintext}
            className="w-full px-8 py-3 retro-border bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900 font-bold hover:bg-gray-600 dark:hover:bg-gray-400 cursor-pointer select-none"
          >
            Show Ciphered
          </button>
        )}
        <button
          onClick={handleEditClick}
          className="w-full px-8 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
        >
          {entry?.encrypted ? 'Edit (requires password)' : 'Edit'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full px-8 py-3 retro-border bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none"
        >
          Back
        </button>
      </div>
    </div>
  );
}
