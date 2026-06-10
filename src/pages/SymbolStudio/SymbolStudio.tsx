import { useState, useEffect, useRef, useCallback } from 'react';
import * as storage from '../../services/storage';
import { generateFont } from '../../services/font/generator';
import { generateId } from '../../utils/id';
import { useToastStore } from '../../store/toast';
import FontList from '../../components/FontGenerator/FontList';
import type { SymbolImage, GlyphMapping, FontEntry } from '../../types/JournalEntry';

const PRINTABLE_ASCII = /^[\x20-\x7E]$/;

export default function SymbolStudio() {
  const addToast = useToastStore((s) => s.addToast);
  const [symbols, setSymbols] = useState<SymbolImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [symbolUrls, setSymbolUrls] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [fontName, setFontName] = useState('');
  const [generatingFont, setGeneratingFont] = useState(false);
  const [editingFontId, setEditingFontId] = useState<string | null>(null);
  const [selectedSymbolIds, setSelectedSymbolIds] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState('');
  const [charErrors, setCharErrors] = useState<Record<string, string>>({});
  const [fontListKey, setFontListKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setSymbols(await storage.getAllSymbols());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    symbols.forEach((s) => {
      urls[s.id] = URL.createObjectURL(s.data);
    });
    setSymbolUrls(urls);
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [symbols]);

  const handleEditFont = async (fontId: string) => {
    const font = await storage.getFont(fontId);
    if (!font) return;
    setEditingFontId(fontId);
    setFontName(font.name);
    setSelectedSymbolIds(font.mappings.map((m) => m.symbolId));
    const m: Record<string, string> = {};
    font.mappings.forEach((mapping) => {
      m[mapping.symbolId] = mapping.character;
    });
    setMappings(m);
    setNameError('');
    setCharErrors({});
    cardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewFont = () => {
    setEditingFontId(null);
    setFontName('');
    setSelectedSymbolIds([]);
    setMappings({});
    setNameError('');
    setCharErrors({});
    cardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFiles = async (files: FileList | null) => {
    setUploadError('');
    if (!files || files.length === 0) return;
    setUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError((prev) => (prev ? prev + '\n"' + file.name + '" exceeds 2 MB.' : '"' + file.name + '" exceeds 2 MB.'));
        continue;
      }
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        setUploadError((prev) => (prev ? prev + '\n"' + file.name + '" is not a supported image type.' : '"' + file.name + '" is not a supported image type.'));
        continue;
      }
      const blob = await file.arrayBuffer();
      const name = file.name.replace(/\.[^.]+$/, '');
      const symbol: SymbolImage = {
        id: generateId(),
        name,
        data: new Blob([blob], { type: file.type }),
        mimeType: file.type,
        uploadedAt: Date.now(),
      };
      await storage.addSymbol(symbol);
      count++;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
    await loadData();
    if (count > 0) addToast(count + ' symbol(s) uploaded', 'success');
  };

  const toggleSymbol = (symbolId: string) => {
    setSelectedSymbolIds((prev) => {
      if (prev.includes(symbolId)) {
        const next = prev.filter((id) => id !== symbolId);
        setMappings((m) => {
          const updated = { ...m };
          delete updated[symbolId];
          return updated;
        });
        return next;
      }
      return [...prev, symbolId];
    });
    setCharErrors((prev) => {
      const updated = { ...prev };
      delete updated[symbolId];
      return updated;
    });
  };

  const handleAutoMap = () => {
    const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let idx = 0;
    const used = new Set(Object.values(mappings).filter((c) => c));
    for (const sym of symbols) {
      if (!selectedSymbolIds.includes(sym.id)) continue;
      if (mappings[sym.id]) continue;
      while (idx < pool.length && used.has(pool[idx])) idx++;
      if (idx >= pool.length) break;
      setMappings((prev) => ({ ...prev, [sym.id]: pool[idx] }));
      used.add(pool[idx]);
      idx++;
    }
    addToast('Auto-mapped selected symbols', 'success');
  };

  const handleMappingChange = (symbolId: string, character: string) => {
    const ch = character.slice(0, 1);
    setMappings((prev) => {
      if (!ch) {
        const next = { ...prev };
        delete next[symbolId];
        return next;
      }
      return { ...prev, [symbolId]: ch };
    });
    setCharErrors((prev) => {
      const next = { ...prev };
      delete next[symbolId];
      return next;
    });
  };

  const handleDeleteSymbol = async (id: string) => {
    await storage.deleteSymbol(id);
    const allFonts = await storage.getAllFonts();
    const toDelete = allFonts.filter((f) => f.mappings.some((m) => m.symbolId === id));
    for (const font of toDelete) {
      await storage.deleteFont(font.id);
    }
    if (toDelete.length > 0) {
      addToast('Deleted ' + toDelete.length + ' font(s) that used this symbol', 'info');
    }
    setSelectedSymbolIds((prev) => prev.filter((sid) => sid !== id));
    setMappings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeleteConfirm(null);
    await loadData();
  };

  const handleGenerateFont = async () => {
    if (generatingFont) return;
    setGeneratingFont(true);
    try {
      if (!fontName.trim()) {
        setNameError('Font name is required.');
        setGeneratingFont(false);
        return;
      }

      const allFonts = await storage.getAllFonts();
      const duplicate = allFonts.find(
        (f) => f.name.toLowerCase() === fontName.trim().toLowerCase() && f.id !== editingFontId,
      );
      if (duplicate) {
        setNameError('"' + fontName.trim() + '" already exists.');
        setGeneratingFont(false);
        return;
      }

      const selected = symbols.filter((s) => selectedSymbolIds.includes(s.id));
      if (selected.length === 0) {
        addToast('Select at least one symbol.', 'error');
        setGeneratingFont(false);
        return;
      }

      const charSet = new Set<string>();
      const newCharErrors: Record<string, string> = {};
      let hasError = false;
      for (const sym of selected) {
        const ch = mappings[sym.id];
        if (!ch) {
          newCharErrors[sym.id] = 'Required';
          hasError = true;
          continue;
        }
        if (!PRINTABLE_ASCII.test(ch)) {
          newCharErrors[sym.id] = 'Invalid char';
          hasError = true;
          continue;
        }
        if (charSet.has(ch)) {
          newCharErrors[sym.id] = '"' + ch + '" used twice';
          hasError = true;
        }
        charSet.add(ch);
      }
      setCharErrors(newCharErrors);

      if (hasError) {
        setGeneratingFont(false);
        return;
      }

      const glyphMappings: GlyphMapping[] = selected.map((sym) => ({
        id: generateId(),
        symbolId: sym.id,
        character: mappings[sym.id],
      }));

      const fontData = await generateFont(
        glyphMappings.map((m) => {
          const sym = symbols.find((s) => s.id === m.symbolId)!;
          return { character: m.character, imageData: sym.data };
        }),
      );

      if (editingFontId) {
        const existing = await storage.getFont(editingFontId);
        if (existing) {
          const updated: FontEntry = { ...existing, name: fontName.trim(), data: fontData, mappings: glyphMappings };
          await storage.updateFont(updated);
          addToast('Font "' + fontName + '" updated', 'success');
        }
        setEditingFontId(null);
      } else {
        const font: FontEntry = {
          id: generateId(),
          name: fontName.trim(),
          data: fontData,
          mappings: glyphMappings,
          createdAt: Date.now(),
        };
        await storage.addFont(font);
        addToast('Font "' + fontName + '" generated', 'success');
      }

      setFontName('');
      setSelectedSymbolIds([]);
      setMappings({});
      setNameError('');
      setCharErrors({});
      setFontListKey((k) => k + 1);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('Font generation failed: ' + msg.slice(0, 100), 'error');
      console.error('Font generation failed:', err);
    } finally {
      setGeneratingFont(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Guide */}
      <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-4">
        <h2 className="text-lg font-bold">How to Create Your Own Cipher</h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-3">
            <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0">1.</span>
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200">Upload your symbols</span>
              <span> -- Select multiple images (PNG, JPG, SVG) at once.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0">2.</span>
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200">Check the symbols you want</span>
              <span> -- Tick the ones to include in this font. Each font can have a different set.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0">3.</span>
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200">Map them to keyboard keys</span>
              <span> -- Click &quot;Auto Map&quot; or type a single character in the box below each checked symbol.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0">4.</span>
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200">Generate or Update</span>
              <span> -- Give your font a name and click the button. Edit existing fonts anytime.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 1: Symbol Library */}
      <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-6">
        <h2 className="text-lg font-bold">Symbol Library</h2>

        <div>
          <div
            className={'retro-border p-4 ' + (dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/svg+xml"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-2 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 text-sm font-bold disabled:opacity-50 hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
            >
              {uploading ? 'Uploading...' : 'Select & Upload Images'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">or drag and drop images here</p>
            {uploadError && <p className="text-red-500 text-sm mt-2 whitespace-pre-wrap">{uploadError}</p>}
          </div>
        </div>

        {symbols.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No symbols uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {symbols.map((symbol) => (
              <div
                key={symbol.id}
                className="retro-border p-3 flex flex-col items-center bg-white dark:bg-gray-800"
              >
                <img
                  src={symbolUrls[symbol.id]}
                  alt={symbol.name}
                  className="w-10 h-10 object-contain mb-2"
                />
                <p className="text-[10px] truncate w-full text-center mb-2">{symbol.name}</p>
                {deleteConfirm === symbol.id ? (
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={() => handleDeleteSymbol(symbol.id)}
                      className="flex-1 text-[10px] py-1 retro-border bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer select-none"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 text-[10px] py-1 retro-border bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer select-none"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(symbol.id)}
                    className="w-full text-[10px] py-1 retro-border bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer select-none"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 2: Font Builder */}
      <div ref={cardRef} className="retro-border p-5 bg-white dark:bg-gray-800 space-y-6">
        <h2 className="text-lg font-bold">{editingFontId ? 'Edit Font: ' + fontName : 'Create Font'}</h2>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Font Name</label>
          <input
            type="text"
            placeholder="e.g. My Cipher"
            value={fontName}
            onChange={(e) => { setFontName(e.target.value); setNameError(''); }}
            className="w-full px-4 py-3 retro-border bg-white dark:bg-gray-800 outline-none text-center"
          />
          {nameError && <p className="text-xs text-red-500 mt-1 text-center">{nameError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Select & Map Symbols</label>
            <button
              onClick={handleAutoMap}
              className="px-3 py-1 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 text-xs font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
            >
              Auto Map
            </button>
          </div>
          {symbols.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Upload symbols above to get started.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {symbols.map((symbol) => {
                  const isSelected = selectedSymbolIds.includes(symbol.id);
                  const charValue = mappings[symbol.id] || '';
                  const charError = charErrors[symbol.id];
                  return (
                    <div
                      key={symbol.id}
                      className={'retro-border p-3 flex flex-col items-center ' + (isSelected ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700 opacity-60')}
                    >
                      <label className="flex items-center gap-2 mb-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSymbol(symbol.id)}
                          className="accent-gray-800 dark:accent-gray-200"
                        />
                        <img
                          src={symbolUrls[symbol.id]}
                          alt={symbol.name}
                          className="w-8 h-8 object-contain"
                        />
                      </label>
                      <p className="text-[10px] truncate w-full text-center mb-1">{symbol.name}</p>
                      {isSelected && (
                        <>
                          <input
                            type="text"
                            maxLength={1}
                            placeholder={"\u2192"}
                            value={charValue}
                            onChange={(e) => handleMappingChange(symbol.id, e.target.value)}
                            className={'w-8 text-center retro-border bg-white dark:bg-gray-800 outline-none text-xs ' + (charError ? 'border-red-500' : '')}
                          />
                          {charError && <p className="text-[10px] text-red-500 mt-0.5">{charError}</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                {selectedSymbolIds.length} selected, {Object.keys(mappings).filter((k) => selectedSymbolIds.includes(k) && mappings[k]).length} mapped
              </p>
            </>
          )}
        </div>

        <button
          onClick={handleGenerateFont}
          disabled={generatingFont || !fontName.trim() || selectedSymbolIds.length === 0}
          className="w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold disabled:opacity-50 hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
        >
          {generatingFont ? 'Generating...' : editingFontId ? 'Update Font' : 'Generate Font'}
        </button>
        {selectedSymbolIds.length === 0 && (
          <p className="text-xs text-red-500 text-center">Select at least one symbol to enable generation.</p>
        )}
      </div>

      {/* Card 3: Your Fonts */}
      <div className="retro-border p-5 bg-white dark:bg-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your Fonts</h2>
          <button
            onClick={handleNewFont}
            className="px-3 py-1.5 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 text-xs font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            + New Font
          </button>
        </div>
        <FontList key={fontListKey} onEdit={handleEditFont} onDelete={() => { setFontListKey((k) => k + 1); loadData(); }} />
      </div>
    </div>
  );
}
