import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllEntries,
  addEntry,
  getEntry,
  updateEntry,
  deleteEntry,
} from './index';
import type { JournalEntry } from '../../types/JournalEntry';
import { generateId } from '../../utils/id';

describe('storage', () => {
  const entry: JournalEntry = {
    id: generateId(),
    title: 'Test',
    content: 'Hello',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    encrypted: false,
  };

  beforeEach(async () => {
    const existing = await getAllEntries();
    for (const e of existing) {
      await deleteEntry(e.id);
    }
  });

  it('adds and retrieves an entry', async () => {
    await addEntry(entry);
    const retrieved = await getEntry(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Test');
  });

  it('updates an entry', async () => {
    await addEntry(entry);
    const updated = { ...entry, title: 'Updated' };
    await updateEntry(updated);
    const retrieved = await getEntry(entry.id);
    expect(retrieved!.title).toBe('Updated');
  });

  it('deletes an entry', async () => {
    await addEntry(entry);
    await deleteEntry(entry.id);
    const retrieved = await getEntry(entry.id);
    expect(retrieved).toBeUndefined();
  });

  it('gets all entries', async () => {
    await addEntry(entry);
    const all = await getAllEntries();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});
