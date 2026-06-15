# Architecture

`thefactory-ui` is the shared UI package every `thefactory-*` app consumes. Its consumers are:

- **`overseer-local`** — Electron renderer (React 19).
- **`thefactory-overseer-web`** — Vite + React 19 SPA.
- **Upcoming React Native mobile app** — shares `tokens/` and `headless/` verbatim, swaps `web/` for `native/`. Targets React 19 (RN 0.76+).

**The package is an "app without an app".** It ships the almost-complete scaffold — primitives, compounds, the full icon set, screen-level CSS, the project-icon picker registry, design tokens, and the consumer-facing UI conventions that bind them. A consuming app fills in **only data wiring** (contexts, services, routing, platform-specific I/O). One CSS tweak here propagates to desktop, web, and mobile at once; an icon added here is available to every consumer's project-icon picker; a screen pattern lifted here stops being three slightly-different copies.

When a new pattern surfaces in a consumer, it earns its keep in this package as soon as a second consumer would render it.

## The three-client model

`thefactory-ui` exists to serve a deliberate client architecture:

- **`thefactory-overseer-web` is the first-class client** and the source of all new behaviour — the only client with _both_ a big-screen and a small-screen (narrow viewport) experience.
- **`overseer-local` (desktop) is big-screen only** — it mirrors web's big-screen methodology.
- **`thefactory-overseer-mobile` is small-screen only** — it mirrors web's small-screen methodology.

Desktop and mobile _stem from_ web: a big-screen behaviour built on web is translated to desktop, a small-screen behaviour to mobile. `thefactory-ui` is the shared layer that makes those translations cheap — tokens, headless logic, and the `web/` + `native/` primitive pairs are written once here so each consumer is mostly data wiring. When adding to this package, prefer additive, optional props so a change made for one client never breaks another.

## Layer split

Four sub-layers, enforced by [scripts/check-uikit-boundaries.sh](../scripts/check-uikit-boundaries.sh) as `prebuild` and `pretest`. A future React Native client imports `tokens/` and `headless/` verbatim and only writes its own `native/` peer to `web/`.

| Layer        | Path            | Contents                                                  | May import              |
| ------------ | --------------- | --------------------------------------------------------- | ----------------------- |
| **tokens**   | `src/tokens/`   | Palette, semantic light/dark, metrics, motion, shadows    | Pure TS only            |
| **headless** | `src/headless/` | React-only state machines / hooks                         | React                   |
| **web**      | `src/web/`      | Tailwind primitives + compounds, icons, hand-authored CSS | React, `react-dom`, DOM |
| **native**   | `src/native/`   | RN equivalents of the same primitives + compounds         | React, `react-native`   |

```
consumers (overseer-local, thefactory-overseer-web, RN app)
   │
   ▼
src/index.ts           ─── root barrel re-exports `./web` + `./headless` + `./tokens`
   │
   ├──► src/web/       ─── DOM + Tailwind components (Button, Modal, Markdown, …)
   │       └── styles/ ─── hand-authored CSS layers + generated tokens.css + screen CSS
   │
   ├──► src/headless/  ─── React-only logic
   │
   └──► src/tokens/    ─── pure TS; CSS variables generated from this
```

## `thefactory-ui` vs `thefactory-tools` — what consumers import from where

`thefactory-ui` is the shared **UI / React** spine. `thefactory-tools` is the shared **backend-logic** package the Fastify backend is built on. A consumer app (web, desktop, mobile) gets:

- **From `thefactory-ui`** — tokens, primitives, compounds, headless hooks, the backend SDK surface (`thefactory-ui/headless/api`). This is the default; reach here first. Pure `thefactory-tools` helpers an app needs (the git/diff family — `parseUnifiedDiff`, `countPatchAddDel`, `generateHunkPatch`, `getFilePatch`, `getPRUrl`, `mergeUnstagedWithUntracked`) are re-exported from `thefactory-ui/headless`; import them there, so the app keeps a single dependency edge to `thefactory-ui` and `thefactory-tools` stays an internal detail of the spine.
- **From `thefactory-tools` directly** — _only_ pure, node-free helpers whose output must byte-match the backend's own derivation. Currently that is `getChatContextKey` / `getChatContext` from `thefactory-tools/utils`: they derive the `chatKey` used for routing and cost-aggregate lookups, so a client-side re-implementation that drifts from the backend silently breaks (it did — cost totals read `$0` because the client queried `projects/X` while the backend stored `/projects/X`). Each client re-exports these through its own `core/chats/chatKey.ts` shim.

The direct-`thefactory-tools` exception is deliberately narrow: pure functions, no node dependencies, and a hard "must match the backend exactly" justification. Everything else an app needs from `thefactory-tools` is routed through `thefactory-ui`'s re-export.

## Embedded project apps (the App view)

A project can ship its own **app surface** — a self-contained web app the Overseer embeds in its
**App** tab. `ProjectAppView` (`web/` = an `<iframe>`, `native/` = a `<WebView>`) renders it; the URL
comes from `useProjectAppView`, which mints a short-lived **view token** and points the frame at the
host route `…/projects/<id>/view/<file>?viewToken=…`. The host serves the project's `metadata.appDir`
(falling back to the checkout root) with `Cache-Control: no-store`. The app talks back to the host only
through the **`OverseerBridge` postMessage protocol** (`headless/utils/appBridge.ts`) — `data.*`,
`activities.*`, `settings.*`, `chat.discuss`/`chat.requestSidebar`, `story.create`, etc.; the host holds
every credential, the app never does.

### Asset-freshness convention (REQUIRED for every app)

`index.html` is always fetched fresh — its URL carries a one-time `viewToken`, so it never caches. But
**external subresources referenced at stable names** (`app.js`, `style.css`) can be held **stale by the
embedding iframe/WebView across reloads even under `no-store`**, so app edits appear "not to deploy."
Every app surface MUST therefore guarantee fresh assets, one of three ways:

0. **Built apps are already fine** — a bundler (Vite/esbuild) emits **content-hashed** filenames
   (`app-a1b2c3.js`), which `index.html` references; a rebuild changes the name, so the frame can't serve a
   stale one. No extra work needed. The hazard below is specific to **hand-rolled / raw viewers served as-is**
   with stable filenames.
1. **Self-contained `index.html`** — inline the CSS (and ideally the app logic) into `index.html`, so there
   are no cacheable external files. `thefactory-knowledge`'s viewer inlines its CSS and the bulk of its app
   logic this way, but keeps two shared bridge scripts (`bridge.js`, `overseer-transport.js`) external and
   cache-busts them per option 2 below — so it is a **hybrid** of 1 + 2, not purely self-contained.
2. **Per-load cache-bust** — when external `app.js`/`style.css` are kept (e.g. a large hand-rolled viewer with
   no build step), load them with a per-load query so the URL changes every time. The canonical snippet (drop
   it in `<head>`, replacing the static `<link>`/`<script>` tags):

   ```html
   <script>
     ;(function () {
       var v = '?v=' + Date.now() // index.html is always fresh; bust the stable-named subresources too
       document.write(
         '<link rel="stylesheet" href="style.css' +
           v +
           '">' +
           '<scr' +
           'ipt src="app.js' +
           v +
           '" defer></scr' +
           'ipt>',
       )
     })()
   </script>
   ```

   (`thefactory-modeltrainer`'s viewer uses this.) `thefactory-knowledge`'s viewer uses a **synchronous
   variant** — same `document.write` cache-bust but *without* `defer` — because its inline bootstrap consumes
   the bridge globals during parse, so the busted scripts must execute before it (defer would leave them
   undefined). Without one of these, a developer editing the app sees no change on reload and wrongly
   concludes the host didn't rebuild — it did; the iframe served a stale asset.

## CLI agents: runner-aware chat dispatch

A chat is **API-backed** by default and **CLI-backed** when it carries a `cliRunner` binding. The binding is persisted on the chat (`Chat.cliRunner = { tool, credentialId?, apiKeyCredentialId? }`) via `useChatCliRunner(ctx).attach/detach` → `attachChatCliRunner` / `detachChatCliRunner`.

`createChatsContext.sendMessage` forks on that binding:

- **API** (no `cliRunner`): append the user message, then `sendCompletionWithTools` — unchanged.
- **CLI** (`cliRunner` set): `sendChatCompletionWithTools` with `runner: 'cli'` (the runner-aware backend route appends the message and runs the turn on the sandboxed CLI agent, persisting the reply back into the chat; progress streams on the `cli:run-update` WS topic). The composer does **not** pre-append — the route owns it.

There is **no** `sendChatWithCli` route — that earlier plan name was dropped; CLI dispatch is the `runner: 'cli'` path. Two distinct runner shapes exist and must be mapped at the dispatch boundary: the chat-persisted `ChatCliRunner { tool, credentialId }` vs the dispatch `CliRunnerDispatchOptions { cli, authCredentialId }` (`tool → cli`, `credentialId → authCredentialId`) — see `headless/utils/cliRunner.ts`.

The unified `usePendingToolGrants(ctx, runId?)` merges API `require_confirmation` tool-calls (resolved as a batch via `confirmTools`) and CLI gated `PendingAction`s (resolved individually via `decideCliAgentAction`) into one `PendingToolGrant[]`; only CLI grants expose `decide('permanent')` (→ `approved-permanent`). CLI configs (auth-cache CRUD, default CLI, enabled set, login streaming, probes) live in `CliConfigsContext`/`useCliConfigs`, mirroring `LLMConfigsContext`.

## Resolved decisions

- **Package name:** `thefactory-ui`. Published to the public npm registry.
- **Build tool:** `tsup` (esbuild). ESM output with `.d.ts`. `react`, `react-dom`, `react-native` are externals.
- **React peer-dependency range:** `^19.0.0`. Both current consumers and the planned RN app are on React 19.
- **Native target packaging:** single package with subpath exports (`thefactory-ui/web`, `thefactory-ui/native`).
- **Gates:** `tsc --noEmit` + `check:uikit` (boundary script) + `prettier --check` + `tsup` build.
- **CSS distribution shape:** ship `dist/styles/index.css` as a single side-effect import. It internally `@import`s `tokens.css`, the foundations / primitives / components / layout / utilities / screens layers, _and_ contains a Tailwind v4 `@source "../**/*.{js,mjs}";` directive (path is relative to the CSS file → resolves to `dist/**` at the consumer). One `@import 'thefactory-ui/web/styles'` from a consumer's Tailwind-processed CSS gives them variables, layered styles, and class-name discovery. The `@source` directive is appended at the end of `dist/styles/index.css` so it sits after the bundle's `@import`s. A `./web/styles/tokens` subpath export is also available for consumers that want only the design tokens.
- **Release flow.** Branch off `main` (`feat/...`, `fix/...`, etc.). PR opens → GitHub Actions runs `typecheck + check:uikit + format:check + build`. On merge to `main`: branch prefix decides version bump (`fix/`, `bug/`, `bugfix/`, `hotfix/` → patch; anything else → minor). The workflow runs `npm version`, commits with `[skip ci]`, tags `vX.Y.Z`, pushes the tag, and runs `npm publish --access public --provenance`. Implementation: [.github/workflows/release.yml](../.github/workflows/release.yml).

## Tech stack

| Concern        | Choice                                                                                                | Notes                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Runtime        | React 19 + TypeScript 5.9                                                                             | `verbatimModuleSyntax`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`.                      |
| Build          | `tsup` 8 (esbuild)                                                                                    | ESM + `.d.ts` per entry. CSS is copied raw to `dist/styles/`, processed by the **consumer's** Tailwind pipeline.               |
| Web styling    | Tailwind v4 + hand-authored layered CSS                                                               | Tokens authored in TS at [src/tokens/](../src/tokens/); CSS variables generated by `npm run generate:tokens`.                  |
| Web components | Native HTML + `@radix-ui/react-slot` (Button `asChild`) + `@radix-ui/react-select` (Select composite) | Lean primitives.                                                                                                               |
| Markdown       | `react-markdown` + `remark-gfm` + `rehype-external-links`                                             | Used by `Markdown` and `TypewriterText`.                                                                                       |
| Code highlight | `prismjs`                                                                                             | Used by `Code`. Theme CSS is a consumer-side import.                                                                           |
| Class merging  | `clsx` + `tailwind-merge` via the `cn` util                                                           | Single `cn` exported from `thefactory-ui/web`.                                                                                 |
| Verification   | `tsc --noEmit` + `tsup` build + `playground/` smoke run                                               | The `playground/` runs Tailwind v4 against the published shape, catching `@source` / `@layer` regressions before any consumer. |

## CSS distribution recipe (for consumers)

```sh
npm install thefactory-ui
```

```css
/* consumer's main Tailwind-processed CSS */
@import 'tailwindcss';
@import 'thefactory-ui/web/styles';
```

That's the whole integration. The package's `@source` directive tells Tailwind to scan `node_modules/thefactory-ui/dist/**/*.{js,mjs}` for class names so utilities like `bg-brand-600` are emitted into the consumer's bundle. For tokens only (no layered styles, no class-name discovery):

```css
@import 'thefactory-ui/web/styles/tokens';
```

## Package conventions (internal)

The package is shared with three consumers, so structure propagates.

- **Boundaries are enforced.** A cross-layer import is a bug, not a convenience.
- **Public API is the `exports` map.** Anything not exported via the map is internal and can break between versions.
- **Default-export internals, named-export at the barrel.** Components may be `export default` in their own file; the `web/index.ts` barrel re-exports them as named (`export { default as Foo }`). Consumers always see named imports.
- **Comments explain _why_, not _what_.** Identifiers explain the what.
- **Tokens flow one way.** TS source under `src/tokens/` is authoritative; `src/web/styles/tokens.css` is generated by `npm run generate:tokens`.

## Consumer-facing UI conventions

These rules are part of the package's public contract. Consumers follow them when composing primitives; new primitives added to the package compose with them.

### "Save" buttons are icon-only

A button that commits an edit-in-place renders as:

```tsx
<Button variant="secondary" size="icon" title="Save" aria-label="Save" loading={inFlight}>
  <IconSave className="w-4 h-4" />
</Button>
```

This matches the `<MarkdownEditor>` shell that ships in the package.

**Text-label exceptions:**

- **Create / Add flows** — `Create Story`, `Create Feature`, `Add credentials`, `Add remote`, `Add` (timeline label). When the action mints a new record, the affordance reads as a verb.
- **Dual-mode forms / modals** branch on their `mode` / `isEdit` / `isCreate` flag (or, for the small modal pattern, on a `confirmText === 'Save'` runtime check): add-mode renders `<Button>Add …</Button>`; edit-mode renders the icon-only Save.

### Modal Cancel buttons are removed entirely

The package `<Modal>` always renders an X close button (top-right) and supports overlay-click dismissal (`closeOnOverlayClick`, `closeOnEsc` — both default `true`). Modal footers carry only primary actions.

**Cancel buttons appear in three places:**

- **`ConfirmDialog` / yes-no decisions** carry an explicit Cancel via the primitive's API (`cancelLabel`). The primitive owns the pattern.
- **Multi-button decisions where each button is semantically distinct** (e.g. _Cancel_ / _Deny all_ / _Allow all_ in a tool-confirmation prompt) keep all of them — Cancel there means "don't decide right now", different from an explicit Deny.
- **Inline-toggle Cancel buttons** in non-modal panels — they swap a panel back to a default state.

### Custom theme colours use arb-value CSS-var syntax

A component or consumer references one of the package's own palette colours (`brand`, `surface-*`, `text-*`, `border-*`, `accent-*`, or any future custom palette) as `bg-(--color-brand-600)`, `border-(--border-default)`, `text-(--text-primary)` — Tailwind v4's arbitrary-value form. The CSS variable is always defined by the package's `tokens.css`.

Tailwind v4's default-palette colours (emerald, teal, purple, …) work as named utilities (`bg-emerald-500`).

### CSS pipeline: shim + JS imports

A consumer's top-level CSS shim is two lines:

```css
/* index.css (or equivalent) */
@import 'tailwindcss';
@import 'thefactory-ui/web/styles';
```

Additional local stylesheets are imported as JS modules from the entry (e.g. `import './styles/app.css'` in `main.tsx`). Each CSS file becomes its own module-graph node, and `:root` blocks merge naturally.

### Primitive naming

- **`Select`** is the **Radix composite** (`Select` root + `SelectTrigger` + `SelectContent` + `SelectItem` + `SelectValue` + `SelectGroup`). Used for popover-style selects with custom item rendering.
- **`NativeSelect`** is a thin styled `<select>` wrapper. Its API is `value` / `onChange={(e) => …}` / `size` — the standard `<select>` API. Used for plain enum pickers.

### Quality bar before sign-off

- **Layer leaks** — `tokens/` is pure TS; `headless/` doesn't touch DOM; `web/` doesn't import RN.
- **Public-API exposure** — a new component is exported from the relevant barrel.
- **Casts** — every `as X` corresponds to a real type guarantee.
- **Style regressions** — `npm run playground` exercises the bundle as a consumer would.

Then: `npm run typecheck && npm run check:uikit && npm run build`.

## File structure

```
thefactory-ui/
├── README.md                           # quick start + pointers
├── docs/
│   ├── ARCHITECTURE.md                 # this file
│   └── implementation-plan.md          # open tasks
├── .github/workflows/
│   ├── ci.yml                          # PR gate
│   └── release.yml                     # auto bump + tag + publish on PR merge to main
├── scripts/
│   ├── check-uikit-boundaries.sh       # layer guard (prebuild/pretest)
│   └── generate-tokens-css.ts          # emits src/web/styles/tokens.css from TS source
├── src/
│   ├── index.ts                        # root barrel: re-exports web + headless + tokens
│   ├── css.d.ts                        # ambient `declare module '*.css'`
│   │
│   ├── tokens/                         # Layer 1: pure TS tokens
│   │   ├── colors.ts · metrics.ts · semantic.ts · theme.ts
│   │   └── index.ts
│   │
│   ├── headless/                       # Layer 2: React-only logic
│   │   ├── hooks/useTypewriter.ts
│   │   └── index.ts
│   │
│   └── web/                            # Layer 3: DOM + Tailwind
│       ├── styles/                     #   CSS bundle (tokens generated; rest hand-authored)
│       │   ├── tokens.css · tailwind-palette.css
│       │   ├── foundations/ · primitives/ · components/ · layout/ · utilities/
│       │   └── screens/                #     stories, story-details, board, docs, settings
│       ├── primitives/                 #   Button, Input, Modal, Tooltip, Toast, NativeSelect, Select, …
│       ├── compound/                   #   CommandPalette, BranchChip, JsonView, diff, files, chips, projectIcons
│       ├── icons/                      #   ~155 SVG icons (action + navigation + projects + decoration sets)
│       ├── utils/cn.ts                 #   clsx + tailwind-merge
│       └── index.ts
│
├── playground/                         # smoke-test consumer (Vite + Tailwind v4)
│   └── index.html · main.tsx · main.css · vite.config.ts
├── tsup.config.ts · tsconfig.json · .prettierrc.json
├── package.json
└── LICENSE
```

## Build artefact (`dist/`)

What ships to npm.

```
dist/
├── index.{js,d.ts}                     # root barrel
├── tokens/index.{js,d.ts}              # ./tokens entry
├── headless/index.{js,d.ts}            # ./headless entry
├── web/
│   ├── index.{js,d.ts}                 # ./web entry
│   └── icons/index.{js,d.ts}           # ./web/icons entry (separate for icon tree-shaking)
├── styles/
│   ├── index.css                       # ./web/styles entry (with @source directive appended at build time)
│   ├── tokens.css                      # ./web/styles/tokens entry
│   ├── tailwind-palette.css
│   ├── foundations/ · primitives/ · components/ · layout/ · utilities/ · screens/
└── chunk-*.js                          # tsup splitting output (internal)
```
