# Implementation plan

For the layer rules, conventions, and how consumers should use this package, see [ARCHITECTURE.md](./ARCHITECTURE.md). For setup, see [README.md](../README.md).

This file is the open-work backlog: real tasks plus their blockers. If a task is done it gets removed (git history keeps the record).

---

## Cross-client parity mandate (absolute requirement)

This package is the **spine** that holds the three frontend clients together: [thefactory-overseer-web](../../thefactory-overseer-web), [overseer-local](../../overseer-local) (desktop), and [thefactory-overseer-mobile](../../thefactory-overseer-mobile). The mandate, stated identically in each client's `docs/implementation-plan.md`:

**The three frontend clients — web, desktop, mobile — must mirror each other as closely as the host platform allows.** Side-by-side, they should read like the same app adapted to its surface, not three independent products.

What that means for this package specifically:

- **Tokens, headless hooks/stores, business logic, badge math, sanitisers, form state machines all live here.** If a piece of logic is needed by two clients, it lives in `src/headless/` (or `src/tokens/` for visual primitives), not duplicated in each client.
- **`src/web/` and `src/native/` are presentation peers with identical public APIs.** Same component name, same prop surface, same headless hook consumed underneath. Swapping `'thefactory-ui/web'` → `'thefactory-ui/native'` in a screen should compile and behave equivalently, modulo platform-required differences (e.g. native `Modal` vs DOM `Modal`).
- **A new shared piece lands here first, then clients pull it in.** New consumer in any client → check `headless/` first; promote if it's a real second consumer. Don't lift speculatively — but once a second consumer exists, lifting is mandatory, not optional.
- **Drift between clients is a bug in this package.** If web's `useFoo` diverges from desktop's `useFoo`, that's a missing `src/headless/useFoo.ts` waiting to happen. File the promotion ticket, don't accept the drift.

A new contributor opening web, desktop, and mobile side by side should be able to navigate by analogy. This package is the reason that's possible.

---

## A. Open questions / blocked tasks

Pieces waiting on a real second consumer or an external trigger. Don't preemptively lift; when the trigger fires, move the item into §B.

- **`useModalFocusTrap`** — only meaningful on web (RN's `Modal` handles focus). Stays web-only.
- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver` and tightly coupled to its UI. Lift when either the `MergeConflictResolver` native peer (also in this list) ships or the conflict-safe-editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md#b-conflict-safe-editing--mid-flight-remote-updates-in-filepane) needs to share the algorithm.
- **`useFileMentions`** — `@`-mention popover state machine, currently inside web's `FileMentionsTextarea`. Lift when the native chat input grows mention autocomplete.
- **`ToolCallCard` / `ToolCallHoverCard`** native peers — the chat shell ships with a `renderToolCall` host slot in lieu of these. Lift when a real RN consumer hits the limitation.
- **`FeatureForm`** native peer — the headless `useFeatureForm` hook already lives in `headless/`; the web peer doesn't ship a `FeatureForm.tsx` yet. Skip until web ships it.
- **Markdown rendering** in native chat — `SystemPromptBubble` / `ThinkingRow` / `MessageRow` render content as plain `Text` on RN. Lift to a real Markdown native peer (`react-native-markdown-display` is the leading option) when content fidelity becomes load-bearing.
- **Diff / merge** (`DiffViewer`, `MergeConflictResolver`) native peers — stay web-only. The conflict-safe editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) is the natural pull-forward trigger.
- **Lift `WsClient.test.ts` into this package.** Currently lives in [overseer-local](../../overseer-local) (`src/renderer/src/test/WsClient.test.ts`) because desktop already has a vitest setup; web's equivalent test was dropped when its `src/api/` directory was deleted. The test imports `WsClient` from `'thefactory-ui/headless/api'` and the package consumer's vitest mocks `reconnecting-websocket`. Once `thefactory-ui` grows its own vitest config (a one-time chore — devDeps, config, `test` script), move the file here and drop the `reconnecting-websocket` dep + the resolver alias from desktop. Trigger: any second headless-only test would justify the vitest setup.

---

## B. Pending tasks

### 1. RN compounds (native siblings of `src/web/compound/`)

When a real RN consumer needs a web compound, write the native peer in `src/native/compound/<name>/` and rewire the consumer. Promote any logic the two peers would otherwise duplicate into `src/headless/` first.

- **`ChatSettingsDropdown`** + `ToolConfirmationModal` + `HistorySummarizationSettings` + `MessageSanitizationSettings` + `ChatTopicCreateModal` — settings / modal surfaces around the chat. Each is its own pass; the chat shell accepts the dropdown as a slot so consumers can keep using their own for now.

### 2. Documentation pass

- `docs/ARCHITECTURE.md` — drop the `_(future)_` tag on the `native` row of the layer table now that `src/native/` exists with primitives.
- `README.md` — add a "Use from React Native" section pointing at `'thefactory-ui/native'` + the NativeWind setup snippet (consumers add `node_modules/thefactory-ui/dist/native/**/*.{js,mjs}` to their Tailwind `content` array; `@import 'thefactory-ui/native/styles'` in their NativeWind-processed CSS provides the token variables).

### 3. Mobile cutover to `'thefactory-ui/headless/api'`

The full backend client lives in `src/headless/api/` and is the only thing frontend clients should reach for. What ships from `'thefactory-ui/headless/api'`:

- **Generated SDK** — output of `@hey-api/openapi-ts` against `thefactory-backend/swagger/swagger.json`, written to `src/headless/api/generated/`. Re-exported wholesale; codegen runs here (`npm run generate:backend`).
- **`configureBackendClient({ baseUrl, getToken, onUnauthorized, onAuthorized })`** — wires the generated client's `setConfig` + a request interceptor that stamps `Authorization: Bearer <token>` and strips axios's `auth` field (so the xhr adapter doesn't synthesise a Basic header), plus a 401 response interceptor.
- **`sdkTypes`** — friendly aliases over the generated shapes (`ChatMessage`, request-body inputs, envelope-unwrapped Git types, hand-written WS payload shapes for `tests:progress` / `ingestion:progress`, `ToolDescriptor`, `PricingSnapshot`, …).
- **`helpers`** — SDK-typed predicates (`isTestRun`, `isCoverage`, `isGrepHit`) + SDK-independent transport helpers (`extractErrorMessage`, `unwrapGitEnvelope`, `getResponseDataMessage`, `extractServerError`).
- **`WsClient`** + reconnecting-websocket lifecycle.
- **`AuthProvider` + `useAuth` + `TokenStorage`** — consumers supply their own storage adapter.
- **`ApiProvider` + `useApi`** — wraps WS lifecycle + SDK bootstrap. Takes `apiBaseUrl: string | null` + `wsBaseUrl: string | null`; `null` keeps the SDK unconfigured and the socket idle (used by clients whose backend URL is user-supplied at runtime).

[thefactory-overseer-mobile](../../thefactory-overseer-mobile) is the remaining client to land:

- Consume `AuthProvider` + `ApiProvider` from `'thefactory-ui/headless/api'` from day one.
- Supply a `SecureStore` / MMKV-backed `TokenStorage` adapter.
- The mobile app's first-run / login screen is the only presentation it owns; everything else flows from headless.

Architectural note: the generated SDK is technically a backend artifact and would live most cleanly in a dedicated `thefactory-backend-client` npm package. We accept placing it under `thefactory-ui/headless/api/` to avoid package proliferation; revisit only if the boundary becomes noisy.

---

## C. Non-goals

- Storybook. Visual verification stays `npm run build` + `playground/` smoke run + consumer integration. RN consumers verify in EAS Build + simulator.
- A web↔native style-conversion CLI. The two platforms write their own peers; they don't share a single source for layout. Tokens are shared, components aren't.
- A single CSS bundle that works in both web and native. The styling pipelines stay separate (`src/web/styles/*.css` + Tailwind v4 on web; NativeWind on native).
- Promoting `MergeConflictResolver` or `DiffViewer` to native before a real RN consumer asks. See §A.
- A second design system. The whole point of this package is one set of tokens + components across desktop, web, and mobile.
