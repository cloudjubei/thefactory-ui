# `@thefactory/uikit` (in-repo)

Lives at `src/uikit/`. Mirrors the layout of the future standalone package so extraction can be a `git mv`.

The contract here is the contract: the four-layer split below makes it possible for a future React Native app to share `tokens/` and `headless/` verbatim, swap `web/` for `native/`, and not rewrite any consumer code.

## Layers

| Folder            | What lives here                                                                   | May import                                 | May NOT import                                   |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `tokens/`         | Pure TS palette + metrics + theme objects                                         | nothing                                    | React, DOM, RN, CSS, app domain                  |
| `headless/`       | React-only logic (state machines, hooks for command menu / tooltip / toast queue) | `tokens/`, React                           | DOM (`document`, `window`), `react-dom`, CSS, RN |
| `web/styles/`     | Tailwind v4 CSS bundle (foundations, primitives, components, layout, utilities)   | —                                          | —                                                |
| `web/primitives/` | Atomic DOM components                                                             | `tokens/`, `headless/`, React, `react-dom` | app domain                                       |
| `web/compound/`   | Composed UI built from primitives                                                 | `tokens/`, `headless/`, primitives         | app domain                                       |

The boundary is enforced — `npm run check:uikit` runs as `prebuild` and `pretest`. Failures are CI-blocking.

## Public surface

Consumers import only from these three roots:

- `@uikit/tokens` — palette, semantic theme, metrics, motion, shadows
- `@uikit/headless` — React state hooks (no DOM)
- `@uikit/web` — DOM components + CSS

There's also a deeper-path convention used internally for primitives that need to be referenced individually (e.g. `@uikit/web/primitives/Modal`). New consumers should prefer the barrel.

## How to add a primitive

1. Drop the component into `src/uikit/web/primitives/<Name>.tsx`.
2. Re-export it from `src/uikit/web/index.ts`.
3. If it has any state machinery that's not platform-specific (e.g. positioning maths, queue logic), put that in `src/uikit/headless/` and have the web component consume it.
4. Don't import `@core/*`, `@api/*`, or `@generated/*`. If the component needs app data, take it via props.
5. Don't add tests — this is a frontend client per [ARCHITECTURE.md](../../docs/ARCHITECTURE.md). Verify with `tsc -b && vite build` and exercise it in a browser.
6. Run `npm run check:uikit` — your move passes only if no boundary leaked.

## Tokens are TS-first

`src/uikit/tokens/*.ts` is authoritative. `src/uikit/web/styles/tokens.css` is generated from it via `npm run generate:tokens`. **Don't hand-edit `tokens.css`** — change the TS, regenerate, commit both.

The semantic theme uses CSS-shaped strings (`color-mix(...)`, `var(--...)`) for the web target. A future RN target will supply its own `SemanticTheme` with flat hex equivalents.

## What's here

- `tokens/`: palette, semantic light/dark, metrics, motion, shadows — authoritative TS source
- `headless/`: empty — controllers land here when the second platform (RN) makes the duplication real
- `web/styles/`: hand-authored CSS (foundations, primitives, components, layout, utilities) plus generated `tokens.css`
- `web/icons/`: 56 SVG icons (`IconHome`/`IconChat`/`IconChevron`/`IconFile{Json,Image,Zip,Text,Default}`/`IconExclamation`/`IconGlobe`/etc.) — branded multi-colour for nav, `currentColor` for utilities
- `web/primitives/`: Alert, Button, Chip, DotBadge, Field, Input, Modal, ConfirmDialog, Select, SegmentedControl, Skeleton, Spinner, SpinnerWithDot, Surface, Switch, Textarea, Toast (`ToastProvider` + `useToast`), Tooltip
- `web/compound/`: BranchChip, Code, CollapsibleSidebar, CommandPalette, JsonView, Markdown, NotificationBadge, PathDisplay, ResizeHandle, SafeText, ShortcutsHelpView
- `web/compound/chips/`: CostChip, ProjectChip, StatusChip, TokensChip, TurnChip
- `web/compound/diff/`: DiffViewer (single-file widget with selectable hunks / intra-line modes / partial-apply), `parseUnifiedDiff` / `generateSelectedPatch` / `generateHunkPatch`, StructuredUnifiedDiff, InlineTextDiff, SimpleUnifiedDiff, SimpleSplitText
- `web/compound/files/`: FileDisplay (with `UikitFileMeta` shape and `onReadPreview`/`onNavigate` callbacks)

What's _not_ here yet — file-input forms (FileMentionsTextarea / FileSelector / RichText / TypewriterText) — is tracked in [docs/implementation-plan.md §B](../../docs/implementation-plan.md#b-pending-tasks).

## Extraction plan

When the package is extracted to its own repo:

1. `git mv src/uikit ../thefactory-uikit/src`
2. Add `package.json` + `tsup`/`tsc` build to the new repo, point `main`/`types`/`exports` at `tokens`, `headless`, `web` barrels and a `web/styles/index.css` asset.
3. Replace the `@uikit/*` alias here with the package name in `vite.config.ts` and `tsconfig.app.json`.
4. The `scripts/check-uikit-boundaries.sh` script moves with the package; CI in this repo runs `tsc` against the published types instead.

No consumer code change, by construction.
