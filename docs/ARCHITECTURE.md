# Architecture

`thefactory-ui` is the shared UI package every `thefactory-*` app consumes. It has three known consumers:

- **`thefactory-overseer-web`** — Vite + React 19 + Tailwind v4 SPA. **Live consumer today** via `file:../thefactory-ui`; will swap to a published `^x.y.z` range once we cut the first npm release.
- **`overseer-local`** — Electron renderer (React 19). Has a parallel-implementation tree under `src/renderer/src/components/`; will adopt this package in phases (see [docs/implementation-plan.md](./implementation-plan.md)).
- **Upcoming React Native mobile app** — will share `tokens/` and `headless/` verbatim, swap `web/` for `native/`. Targets React 19 (RN 0.76+).

**North star.** Consumers should have the easiest possible time installing and using this package. Don't take shortcuts at the start that turn into expensive migrations later.

## Layer split

Four sub-layers, enforced by [scripts/check-uikit-boundaries.sh](../scripts/check-uikit-boundaries.sh) as `prebuild` and `pretest`. The point: a future React Native client imports `tokens/` and `headless/` verbatim and only writes its own `native/` peer to `web/`.

| Layer                 | Path            | Contents                                                  | May import              | May NOT import                     |
| --------------------- | --------------- | --------------------------------------------------------- | ----------------------- | ---------------------------------- |
| **tokens**            | `src/tokens/`   | Palette, semantic light/dark, metrics, motion, shadows    | Pure TS only            | React, DOM, RN, CSS imports        |
| **headless**          | `src/headless/` | React-only state machines / hooks                         | React                   | `react-dom`, RN, CSS, DOM globals  |
| **web**               | `src/web/`      | Tailwind primitives + compounds, icons, hand-authored CSS | React, `react-dom`, DOM | `react-native`                     |
| **native** _(future)_ | `src/native/`   | RN equivalents of the same primitives + compounds         | React, `react-native`   | `react-dom`, anything under `web/` |

```
consumers (thefactory-overseer-web, overseer-local, RN app)
   │
   ▼
src/index.ts           ─── root barrel re-exports `./web` + `./headless` + `./tokens`
   │
   ├──► src/web/       ─── DOM + Tailwind components (Button, Modal, Markdown, …)
   │       └── styles/ ─── hand-authored CSS layers + generated tokens.css
   │
   ├──► src/headless/  ─── React-only logic (useTypewriter; toast queue / focus-trap promotions live here later)
   │
   └──► src/tokens/    ─── pure TS; CSS variables generated from this
```

## Resolved decisions

These are locked in. If one needs revisiting, edit this file and explain the why.

- **Package name:** `thefactory-ui`. Public npm registry.
- **Build tool:** `tsup` (esbuild). ESM-only output with `.d.ts`. `react`, `react-dom`, `react-native` are externals.
- **React peer-dependency range:** `^19.0.0`. Both current consumers are on `^19.1.1`; the planned RN app is React 19 too. We don't dual-support React 18 — see Non-goals.
- **Native target packaging:** single package with subpath exports (`thefactory-ui/web`, `thefactory-ui/native`). Splitting only when install-cost or peer-dep conflict actually bites.
- **Lint config:** mirror `thefactory-overseer-web` — currently no ESLint; `tsc --noEmit` + `check:uikit` + `prettier --check` are the gates. Add ESLint here only if/when overseer-web does.
- **CSS distribution shape:** ship `dist/styles/index.css` as a single side-effect import. It internally `@import`s `tokens.css`, the foundations / primitives / components / layout / utilities layers, _and_ contains a Tailwind v4 `@source "../**/*.{js,mjs}";` directive (path is relative to the CSS file → resolves to `dist/**` at the consumer). One `@import 'thefactory-ui/web/styles'` from a consumer's Tailwind-processed CSS gives them variables, layered styles, and class-name discovery — no separate preset file. Also export `./web/styles/tokens` for consumers that want only the design tokens. **Verified end-to-end by the Task 7 wiring of `thefactory-overseer-web`** — the consumer's bundled CSS contains both our variables (`--surface-base`, `--accent-primary`, …) and Tailwind utilities resolved against our registered theme colours (`bg-brand-600`).
- **Release flow.** Branch off `main` (`feat/...`, `fix/...`, etc.). PR opens → GitHub Actions runs `typecheck + check:uikit + format:check + build`. On merge to `main`: branch prefix decides version bump (`fix/`, `bug/`, `bugfix/`, `hotfix/` → patch; anything else → minor). Workflow runs `npm version`, commits with `[skip ci]`, tags `vX.Y.Z`, pushes the tag, then `npm publish --access public --provenance`. If npm 2FA blocks the publish, the tag is already on `main` — a maintainer runs `npm publish` locally on the tagged commit. Implementation: [.github/workflows/release.yml](../.github/workflows/release.yml).

## Tech stack

| Concern        | Choice                                                    | Notes                                                                                                                                                           |
| -------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime        | React 19 + TypeScript 5.9                                 | `verbatimModuleSyntax`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`.                                                       |
| Build          | `tsup` 8 (esbuild)                                        | ESM + `.d.ts` per entry. CSS is copied raw to `dist/styles/`, processed by the **consumer's** Tailwind pipeline.                                                |
| Web styling    | Tailwind v4 + hand-authored layered CSS                   | Tokens authored in TS at [src/tokens/](../src/tokens/); CSS variables generated by `npm run generate:tokens`.                                                   |
| Web components | Native HTML + `@radix-ui/react-slot` (Button `asChild`)   | No heavyweight component-toolkit lock-in.                                                                                                                       |
| Markdown       | `react-markdown` + `remark-gfm` + `rehype-external-links` | Used by `Markdown` and `TypewriterText`.                                                                                                                        |
| Code highlight | `prismjs`                                                 | Used by `Code`. Theme CSS is consumer-side import.                                                                                                              |
| Class merging  | `clsx` + `tailwind-merge` via the `cn` util               | Single `cn` exported from `thefactory-ui/web`.                                                                                                                  |
| Verification   | `tsc --noEmit` + `tsup` build + `playground/` smoke run   | UI-only project — no unit tests. The `playground/` runs Tailwind v4 against the published shape, catching `@source` / `@layer` regressions before any consumer. |

## CSS distribution recipe (for consumers)

Add the package and one CSS import:

```sh
npm install thefactory-ui
```

```css
/* consumer's main Tailwind-processed CSS */
@import 'tailwindcss';
@import 'thefactory-ui/web/styles';
```

That's the whole integration. Consumers process CSS via their own Tailwind pipeline; the package's `@source` directive tells Tailwind to scan `node_modules/thefactory-ui/dist/**/*.{js,mjs}` for class names so utilities like `bg-brand-600` are emitted into the consumer's bundle.

If a consumer wants only the design tokens (no layered styles or utility discovery):

```css
@import 'thefactory-ui/web/styles/tokens';
```

## Conventions

Hold the line — the package is shared with three consumers, so sloppy structure propagates.

- **Boundaries are enforced.** A cross-layer import is a bug, not a convenience.
- **Public API is the `exports` map.** Anything not exported via the map is internal and can break between versions. Never reach into `dist/web/primitives/...` from a consumer.
- **Default-export internals, named-export at the barrel.** Components may be `export default` in their own file for ergonomic dev, but the `web/index.ts` barrel re-exports them as named (`export { default as Foo }`). Consumers always see named imports.
- **Comments explain _why_, not _what_.** Identifiers explain the what.
- **Tokens flow one way.** TS source under `src/tokens/` is authoritative; `src/web/styles/tokens.css` is generated. Hand-editing the CSS is a smell — fix the TS and re-run `npm run generate:tokens`.

### Quality bar before sign-off

- **Dead code / dead branches** — every public symbol consumed? every `if` arm reachable?
- **Layer leaks** — does `tokens/` import React? Does `headless/` touch DOM? Does `web/` import RN?
- **Public-API drift** — a new component must be exported from the relevant barrel; otherwise it's dead in consumers.
- **Casts** — any `as X` hiding a real type gap?
- **Style regressions** — run `npm run playground` and view the harness; broken `@layer` ordering or undefined custom properties surface there before any consumer hits them.

Then run `npm run typecheck && npm run check:uikit && npm run build` and exercise the change in the `playground/`. Surface what the audit found, not just what was built.

## Non-goals

Don't accept scope creep here.

- **No styling-engine swap.** Tailwind v4 stays for `web/`; `native/` will get a thin StyleSheet adapter that consumes the same TS tokens.
- **No Storybook.** Visual verification is `npm run playground` plus consumer adoption. Reconsider once external contributors land.
- **No Electron / IPC chrome.** Window controls, native menus, file-system bridges stay in `overseer-local`.
- **No hand-edits to `web/styles/tokens.css`.** It's generated.
- **No bundling of `react` / `react-dom` / `react-native`.** They stay `peerDependencies`.
- **No React 18 support.** Both current consumers and the planned RN app are on React 19; dual-support would cost more than it saves.

## File structure

```
thefactory-ui/
├── README.md                           # quick start + pointers
├── docs/
│   ├── ARCHITECTURE.md                 # this file
│   └── implementation-plan.md          # what's open
├── .github/workflows/
│   ├── ci.yml                          # PR gate: check:uikit + format:check + typecheck + build
│   └── release.yml                     # auto bump+tag+publish on PR-merged-to-main
├── scripts/
│   ├── check-uikit-boundaries.sh       # CI-enforced layer guard (prebuild/pretest)
│   └── generate-tokens-css.ts          # emits src/web/styles/tokens.css from TS source
├── src/
│   ├── index.ts                        # root barrel: re-exports web + headless + tokens
│   ├── css.d.ts                        # ambient `declare module '*.css'`
│   │
│   ├── tokens/                         # Layer 1: pure TS tokens
│   │   ├── colors.ts · metrics.ts · semantic.ts · theme.ts
│   │   └── index.ts
│   │
│   ├── headless/                       # Layer 2: React-only logic (no DOM, RN-safe)
│   │   ├── hooks/useTypewriter.ts
│   │   └── index.ts
│   │
│   └── web/                            # Layer 3: DOM + Tailwind
│       ├── styles/                     #   CSS bundle (tokens generated; rest hand-authored)
│       ├── primitives/                 #   Button, Input, Modal, Tooltip, Toast, …
│       ├── compound/                   #   CommandPalette, BranchChip, JsonView, diff, files, chips
│       ├── icons/                      #   56 SVG icons
│       ├── utils/cn.ts                 #   clsx + tailwind-merge
│       └── index.ts
│
├── playground/                         # smoke-test consumer (Vite + Tailwind v4)
│   ├── index.html · main.tsx · main.css · vite.config.ts
├── tsup.config.ts · tsconfig.json · .prettierrc.json
├── package.json
└── LICENSE
```

## Build artefact (`dist/`)

What ships to npm. Everything else is excluded by `.npmignore`.

```
dist/
├── index.{js,d.ts}                     # root barrel
├── tokens/index.{js,d.ts}              # ./tokens entry
├── headless/index.{js,d.ts}            # ./headless entry
├── web/
│   ├── index.{js,d.ts}                 # ./web entry
│   └── icons/index.{js,d.ts}           # ./web/icons entry (separate so consumers tree-shake icons cleanly)
├── styles/
│   ├── index.css                       # ./web/styles entry (with @source directive injected at build time)
│   ├── tokens.css                      # ./web/styles/tokens entry
│   ├── tailwind-palette.css
│   ├── foundations/ · primitives/ · components/ · layout/ · utilities/
└── chunk-*.js                          # tsup splitting output (internal)
```
