# Implementation plan

Shared UI package for every `thefactory-*` consumer:

- **`thefactory-overseer-web`** — Vite + React 19 + Tailwind v4 SPA. Today vendors the source under `src/uikit/`; that tree is the migration source for this repo.
- **`overseer-local`** — Electron renderer (React 19). Has its own parallel components under `src/renderer/src/components/`; will adopt this package in phases.
- **Upcoming React Native mobile app** — will share `tokens/` and `headless/` verbatim, swap `web/` for `native/`. Targets React 19 (RN 0.76+).

The four-layer split (`tokens/` → `headless/` → `web/` / future `native/`) is the contract that keeps tokens + state code platform-agnostic and lets each platform layer swap without changing consumer call-sites. The boundary is enforced by `scripts/check-uikit-boundaries.sh` as `prebuild` / `pretest` — same rule that already runs in `thefactory-overseer-web`.

**North star for every decision below:** consumers should have the easiest possible time installing and using this package. Don't take shortcuts at the start that turn into expensive migrations later.

---

## Resolved decisions

These were confirmed up-front so the work below has a fixed target.

- **npm package name:** `thefactory-ui`. Public registry.
- **Build tool:** `tsup` (esbuild). ESM-only output with `.d.ts` files. `react`, `react-dom`, `react-native` are externals.
- **React peer-dependency range:** `^19.0.0` for both `react` and `react-dom`. Verified — `thefactory-overseer-web` and `overseer-local` are both on `^19.1.1`; the upcoming RN app will pin React 19 (RN 0.76+). No need to dual-support React 18.
- **Native target packaging:** single package with subpath exports (`thefactory-ui/web` + `thefactory-ui/native`). Defer splitting into separate packages unless install-cost or peer-dep conflict actually bites.
- **Lint config:** inherit `thefactory-overseer-web`'s `eslint.config.js` (TS + React 19 rules), trimmed of consumer-only bits (no `@core/@api/@generated` import bans — those don't exist here). `lint` runs in PR CI alongside `typecheck` and `check:uikit`.
- **Release flow** (Task 3 below implements this):
  - Branch off `main` into a feature branch (e.g. `dev`, `feat/...`, `fix/...`).
  - Open PR → GitHub Actions runs `typecheck + lint + check:uikit + build` (UI-only project — no test runner yet, add when behaviour exists to test).
  - On merge to `main`: branch name prefix decides version bump.
    - `fix/`, `bug/`, `bugfix/`, `hotfix/` → patch bump.
    - Anything else (`feat/`, `dev`, `chore/`, etc.) → minor bump.
  - Workflow then commits the bumped `package.json`, tags the commit `vX.Y.Z`, pushes the tag, and runs `npm publish`. If npm 2FA blocks automated publish, the workflow stops at the tag and the publish step is run manually from a maintainer machine — everything up to the tag stays automated.

---

## A. Open questions

Things that need a real-world signal before we can lock them down.

1. **CSS distribution shape — verifying the consumer DX.** Tailwind v4 utilities are computed at the consumer's build time, so the package has to make the consumer's Tailwind aware of our class names *and* ship the CSS variables + hand-authored layers. Plan:
   - Ship `dist/styles/tokens.css` (generated from `src/tokens/`) as a side-effect import.
   - Ship `dist/styles/index.css` (foundations / primitives / components / layout / utilities) as a side-effect import that internally `@import`s `tokens.css` so consumers only need one line.
   - Ship a Tailwind v4 `@source` snippet in the README plus a copy-paste-ready preset file (e.g. `dist/tailwind.preset.css`) that consumers `@import` from their main CSS — gives consumers a single anchor that already contains the right `@source "../node_modules/thefactory-ui/dist/**/*.{js,mjs}"` directive so they don't have to know the internal layout.
   - **Open part:** verify against a real consumer (Task 7) that the one-line `@import` actually produces working utilities, no missing variables, and no `@layer` ordering surprises. If it does, we're done; if not, we add whatever the consumer needed and update the README before the second consumer wires up.

---

## B. Pending tasks

Order matters: scaffolding (1–3) blocks the migration (4–6), which blocks consumer wiring (7–8). The native track (9–10) is deferred until an RN consumer exists.

### Scaffold

1. **Package skeleton.** Add `package.json`:
   - `"name": "thefactory-ui"`, `"version": "0.0.1"`, `"type": "module"`, `"sideEffects": ["**/*.css"]`.
   - `"peerDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" }` (RN added as optional peer when Task 9 lands).
   - `"exports"` map covering: `.` (root barrel), `./tokens`, `./headless`, `./web`, `./web/styles` (resolves to `dist/styles/index.css`), `./web/styles/tokens` (resolves to `dist/styles/tokens.css`), `./tailwind-preset` (resolves to `dist/tailwind.preset.css`).
   - `"files": ["dist"]` — only ship the build output.

   Add `tsconfig.json` matching the consumer settings used today: `strict`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `moduleResolution: "bundler"`. Add `.gitignore` and `.npmignore` (publish only `dist/` + types — README + LICENSE come from `package.json` defaults).

2. **Build config.** `tsup.config.ts` emitting ESM + `.d.ts` for each entry (`tokens`, `headless`, `web`, root barrel). Mark `react`, `react-dom`, `react-native` as external. Copy `src/web/styles/*.css` → `dist/styles/` as part of the build (tsup `onSuccess` or a tiny `scripts/copy-styles.ts`). Verify resolution end-to-end with a tiny `playground/` consumer that imports `thefactory-ui/web` and renders a `Button`.

3. **Boundary script + CI + release pipeline.**
   - **Boundary script.** Port [scripts/check-uikit-boundaries.sh](../../thefactory-overseer-web/scripts/check-uikit-boundaries.sh) from `thefactory-overseer-web`. Update path roots and *drop* the `@core/@api/@generated/@ui` import bans (no app-domain aliases exist here); keep the layered rules: `tokens/` has no React, `headless/` has no DOM/RN, `web/` has no RN. Wire as `prebuild` and `pretest` (the latter is a no-op until tests exist, but the hook is cheap to add now).
   - **PR CI.** GitHub Actions workflow `ci.yml` triggered on `pull_request`: `typecheck + lint + check:uikit + build`.
   - **Release on merge.** Workflow `release.yml` triggered on `push` to `main`:
     1. Read the merge-commit message / PR head ref to get the source branch name.
     2. If branch name starts with `fix/`, `bug/`, `bugfix/`, or `hotfix/` → `npm version patch`. Otherwise → `npm version minor`. (`npm version` writes the bump, commits with `[skip ci]`, and tags `vX.Y.Z`.)
     3. `git push --follow-tags` back to `main`.
     4. `npm publish --access public`. If the npm token is set with 2FA-required scope, this step will fail and is the only manual hand-off — the tag is already pushed, so a maintainer just runs `npm publish` locally on the tagged commit.

### Migrate from `thefactory-overseer-web/src/uikit/`

4. **Move the source tree to `src/`.** From the `thefactory-overseer-web` work tree, copy these subtrees into `thefactory-ui/src/`:
   - `tokens/` — palette, semantic light/dark, metrics, motion, shadows (TS source of truth)
   - `headless/hooks/useTypewriter.ts` (the only headless hook so far)
   - `web/icons/` — 56 SVG icons
   - `web/primitives/` — Alert, Button, Chip, DotBadge, Field, Input, Modal (+ ConfirmDialog), Select, SegmentedControl, Skeleton, Spinner, SpinnerWithDot, Surface, Switch, Textarea, Toast (Provider + `useToast`), Tooltip
   - `web/compound/` — BranchChip, Code, CollapsibleSidebar, CommandPalette, JsonView, Markdown, NotificationBadge, PathDisplay, ResizeHandle, SafeText, ShortcutsHelpView, TypewriterText
   - `web/compound/chips/` — CostChip, ProjectChip, StatusChip, TokensChip, TurnChip
   - `web/compound/diff/` — DiffViewer + StructuredUnifiedDiff + InlineTextDiff + SimpleUnifiedDiff + SimpleSplitText + parsing helpers (`parseUnifiedDiff` / `generateSelectedPatch` / `generateHunkPatch`)
   - `web/compound/files/` — FileDisplay, FileMentionsTextarea, FileSelector, RichText, plus mention helpers (`parseMention` / `rankMentionMatches` / `applyMention`)
   - `web/styles/` — foundations + primitives + components + layout + utilities + generated `tokens.css`
   - `web/utils/cn.ts`

   The repos are independent (different remotes), so this is a clean copy + a single commit on this side rather than `git mv`. Preserve the four-layer layout — extraction was designed to be a path-rename only.

5. **Token generator.** Port `scripts/generate-tokens-css.ts` from `thefactory-overseer-web`. The TS files under `src/tokens/` stay authoritative; `src/web/styles/tokens.css` is regenerated. Hook to `npm run generate:tokens` and to `prebuild` so the CSS file can never drift from TS.

6. **CSS bundle smoke test.** A minimal `playground/index.html` that imports the package's `web/styles` (single side-effect import) and renders a Button + Modal. Must work with `npm run build && npx serve playground/` end-to-end. Catches missing `@source` directives, broken `@layer` ordering, undefined custom properties, etc., before any consumer tries to install. This is also where Open question 1 gets verified.

### Wire consumers

7. **Wire `thefactory-overseer-web`.** In its repo:
   - `npm install thefactory-ui` (or `link:` during dev to keep edits hot)
   - swap the `@uikit/*` alias in [vite.config.ts](../../thefactory-overseer-web/vite.config.ts) / [tsconfig.app.json](../../thefactory-overseer-web/tsconfig.app.json) / [vitest.config.ts](../../thefactory-overseer-web/vitest.config.ts) for the package name (or barrel subpaths)
   - replace the existing per-file CSS imports with the single `import 'thefactory-ui/web/styles'` plus `@import 'thefactory-ui/tailwind-preset'` from the consumer's main Tailwind file
   - delete its `src/uikit/` and `scripts/check-uikit-boundaries.sh`
   - update `npm run check:uikit` to no-op or remove
   - typecheck + build + `npm test` must all stay green
   - smoke-test in a browser

   By construction no `@uikit/*` consumer code outside `src/uikit/` itself ever existed — every consumer file already imports through the alias — so this is purely a config swap.

8. **Wire `overseer-local` (Electron renderer).** Phased — the desktop app has a parallel-implementation tree under `src/renderer/src/components/ui/`, `components/stories/`, etc. Don't bulk-replace; do it in stages, each its own PR:

   - **Phase 1.** Adopt `tokens/` + 3–4 primitives (`Button`, `Modal`, `Tooltip`, `Spinner`) to validate the integration end-to-end. Keep its existing components alongside — just point new code at `thefactory-ui`.
   - **Phase 2.** Swap the heavier components (`DiffViewer`, `Markdown`, `CommandPalette`, the chat / file family) — each replaces the equivalent in `src/renderer/src/components/ui/`.
   - **Phase 3.** Delete the now-redundant local components.

   Electron-specific chrome (window controls, IPC bridges, native menus) stays in `overseer-local` — out of scope for this package.

### Native target (deferred until an RN consumer exists)

9. **Split `src/web/` → `src/web/` + `src/native/`.** When the RN app starts, introduce `src/native/` parallel to `src/web/` with matching component names. `tokens/` and `headless/` stay shared. The `exports` map adds `./native` and `./native/styles` (StyleSheet objects, not CSS). Add `react-native` to peer deps as optional. Keep the public APIs identical so consumer code is platform-agnostic.

10. **Headless promotions.** As the RN target asks for headless versions of Tooltip positioning, Toast queue, Modal focus-trap, etc., promote those state machines from `web/` into `headless/`. Trigger is genuine duplication between `web/` and `native/` implementations — never preemptive.

---

### Non-goals (don't accept scope creep here)

- Switching styling engines. Tailwind v4 stays for `web/`; `native/` will get a thin StyleSheet adapter that consumes the same TS tokens.
- Storybook. Visual verification is `npm run build` + the `playground/` HTML harness from Task 6. Reconsider once external contributors land.
- Porting Electron / IPC chrome from `overseer-local`. Window controls, native menus, file-system bridges stay in the host app.
- Hand-editing `web/styles/tokens.css`. It's generated from `src/tokens/` — change the TS, regenerate, commit both.
- Bundling `react` / `react-dom` / `react-native` into the published artefact. They stay `peerDependencies`.
- Supporting React 18. Both current consumers and the planned RN app are on React 19; dual-support would cost more than it saves.
