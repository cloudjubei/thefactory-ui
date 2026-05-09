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
- **Lint config:** mirror `thefactory-overseer-web` exactly — it currently has no ESLint config; `tsc --noEmit` + `check:uikit` + `prettier --check` are the gates. Add ESLint here if/when overseer-web adopts it.
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

1. **CSS distribution shape — verifying the consumer DX.** Tailwind v4 utilities are computed at the consumer's build time, so the package has to make the consumer's Tailwind aware of our class names _and_ ship the CSS variables + hand-authored layers. Plan:
   - Ship `dist/styles/index.css` as the single side-effect import. It internally `@import`s `tokens.css`, the foundations / primitives / components / layout / utilities layers, _and_ contains a Tailwind v4 `@source "../**/*.{js,mjs}"` directive (path is relative to the CSS file → resolves to `dist/**` at the consumer). One `@import 'thefactory-ui/web/styles'` from the consumer's Tailwind-processed CSS gives them variables, layered styles, and class-name discovery — no separate preset file required.
   - Also export `./web/styles/tokens` (the variables alone) for consumers who only want the design tokens without the layered styles.
   - **Open part:** verify against a real consumer (Task 7) that the one-line `@import` actually produces working utilities, no missing variables, and no `@layer` ordering surprises. If it does, we're done; if not, we add whatever the consumer needed and update the README before the second consumer wires up.

---

## B. Pending tasks

The scaffold + migration tasks (1–6) shipped — see _Shipped_ below for what's already in place. Open work starts at Task 7 (consumer wiring). The native track (9–10) is deferred until an RN consumer exists.

### Wire consumers

7. **Wire `thefactory-overseer-web`.** In its repo:
   - `npm install thefactory-ui` (or `link:` during dev to keep edits hot)
   - swap the `@uikit/*` alias in [vite.config.ts](../../thefactory-overseer-web/vite.config.ts) / [tsconfig.app.json](../../thefactory-overseer-web/tsconfig.app.json) / [vitest.config.ts](../../thefactory-overseer-web/vitest.config.ts) for the package name (or barrel subpaths)
   - replace the existing per-file CSS imports with the single `@import 'thefactory-ui/web/styles'` from the consumer's main Tailwind-processed CSS file
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

## C. Shipped

Anchor for new contributors arriving cold — what's already in the repo and how to drive it.

- **Package skeleton.** `package.json` (`name: thefactory-ui`, `version: 0.0.1`, `type: module`, `sideEffects: ["**/*.css"]`, peer deps `react`/`react-dom` `^19.0.0`, `exports` map for `.`, `./tokens`, `./headless`, `./web`, `./web/styles`, `./web/styles/tokens`, `./package.json`, `files: ["dist"]`). [tsconfig.json](../tsconfig.json) mirrors `thefactory-overseer-web`'s strict settings. `.gitignore` / `.npmignore` ship only the `dist/` build artefact.
- **Build.** [tsup.config.ts](../tsup.config.ts) emits ESM + `.d.ts` per entry; copies `src/web/styles/` → `dist/styles/` and prepends a Tailwind v4 `@source "../**/*.{js,mjs}";` directive to `dist/styles/index.css` so consumers' Tailwind discovers our class names from `node_modules/thefactory-ui/dist/`. `react` / `react-dom` / `react-native` are external.
- **Boundary script + CI + release.** [scripts/check-uikit-boundaries.sh](../scripts/check-uikit-boundaries.sh) enforces the four-layer rules (no React in `tokens/`, no DOM/RN in `headless/`, no RN in `web/`, no DOM in future `native/`). `prebuild` runs `check:uikit` + `generate:tokens`; `pretest` runs `check:uikit`. [.github/workflows/ci.yml](../.github/workflows/ci.yml) gates PRs on `check:uikit + format:check + typecheck + build`. [.github/workflows/release.yml](../.github/workflows/release.yml) fires on PR-merged-to-`main`: branch prefix decides `npm version patch` (`fix|bug|bugfix|hotfix`) vs `minor`, commits with `[skip ci]`, pushes the tag, then `npm publish --access public --provenance`. If npm 2FA blocks the publish, the tag is already pushed — a maintainer runs `npm publish` from the tagged commit.
- **Source tree migration.** Full copy of `thefactory-overseer-web/src/uikit/` → `src/`, preserving the four-layer layout (`tokens/`, `headless/`, `web/`). `src/index.ts` is the root barrel that re-exports `./web` + `./headless` + `./tokens` for the convenience entry; subpath imports (`thefactory-ui/web`, `thefactory-ui/headless`, `thefactory-ui/tokens`) bypass it. `src/css.d.ts` declares `*.css` so prismjs theme imports compile under `noUncheckedSideEffectImports: true`.
- **Token generator.** [scripts/generate-tokens-css.ts](../scripts/generate-tokens-css.ts) reads `src/tokens/*.ts` and writes `src/web/styles/tokens.css`. Identical output to overseer-web's generator (verified with `diff`). Wired to `prebuild` so the CSS can never drift from TS.
- **Playground.** [playground/](../playground/) is the first real consumer — uses `vite` + `@tailwindcss/vite` + `@vitejs/plugin-react` and imports `thefactory-ui/web` via package self-reference. `playground/main.css` is one line: `@import 'thefactory-ui/web/styles';`. The build emits ~97 KB of CSS containing both our variables (`--surface-base`, `--accent-primary`, …) and Tailwind utilities resolved against our registered theme colours (`bg-brand-600`) — proving the `@source` directive correctly drives class discovery from `dist/`.
- **Scripts on the package.** `npm run typecheck`, `npm run check:uikit`, `npm run generate:tokens`, `npm run build`, `npm run dev` (tsup watch), `npm run playground:dev` (vite dev), `npm run playground` (build lib + build + preview playground), `npm run format` / `format:check`.

---

### Non-goals (don't accept scope creep here)

- Switching styling engines. Tailwind v4 stays for `web/`; `native/` will get a thin StyleSheet adapter that consumes the same TS tokens.
- Storybook. Visual verification is `npm run build` + the `playground/` HTML harness from Task 6. Reconsider once external contributors land.
- Porting Electron / IPC chrome from `overseer-local`. Window controls, native menus, file-system bridges stay in the host app.
- Hand-editing `web/styles/tokens.css`. It's generated from `src/tokens/` — change the TS, regenerate, commit both.
- Bundling `react` / `react-dom` / `react-native` into the published artefact. They stay `peerDependencies`.
- Supporting React 18. Both current consumers and the planned RN app are on React 19; dual-support would cost more than it saves.
