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

*(Currently empty.)*

---

## B. Pending tasks

### 1. RN primitives — composite group

The earlier batches (`Alert`, `Button`, `Field`, `Input`, `Skeleton` + `SkeletonText`, `Spinner`, `Switch`, `Textarea`, plus the overlay group `Modal` + `ConfirmDialog`, `Tooltip`, `Toast` + `ToastProvider` + `useToast`) ship from `src/native/primitives/` and consume the shared `useTooltipState` / `useToastQueue` from `headless/`. Remaining primitives:

- **`SegmentedControl`** — wraps either RN's `SegmentedControlIOS` (deprecated; usually replaced by a community component) or a hand-rolled row of pressables. Same `value` / `onValueChange` / `options` surface as the web peer.
- **`Select`** — wraps an `ActionSheetIOS` / Android dialog under the hood. Exposes the Radix-style `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` + `SelectValue` composition shape that web's Select offers, adapted to the platform's modal presentation.

`ResizeHandle` is web-only — no native peer.

### 2. Headless promotions triggered by §B.1

As `src/native/` peers are written, anything currently entangled in `src/web/` that needs to be shared between web and native gets lifted into `src/headless/`. Already lifted: `useTooltipState`, `useToastQueue`. Remaining candidates:

- **`useModalFocusTrap`** — only meaningful on web (RN's `Modal` handles focus). Stays web-only.
- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver` and tightly coupled to its UI. Worth lifting so the mobile (and the in-progress conflict-safe-editing flow in web) can reuse it. Tracked here as the natural shared piece for the lift mentioned in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md#b-conflict-safe-editing--mid-flight-remote-updates-in-filepane).
- **`useFileMentions`** — `@`-mention popover state machine, currently inside web's `FileMentionsTextarea`. Native textarea needs the same suggestions logic.

Promotion trigger: a real second consumer in `src/native/` would need the same code. Don't lift speculatively.

### 3. RN compounds (native siblings of `src/web/compound/`)

The compounds reuse the headless state machines already in `src/headless/` so the native impl is largely presentation. Order roughly by how much value they unlock for mobile screens:

- Chat surface: `MessageList`, `MessageRow`, `ChatInput`, `ChatBody`, `ChatHeader`, `ChatSettingsDropdown`, `ToolCallCard`, `ToolCallHoverCard`, `ThinkingRow`, `SystemPromptBubble`.
- Stories: `StoryCard`, `FeatureCard`, `StoryForm`, `FeatureForm` (already use `useStoryForm` / `useFeatureForm` headless hooks), `DependencyChip`, `DependencyBullet`, `ContextFileChip`, `StoryAndFeatureCallout`, `WarningChip`, `ExclamationChip`.
- Agents: `AgentRunRowCard`, `AgentRunBullet`, `AgentModelQuickSelect`.
- Files: `FileDisplay`, `FileSelector`, `PathDisplay`, `RichText` (use `react-native-markdown-display` or similar for markdown).
- Groups + nav: `GroupHome`, `NotificationBadge`, `SpinnerWithDot`, `DotBadge`, `BranchChip`, `ProjectChip`, `StatusChip`, `ModelChip`, `CostChip`, `TokensChip`, `TurnChip`.
- Diff / merge: `DiffViewer`, `MergeConflictResolver` — these are large enough that they may stay web-only initially. The conflict-safe editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) is the natural pull-forward trigger.

### 4. Documentation pass

- `docs/ARCHITECTURE.md` — drop the `_(future)_` tag on the `native` row of the layer table now that `src/native/` exists with primitives.
- `README.md` — add a "Use from React Native" section pointing at `'thefactory-ui/native'` + the NativeWind setup snippet (consumers add `node_modules/thefactory-ui/dist/native/**/*.{js,mjs}` to their Tailwind `content` array; `@import 'thefactory-ui/native/styles'` in their NativeWind-processed CSS provides the token variables).

### 5. Promote backend API client + auth contexts into `headless/`

The shared spine for talking to `thefactory-backend`. Currently duplicated across [thefactory-overseer-web/src/api/](../../thefactory-overseer-web/src/api/) and [overseer-local/src/renderer/src/api/](../../overseer-local/src/renderer/src/api/); [thefactory-overseer-mobile](../../thefactory-overseer-mobile) will need the third copy if not promoted first.

Lifts into this package (most likely under a `src/headless/api/` sub-path so the "backend client, not a UI primitive" boundary stays readable):

- **Generated SDK** — output of `@hey-api/openapi-ts` against `thefactory-backend/swagger/swagger.json`. The `openapi-ts.config.ts` and `generate:backend` script move here; each client deletes its in-repo `src/generated/backend/` and the script from its `package.json`.
- **`WsClient`, `bootstrap`, `helpers`, `errorMessage`, `types`** — pure TS, no React or DOM. Direct verbatim lift.
- **`AuthContext`, `ApiContext`** — same React surface across clients. Storage is injected via a `TokenStorage` adapter passed to `AuthProvider`: `localStorage` on web, `safeStorage` IPC on desktop, `SecureStore` on mobile.

Cross-client landing (non-negotiable per the parity mandate — same release window):

- [thefactory-overseer-web](../../thefactory-overseer-web): delete `src/api/`, `src/generated/backend/`, `src/core/contexts/AuthContext.tsx`, `src/core/contexts/ApiContext.tsx`; re-point imports at this package; supply the `localStorage`-backed `TokenStorage` adapter.
- [overseer-local](../../overseer-local) (desktop): same deletions under `src/renderer/src/`; supply the `safeStorage`-backed `TokenStorage` adapter that drives the existing `auth:get|set|clear` IPC.
- [thefactory-overseer-mobile](../../thefactory-overseer-mobile): consume from this package on day one; supply the `SecureStore`-backed adapter.

Each client keeps only its first-run / login screen (presentation only) and its 3-line `TokenStorage` adapter. Drop any per-client `npm run generate:backend` script — codegen runs here.

Trigger: §B.2 of [overseer-local/docs/implementation-plan.md](../../overseer-local/docs/implementation-plan.md) lifted the web API layer into desktop verbatim under `src/renderer/src/api/`. That placement mirrors web's `src/api/` 1:1 for parity, but the code itself is non-UI logic — its right home is here. This task collapses the duplication.

Architectural note: the generated SDK is technically a backend artifact and would live most cleanly in a dedicated `thefactory-backend-client` npm package. We accept placing it under `thefactory-ui/headless/api/` to avoid package proliferation; revisit only if the boundary becomes noisy.

---

## C. Non-goals

- Storybook. Visual verification stays `npm run build` + `playground/` smoke run + consumer integration. RN consumers verify in EAS Build + simulator.
- A web↔native style-conversion CLI. The two platforms write their own peers; they don't share a single source for layout. Tokens are shared, components aren't.
- A single CSS bundle that works in both web and native. The styling pipelines stay separate (`src/web/styles/*.css` + Tailwind v4 on web; NativeWind on native).
- Promoting `MergeConflictResolver` or `DiffViewer` to native before a real RN consumer asks. See §B.3.
- A second design system. The whole point of this package is one set of tokens + components across desktop, web, and mobile.
