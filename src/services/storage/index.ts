import { openDB, type IDBPDatabase } from 'idb';
import type { JournalEntry, SymbolImage, GlyphMapping, FontEntry } from '../../types/JournalEntry';

const DB_NAME = 'graphien-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('journal-entries')) {
          db.createObjectStore('journal-entries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('symbols')) {
          db.createObjectStore('symbols', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('glyph-mappings')) {
          db.createObjectStore('glyph-mappings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fonts')) {
          db.createObjectStore('fonts', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          const store = transaction.objectStore('journal-entries');
          if (!store.indexNames.contains('tags')) {
            store.createIndex('tags', 'tags', { multiEntry: true });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllEntries(): Promise<JournalEntry[]> {
  const db = await getDb();
  return db.getAll('journal-entries');
}

export async function getEntry(id: string): Promise<JournalEntry | undefined> {
  const db = await getDb();
  return db.get('journal-entries', id);
}

export async function addEntry(entry: JournalEntry): Promise<void> {
  const db = await getDb();
  await db.add('journal-entries', entry);
}

export async function updateEntry(entry: JournalEntry): Promise<void> {
  const db = await getDb();
  await db.put('journal-entries', entry);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('journal-entries', id);
}

export async function getAllSymbols(): Promise<SymbolImage[]> {
  const db = await getDb();
  return db.getAll('symbols');
}

export async function getSymbol(id: string): Promise<SymbolImage | undefined> {
  const db = await getDb();
  return db.get('symbols', id);
}

export async function addSymbol(symbol: SymbolImage): Promise<void> {
  const db = await getDb();
  await db.add('symbols', symbol);
}

export async function deleteSymbol(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('symbols', id);
}

export async function getAllMappings(): Promise<GlyphMapping[]> {
  const db = await getDb();
  return db.getAll('glyph-mappings');
}

export async function addMapping(mapping: GlyphMapping): Promise<void> {
  const db = await getDb();
  await db.add('glyph-mappings', mapping);
}

export async function updateMapping(mapping: GlyphMapping): Promise<void> {
  const db = await getDb();
  await db.put('glyph-mappings', mapping);
}

export async function deleteMapping(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('glyph-mappings', id);
}

export async function getAllFonts(): Promise<FontEntry[]> {
  const db = await getDb();
  return db.getAll('fonts');
}

export async function getFont(id: string): Promise<FontEntry | undefined> {
  const db = await getDb();
  return db.get('fonts', id);
}

export async function addFont(font: FontEntry): Promise<void> {
  const db = await getDb();
  await db.add('fonts', font);
}

export async function updateFont(font: FontEntry): Promise<void> {
  const db = await getDb();
  await db.put('fonts', font);
}

export async function deleteFont(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('fonts', id);
}
