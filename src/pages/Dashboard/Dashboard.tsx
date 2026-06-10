import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as storage from '../../services/storage';
import { useToastStore } from '../../store/toast';
import { useStore } from '../../store';
import type { JournalEntry } from '../../types/JournalEntry';
import { getPigpenPathData } from '../../services/cipher/pigpen';

const PREMADE_TAGS = ['Personal', 'Work', 'Ideas', 'Health', 'Travel', 'Finance', 'Learning', 'Project'];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function renderPigpenSymbols(text: string, svgSize = '1.1em'): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const pd = getPigpenPathData(char);
    if (pd) {
      nodes.push(
        <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={svgSize} height={svgSize} className="inline-block align-text-bottom">
          <path d={pd.pathD} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" strokeLinejoin="miter" />
          {pd.hasDot && <circle cx={pd.dotCx} cy={pd.dotCy} r={3} fill="currentColor" />}
        </svg>
      );
    } else if (char === '\n') {
      nodes.push(<br key={i} />);
    } else {
      nodes.push(<span key={i} className="inline-block w-[0.1em]">&nbsp;</span>);
    }
  }
  return nodes;
}

function renderPreviewContent(entry: JournalEntry, fontSymbolMap: Record<string, string>): React.ReactNode {
  const text = entry.content || '';
  const truncated = text.length > 150 ? text.slice(0, 150) + '…' : text;

  if (entry.cipher?.type === 'pigpen' && !entry.encrypted) {
    return renderPigpenSymbols(truncated);
  }

  const hasFonts = Object.keys(fontSymbolMap).length > 0;
  if (hasFonts && !entry.encrypted) {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < truncated.length; i++) {
      const char = truncated[i];
      const url = fontSymbolMap[char];
      if (url) {
        nodes.push(
          <img key={i} src={url} alt="" className="inline-block w-[1.1em] h-[1.1em] object-contain align-text-bottom" />
        );
      } else if (char === '\n') {
        nodes.push(<br key={i} />);
      } else {
        nodes.push(<span key={i}>{char}</span>);
      }
    }
    return nodes;
  }

  return truncated;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const activeFontId = useStore((s) => s.activeFont);
  const [fontSymbolMap, setFontSymbolMap] = useState<Record<string, string>>({});
  const fontBlobUrlsRef = useRef<string[]>([]);

  const loadEntries = async () => {
    setLoading(true);
    const all = await storage.getAllEntries();
    all.sort((a, b) => b.createdAt - a.createdAt);
    setEntries(all);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    fontBlobUrlsRef.current.forEach(URL.revokeObjectURL);
    fontBlobUrlsRef.current = [];

    if (!activeFontId) {
      setFontSymbolMap({});
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
        setFontSymbolMap(map);
        fontBlobUrlsRef.current = urls;
      }
    })();
    return () => { mounted = false; };
  }, [activeFontId]);

  const handleDelete = async (id: string) => {
    await storage.deleteEntry(id);
    await loadEntries();
    addToast('Entry deleted', 'success');
    setDeleteConfirm(null);
  };

  const allTags = [...new Set([...PREMADE_TAGS, ...entries.flatMap((e) => e.tags || [])])].sort();

  const filtered = entries.filter((e) => {
    if (selectedTags.length > 0) {
      const entryTags = e.tags || [];
      if (!selectedTags.some((t) => entryTags.includes(t))) return false;
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      if (e.createdAt < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      if (e.createdAt > to) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <button
          onClick={() => navigate('/journal/new')}
          className="w-full px-6 py-3 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
        >
          + New Entry
        </button>
      </div>

      {!loading && entries.length > 0 && (
        <div className="space-y-3 px-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`px-2 py-0.5 text-[11px] cursor-pointer select-none rounded-sm ${
                    selectedTags.includes(tag)
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {(selectedTags.length > 0 || dateFrom || dateTo) && (
              <button
                onClick={() => { setSelectedTags([]); setDateFrom(''); setDateTo(''); }}
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer select-none shrink-0 ml-2"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 border border-gray-200 dark:border-gray-700 bg-transparent outline-none text-[11px] text-gray-500 dark:text-gray-400"
            />
            <span className="text-gray-300 dark:text-gray-600 text-[11px] shrink-0">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 border border-gray-200 dark:border-gray-700 bg-transparent outline-none text-[11px] text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-gray-800 dark:border-t-gray-200 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-gray-500">No entries yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </p>
          {filtered.map((entry) => {
            return (
              <div
                key={entry.id}
                className="retro-border p-5 bg-white dark:bg-gray-800"
              >
                <h2
                  className="text-lg font-bold truncate text-center cursor-pointer hover:underline"
                  onClick={() => navigate(`/journal/${entry.id}`)}
                >
                  {entry.encrypted && !entry.title ? '🔒 Encrypted' : (entry.title ? (entry.cipher?.type === 'pigpen' && !entry.encrypted ? renderPigpenSymbols(entry.title, '1.2em') : entry.title) : 'Untitled')}
                </h2>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(entry.createdAt).toLocaleDateString()} ·{' '}
                  {timeAgo(entry.updatedAt)}
                </p>
                {(entry.tags || []).length > 0 && (
                  <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                    {entry.tags!.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p
                  className="mt-3 text-sm text-center text-gray-600 dark:text-gray-300 line-clamp-2 cursor-pointer"
                  onClick={() => navigate(`/journal/${entry.id}`)}
                >
                  {renderPreviewContent(entry, fontSymbolMap)}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/journal/${entry.id}`)}
                    className="flex-1 px-3 py-1.5 text-sm retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
                  >
                    Edit
                  </button>
                  {deleteConfirm === entry.id ? (
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                        aria-label="Confirm delete"
                        className="flex-1 px-3 py-1.5 text-sm retro-border bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer select-none"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                        aria-label="Cancel delete"
                        className="flex-1 px-3 py-1.5 text-sm retro-border bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer select-none"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(entry.id);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm retro-border bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer select-none"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
