import { useState, useEffect, useCallback } from 'react';
import * as storage from '../../services/storage';
import { useStore } from '../../store';
import type { FontEntry } from '../../types/JournalEntry';

export default function FontPreview() {
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState('The quick brown fox');
  const [symbolRenderMap, setSymbolRenderMap] = useState<Record<string, string>>({});
  const activeFont = useStore((s) => s.activeFont);
  const setActiveFont = useStore((s) => s.setActiveFont);

  const load = useCallback(async () => {
    setFonts(await storage.getAllFonts());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedFontId) {
      setSymbolRenderMap({});
      return;
    }
    const urls: string[] = [];
    let mounted = true;
    (async () => {
      const font = fonts.find((f) => f.id === selectedFontId);
      if (!font) return;
      const map: Record<string, string> = {};
      for (const mapping of font.mappings) {
        const symbol = await storage.getSymbol(mapping.symbolId);
        if (symbol) {
          const url = URL.createObjectURL(symbol.data);
          map[mapping.character] = url;
          urls.push(url);
        }
      }
      if (mounted) setSymbolRenderMap(map);
    })();
    return () => {
      mounted = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [selectedFontId, fonts]);

  const handleDownload = () => {
    const font = fonts.find((f) => f.id === selectedFontId);
    if (!font) return;
    const url = URL.createObjectURL(font.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${font.name}.ttf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (fonts.length === 0) return <p className="text-sm text-gray-500">No fonts available.</p>;

  return (
    <div className="retro-border p-4 bg-white dark:bg-gray-800 space-y-3">
      <select
        value={selectedFontId || ''}
        onChange={(e) => setSelectedFontId(e.target.value || null)}
        className="w-full px-3 py-2 retro-border bg-white dark:bg-gray-800 outline-none text-center"
      >
        <option value="">Select a font...</option>
        {fonts.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      {selectedFontId && (
        <>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="w-full px-2 py-1 retro-border bg-white dark:bg-gray-800 outline-none text-sm"
            placeholder="Type to preview..."
          />
          <div className="p-4 bg-gray-100 dark:bg-gray-700 min-h-[3rem] whitespace-pre-wrap text-sm break-all">
            {previewText.split('').map((char, i) => {
              const url = symbolRenderMap[char];
              if (url) {
                return (
                  <img key={i} src={url} alt={char} className="inline-block w-[1em] h-[1em] object-contain align-text-bottom" />
                );
              }
              return <span key={i}>{char}</span>;
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
            >
              Download TTF
            </button>
            <button
              onClick={() => setActiveFont(selectedFontId)}
              className="px-3 py-1 retro-border bg-white dark:bg-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none"
            >
              {activeFont === selectedFontId ? 'Active ✓' : 'Use as Active Script'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
