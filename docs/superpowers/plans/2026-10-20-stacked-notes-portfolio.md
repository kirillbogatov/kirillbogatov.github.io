# Stacked Notes Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-card portfolio into a stack of sliding note panes in the style of notes.andymatuschak.org.

**Architecture:** Each note is a standalone HTML page `notes/<slug>.html` containing `<article class="note" data-slug="<slug>">`, so it works without JS. `index.html` is a shell; `script.js` fetches notes, extracts the `article`, renders them as panes, and keeps the stack in the URL.

**Tech Stack:** Static HTML, CSS, vanilla JS (ES modules not needed). Python `http.server` via `start.bat` for local checks. No build, no git repo here (skip commit steps).

## Global Constraints

- Content comes only from the current site; no new copy except UI labels (Russian).
- Internal links: `<a class="internal" href="/notes/<slug>.html" data-note="<slug>">`. External links: `rel="noreferrer"`, marked with ↗ by CSS.
- Asset paths are root-absolute (`/assets/...`) so notes work both standalone and inside the shell.
- URL format: `/?note=<first>&stackedNotes=<second>&stackedNotes=<third>`; stack = `[note, ...stackedNotes]`; default `kirill-bogatov`.
- Pane width 625px, collapsed strip 40px, mobile breakpoint 700px.
- Light and dark themes via `prefers-color-scheme`.

## File Structure

- `index.html` — shell: `<div id="stack">` and a `<noscript>` link.
- `notes/kirill-bogatov.html`, `pet-projects.html`, `wumpus.html`, `drawing-ideas.html`, `princess-dragon-knight.html`, `dragons-and-lotos.html`, `idea-generator.html`, `articles.html`, `contacts.html` — content.
- `styles.css` — all styling (shell, panes, strips, standalone note pages).
- `script.js` — stack logic.
- `skills/index.html` — redirect to `/?note=pet-projects`.

---

### Task 1: Notes content

**Files:** Create the nine `notes/*.html` files; Delete: unused old selectors from `styles.css` (rewritten in Task 2).

**Interfaces:**
- Produces: each page has `<link rel="stylesheet" href="/styles.css">`, `<body class="note-page">`, `<main><article class="note" data-slug="…"><h1>…</h1>…</article></main>`. `kirill-bogatov` links to `pet-projects`, `articles`, `contacts`; `pet-projects` links to the five skills; each skill note links back to `pet-projects`.

- [ ] Write the nine files, moving text, images and links verbatim from the old `index.html` and `skills/index.html`.
- [ ] Check: every `data-note` value matches an existing file name.

### Task 2: Styles

**Files:** Rewrite `styles.css`.

**Interfaces:**
- Consumes: classes `note`, `internal`, `note-page`, `backlinks` from Task 1 and Task 3.
- Produces: `#stack` (horizontal scroller), `.pane`, `.pane.collapsed` (strip with `.pane-title` rotated), `.pane-body`.

- [ ] Define color tokens on `:root` with dark overrides.
- [ ] Style `.pane` (625px, white, left shadow), `.pane.collapsed` (40px, cursor pointer, vertical title via `writing-mode: vertical-rl`), links, ↗ on external links, images, backlinks block.
- [ ] Mobile (<700px): panes `100vw`, collapsed panes hidden, `.pane-back` link shown.

### Task 3: Stack logic

**Files:** Create `index.html`, rewrite `script.js`, replace `skills/index.html`.

**Interfaces:**
- Produces: `parseStack(search) -> string[]`, `buildUrl(stack) -> string`, `loadNote(slug) -> Promise<{slug, title, html, links}>` (cached), `render()` which rebuilds panes from the `stack` array, `open(slug, fromIndex)` which truncates the stack after `fromIndex` and appends (or scrolls if present).

- [ ] On load: `stack = parseStack(location.search)`; fetch all notes once to build `backlinks[slug]` from `a[data-note]`.
- [ ] Click handler on `#stack` for `a[data-note]` (no modifier keys): `preventDefault`, `open(slug, paneIndex)`, `history.pushState`.
- [ ] Click on a collapsed pane: truncate stack to that pane, `pushState`.
- [ ] `popstate`: re-parse and render. Each pane appends a "Ссылаются на эту заметку" list if backlinks exist. Mobile pane gets a `← назад` link.
- [ ] Missing note: show pane titled «Заметка не найдена».
- [ ] `skills/index.html`: meta refresh + link to `/?note=pet-projects`.

### Task 4: Verification

- [ ] Run `start.bat`; open `/`, click through pet-projects → wumpus; confirm earlier panes collapse and URL updates.
- [ ] Click a collapsed strip: panes to its right close.
- [ ] Browser back/forward; open a deep link directly.
- [ ] Narrow window (<700px) and dark theme.
- [ ] Open `/notes/wumpus.html` directly: renders without JS.
