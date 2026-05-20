# thefactory-ui

Shared UI package for every `thefactory-*` consumer — a React 19 component library with a four-layer split (`tokens/` → `headless/` → `web/` + `native/`). Tailwind v4 on the web; NativeWind v4 on React Native.

Status: **scaffolded, not yet published**. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the layer rules, locked-in decisions, file structure, and conventions; see [docs/implementation-plan.md](./docs/implementation-plan.md) for the open-work backlog.

## Install

```sh
npm install thefactory-ui
```

Peer deps: `react@^19`, plus one of `react-dom@^19` (web) or `react-native@>=0.76` (native).

## Use from web

```tsx
import { Button, Modal, ToastProvider, useToast } from 'thefactory-ui/web'
```

Consumers process the styles through their own Tailwind v4 pipeline. From the consumer's main Tailwind-processed CSS file:

```css
@import 'tailwindcss';
@import 'thefactory-ui/web/styles';
```

The single `@import` gives you the design-token CSS variables, the layered styles (foundations / primitives / components / layout / utilities) and a `@source` directive that lets Tailwind discover and generate utilities used by the package's compiled output.

If you only want the design tokens (no layered styles):

```css
@import 'thefactory-ui/web/styles/tokens';
```

## Use from React Native

```tsx
import { Button, Modal, ToastProvider, useToast } from 'thefactory-ui/native'
```

The native peers expose the same component names + prop surfaces as `'thefactory-ui/web'`. Swapping the import path is most of what porting a screen takes; the rest is platform-required differences (e.g. `onPress` instead of `onClick`).

Wire NativeWind v4 in your app once, and add the package's compiled output to your Tailwind `content` so utility classes used inside the primitives are emitted:

```js
// tailwind.config.js
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./src/**/*.{ts,tsx}', './node_modules/thefactory-ui/dist/native/**/*.{js,mjs}'],
}
```

For the design-token CSS variables (so `bg-(--surface-base)` resolves):

```css
/* your NativeWind-processed CSS */
@import 'thefactory-ui/native/styles';
```

When you need a token value directly inside a `style={{}}` prop (e.g. a `shadowColor` or numeric spacing), reach for the RN-typed exports:

```tsx
import { nativeSpace, nativeLightTheme, nativeShadows } from 'thefactory-ui/native'
```

## Develop

```sh
npm install
npm run build           # tsup build of the package
npm run playground:dev  # vite dev server with the playground (live consumer)
npm run typecheck
npm run check:uikit     # enforces the four-layer boundary
npm run generate:tokens # regenerate src/web/styles/tokens.css from src/tokens/*.ts
```

The [playground/](./playground/) is the first real consumer. It imports `thefactory-ui/web` via npm self-reference and runs Tailwind v4 — touching it is the fastest way to validate any change end-to-end.

## Contribute

Boundary rules (enforced by [scripts/check-uikit-boundaries.sh](./scripts/check-uikit-boundaries.sh) on every `prebuild` / `pretest`):

- `src/tokens/` — pure TS. No React, no DOM, no RN, no CSS imports.
- `src/headless/` — React only. No `react-dom`, no RN, no CSS, no DOM globals.
- `src/web/` — DOM + Tailwind. No RN.
- `src/native/` — RN + NativeWind. No `react-dom`, no `web/` imports.

Branch naming drives the auto-release on PR merge:

- `fix/`, `bug/`, `bugfix/`, `hotfix/` → patch bump.
- Anything else (`feat/`, `chore/`, `dev`, …) → minor bump.

The merge-to-`main` workflow runs verification, bumps the version, tags, pushes, and runs `npm publish`. If npm 2FA blocks the publish step, the tag is already on `main` — a maintainer runs `npm publish` locally.

## License

MIT.
