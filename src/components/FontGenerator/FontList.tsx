import { useEffect, useState, useCallback, useRef } from 'react';
import * as storage from '../../services/storage';
import type { FontEntry, SymbolImage } from '../../types/JournalEntry';
import { useToastStore } from '../../store/toast';

export default function FontList({ onDelete, onEdit }: { onDelete?: () => void; onEdit?: (fontId: string) => void }) {
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [fontSymbols, setFontSymbols] = useState<Record<string, { character: string; url: string }[]>>({});
  const blobUrlsRef = useRef<string[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    const allFonts = await storage.getAllFonts();
    setFonts(allFonts);

    const allSymbols = await storage.getAllSymbols();
    const symbolMap = new Map<string, SymbolImage>();
    allSymbols.forEach((s) => symbolMap.set(s.id, s));

    const urls: string[] = [];
    const map: Record<string, { character: string; url: string }[]> = {};
    for (const font of allFonts) {
      const entries: { character: string; url: string }[] = [];
      for (const mapping of font.mappings) {
        const symbol = symbolMap.get(mapping.symbolId);
        if (symbol) {
          const url = URL.createObjectURL(symbol.data);
          urls.push(url);
          entries.push({ character: mapping.character, url });
        }
      }
      if (entries.length > 0) map[font.id] = entries;
    }
    blobUrlsRef.current = urls;
    setFontSymbols(map);
  }, []);

  useEffect(() => {
    load();
    return () => {
      blobUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, [load]);

  const handleDownload = (font: FontEntry) => {
    const url = URL.createObjectURL(font.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${font.name}.ttf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await storage.deleteFont(id);
    addToast('Font deleted', 'info');
    onDelete?.();
    load();
  };

  if (fonts.length === 0) return <p className="text-sm text-gray-500">No fonts generated yet.</p>;

  return (
    <div className="space-y-4">
      {fonts.map((f) => {
        const symbols = fontSymbols[f.id] || [];
        return (
          <div key={f.id} className="retro-border p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-medium truncate">{f.name}</span>
              <div className="flex gap-2 shrink-0">
                {onEdit && (
                  <button
                    onClick={() => onEdit(f.id)}
                    className="px-2 py-1 text-xs retro-border bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer select-none"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDownload(f)}
                  className="px-2 py-1 text-xs retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="px-2 py-1 text-xs retro-border bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer select-none"
                >
                  Delete
                </button>
              </div>
            </div>
            {symbols.length > 0 ? (
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-2">
                {symbols.map((s) => (
                  <div key={s.character} className="flex flex-col items-center gap-1 p-1 bg-gray-50 dark:bg-gray-700 rounded">
                    <img src={s.url} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{s.character}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No symbol mappings found for this font.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
