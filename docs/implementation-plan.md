# Implementation plan

For the layer rules, decisions, conventions, and what's already shipped, see [ARCHITECTURE.md](./ARCHITECTURE.md). For setup, see [README.md](../README.md).

This file is the open-work backlog. Each entry is sized so a contributor can pick it up and start without waiting on a third-party decision.

---

## A. Open questions

_(Empty — all earlier open questions resolved and moved to ARCHITECTURE.md.)_

---

## B. Pending tasks

### Wire `overseer-local` (Electron renderer)

Phased — the desktop app has a parallel-implementation tree under `src/renderer/src/components/ui/`, `components/stories/`, etc. Don't bulk-replace; do it in stages, each its own PR.

1. **Phase 1 — link + 3–4 primitives.** Add `"thefactory-ui": "file:../thefactory-ui"` to [overseer-local](../../overseer-local/) (mirror the `file:../thefactory-tools` pattern already used there). Adopt `tokens/` plus `Button`, `Modal`, `Tooltip`, `Spinner`. Keep the existing local components alongside — only point _new_ code at `thefactory-ui`. Goal: validate that the published shape works inside an Electron renderer (path resolution, CSS pipeline, no `react-dom` peer-version surprises).

2. **Phase 2 — heavy components.** Swap `DiffViewer`, `Markdown`, `CommandPalette`, and the chat / file family. Each replaces its equivalent under `src/renderer/src/components/ui/`. Land each as its own PR — easier to bisect if something breaks.

3. **Phase 3 — delete the redundant local components.** Once Phase 2 is in and the renderer has been exercised, remove `src/renderer/src/components/ui/` (and any sibling trees) that the package now covers.

Electron-specific chrome (window controls, IPC bridges, native menus) stays in `overseer-local` — out of scope.

### Native target (deferred until an RN consumer exists — don't preemptively start)

4. **Split `src/web/` → `src/web/` + `src/native/`.** When the RN app starts, introduce `src/native/` parallel to `src/web/` with matching component names. `tokens/` and `headless/` stay shared. The `exports` map adds `./native` and `./native/styles` (StyleSheet objects, not CSS). Add `react-native` to peer deps as optional. Public APIs stay identical so consumer code is platform-agnostic.

5. **Headless promotions.** As the RN target asks for headless versions of Tooltip positioning, Toast queue, Modal focus-trap, etc., promote those state machines from `web/` into `headless/`. Trigger is genuine duplication between `web/` and `native/` implementations — never preemptive.
