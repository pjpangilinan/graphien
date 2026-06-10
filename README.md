# Graphien

A **zero-knowledge, client-side journaling app** with military-grade encryption, historical ciphers, custom symbolic alphabets, and font generation. Every note is encrypted before it touches storage — your data, your keys, your device.

## Features

### Journal System
- Create, edit, delete, and browse journal entries
- Chronological list view with relative timestamps
- Tag-based filtering and date range filtering
- Entry count and empty-state call to action
- Auto-save (4-second debounce) with "Saving..." / "Auto-saved" indicator
- `Ctrl+S` shortcut for manual save
- Unsaved changes warning on navigation and tab close
- Distraction-free view mode with password-gated editing

### Encryption (AES-256)
- **AES-256-CBC** and **AES-256-CTR** via crypto-js
- **PBKDF2** key derivation with per-entry salt, IV, and iteration count
- Configurable iterations (1,000–1,000,000) from Settings
- In-memory derived-key cache for fast re-decryption
- Remember-me via sessionStorage (optional)
- Change-password flow re-encrypts all entries

### Historical Ciphers
Pre-encryption text manipulation layer for educational use and visual obfuscation:

| Cipher | Description | Config |
|--------|-------------|--------|
| Caesar | Shift alphabet by N positions | Slider (0–25) |
| Vigenère | Keyword-based polyalphabetic cipher | Editable input + Random button |
| Atbash | Reverse alphabet mapping | None (instant) |
| ROT13 | Caesar shift 13 | None (instant) |
| Substitution | Custom 26-character alphabet | Editable input + Random button |
| Pigpen | Classic Masonic grid symbols | None (instant, rendered as inline SVGs) |

Ciphers are applied before encryption and reversed after decryption. Entries display ciphered text by default with a "Reverse Cipher" button — a two-step reveal flow.

### Symbol Studio
- **Upload**: Drag-and-drop or click-to-upload PNG/JPG/SVG (max 2 MB per image)
- **Batch upload**: Select multiple files at once, auto-named from filenames
- **Delete**: Confirm/cancel pattern with cascade to dependent fonts
- **Library**: Dedicated "Symbol Library" card for managing your collection

### Font Generation
- **Per-font symbol selection**: Checkbox grid — only checked symbols are included
- **Auto Map**: One-click assignment (a-z → A-Z → 0-9) to all checked+unmapped symbols
- **Validation**: Duplicate name check, printable ASCII only, no duplicate chars
- **Output**: TrueType font (.ttf) via OpenType.js
- **Edit**: Update font name, symbols, or mappings after creation
- **Preview**: Inline symbol grid per font card
- **Font selector** in Journal editor for symbolic typing

### Dashboard
- Full entry list with decrypted preview (symbols rendered when active font selected)
- Tag chips with filtering, date range picker
- Time-ago display (`5m ago`, `2h ago`, `3d ago`)
- Confirm-before-delete protection
- Keyboard shortcut `/` to focus search

### Settings
- Password management: Set, Change, Clear (with orphan warning)
- Encryption method selection (AES-256-CBC / AES-256-CTR)
- PBKDF2 iteration count (1,000–1,000,000)
- **Export** — full data backup as JSON (encrypted option)
- **Import** — auto-detects encrypted vs plain format, deduplicates by ID

### PWA
- Installable as a progressive web app
- Offline-capable via service worker (Workbox)
- Auto-updating service worker
- Theme-color and standalone display
- 192×192 and 512×512 app icons

## Security Model

### Zero-Knowledge Architecture
```
User's Browser
  ┌─────────────────────────────────┐
  │  React App (Graphien)           │
  │  ┌──────────┐  ┌─────────────┐ │
  │  │ Zustand  │  │ Encryption  │ │
  │  │ (memory) │  │ (crypto-js) │ │
  │  └──────────┘  └─────────────┘ │
  │  ┌────────────────────────────┐ │
  │  │     IndexedDB (local)      │ │
  │  │  ┌──────────────────────┐  │ │
  │  │  │ Encrypted blobs only │  │ │
  │  │  └──────────────────────┘  │ │
  │  └────────────────────────────┘ │
  └─────────────────────────────────┘
```

- **Everything happens client-side.** No data is ever sent to a server.
- **Passwords stay in memory** (Zustand store). Never persisted to disk.
- **Encrypted blobs are opaque** — IndexedDB stores only ciphertext, IV, salt, and metadata.
- **Per-entry salts and IVs** generated via `crypto.getRandomValues` — no reuse.
- **React JSX** auto-escapes user content — no XSS vector.
- **Remember-me** uses `sessionStorage` only (cleared on tab close).

### Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| GitHub breach serves malicious JS | Low (Pages is read-only, signed) | Pin deploy SHA, review diffs |
| Physical access to unlocked browser | Attacker reads entries | Encrypt with strong password, lock device |
| Malicious browser extension | Extension reads IndexedDB | Use clean browser profile |
| Cross-origin IndexedDB access | Impossible (browser-enforced) | None needed |
| Clearing browser data | Data lost permanently | Export regularly from Settings |

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18, TypeScript |
| Build | Vite 5 |
| Styling | TailwindCSS 3 |
| State | Zustand |
| Storage | IndexedDB via idb |
| Encryption | crypto-js (AES-256-CBC/CTR, PBKDF2) |
| Fonts | OpenType.js |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest + React Testing Library + jsdom |
| Linting | ESLint + Prettier |

## Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx      # Global error boundary
│   ├── FontGenerator/
│   │   ├── FontList.tsx       # Font management UI
│   │   └── FontPreview.tsx    # Symbol preview per font
│   └── Toast.tsx              # Global toast notifications
├── pages/
│   ├── Dashboard/             # Entry list, filtering, search
│   ├── Journal/               # Entry editor (view + edit mode)
│   ├── Symbols/               # Symbol Studio + Font Builder
│   └── Settings/              # Password, encryption, export/import
├── services/
│   ├── cipher/                # Caesar, Vigenère, Atbash, ROT13,
│   │                         # Substitution, Pigpen
│   ├── encryption/            # AES-256-CBC/CTR + PBKDF2
│   ├── font/                  # OpenType.js generator
│   └── storage/               # IndexedDB CRUD (idb wrapper)
├── store/
│   └── index.ts               # Zustand store (password, active font, toasts)
├── types/
│   └── JournalEntry.ts        # All shared TypeScript types
├── utils/
│   └── id.ts                  # UUID generation
├── App.tsx                    # Router + nav layout
├── main.tsx                   # Entry point
└── index.css                  # Tailwind + retro-border styles
```

## Deployment

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys to **GitHub Pages** on push to `main`.

**If your repo is not a user/org site** (e.g., `username/graphien` not `username/username.github.io`), set the `base` path in `vite.config.ts`:

```ts
base: '/graphien/',
```

Then push to `main` and enable Pages:
1. Repo → Settings → Pages → Source: **GitHub Actions**
2. App goes live at `https://<user>.github.io/<repo>/`

### Offline Usage
Once visited, the app is fully available offline as a PWA. Open the deployed URL, then "Install" or "Add to Home Screen" from the browser menu.

## Data Export

Use the Settings page to export all data as JSON:
- **Unencrypted**: Plain JSON, human-readable
- **Encrypted**: AES-256-CBC encrypted `.json.enc` file, decryptable only with your password

Import auto-detects the format. All imports are deduplicated by ID.

## Development

### Testing
```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
```

### Linting
```bash
npm run lint
```

### Adding a new cipher
1. Create `src/services/cipher/<name>.ts` with `encrypt(text)` and `decrypt(text)` functions
2. Add `'<name>'` to `CipherType` union in `src/types/JournalEntry.ts`
3. Add cipher config UI in the Journal editor's cipher section
4. Add `<name>` to the cipher preview rendering

## License

MIT
