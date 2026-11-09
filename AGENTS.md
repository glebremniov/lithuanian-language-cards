# Agent notes

- This is a static GitHub Pages app served from the repository root. It uses plain HTML, CSS, and JavaScript with no build step or third-party runtime dependencies.
- Run locally with `python3 -m http.server 8000`, then open `http://localhost:8000/`. Opening `index.html` through `file://` cannot load `words.json`.
- `index.html` contains the UI, `styles.css` handles responsive layout and light/dark/system themes, and `app.js` loads data and manages study state.
- `words.json` is the only vocabulary source. It is a UTF-8 array of `{ "title": string, "cards": [...] }` topics. Each card needs `"lt"` and `"ru"` strings; `"question"` is optional for verb government. Keep the JSON valid and preserve Lithuanian diacritics.
- Learned cards use localStorage key `zodis-known-v1` with IDs based on topic and card indexes. Reordering topics or cards, or inserting cards before existing ones, can remap saved progress. Theme preference uses `cards-theme`.
- Before delivery, run `python3 -m json.tool words.json >/dev/null`, `node --check app.js`, and `git diff --check`. Verify card flip, learned/review modes, full list, theme controls, and mobile layout in a browser when UI changes.
