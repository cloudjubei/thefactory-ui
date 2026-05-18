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

The full primitive surface (`Alert`, `Button`, `Field`, `Input`, `Skeleton` + `SkeletonText`, `Spinner`, `Switch`, `Textarea`, `Modal` + `ConfirmDialog`, `Tooltip`, `Toast` + `ToastProvider` + `useToast`, `SegmentedControl`, `Select` family) ships from `src/native/primitives/`. `ResizeHandle` stays web-only — RN has no equivalent affordance.

### 1. Headless promotions triggered by `src/native/`

When a native peer (or a near-future compound) needs logic currently entangled in `src/web/`, lift it into `src/headless/` and rewire both consumers. Don't lift speculatively — wait for the actual second consumer.

- **`useModalFocusTrap`** — only meaningful on web (RN's `Modal` handles focus). Stays web-only.
- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver` and tightly coupled to its UI. Lift when either §B.2's `MergeConflictResolver` native peer arrives or the in-progress conflict-safe-editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md#b-conflict-safe-editing--mid-flight-remote-updates-in-filepane) needs to share the algorithm.
- **`useFileMentions`** — `@`-mention popover state machine, currently inside web's `FileMentionsTextarea`. Lift when the chat surface lands in §B.2.

### 2. RN compounds (native siblings of `src/web/compound/`)

The native compound surface now covers chip family (`BranchChip`, `ProjectChip`, `StatusChip`, `CostChip`, `TokensChip`, `TurnChip`), `DotBadge`, `SpinnerWithDot`, `NotificationBadge`, stories family (`WarningChip`, `ExclamationChip`, `StoryAndFeatureCallout`, `DependencyChip`, `DependencyBullet`, `StoryCard`, `FeatureCard`, `StatusControl`, `ContextFileChip`), agents (`AgentRunBullet`, `AgentRunRowCard`, `AgentModelQuickSelect`, `ModelChip`), files (`PathDisplay`, `FileDisplay`, `FileSelector`, `RichText`), forms (`StoryForm`), groups (`GroupHome`), and a working chat surface (`ChatBody`, `ChatHeader`, `ChatInput`, `MessageList`, `MessageRow`, `SystemPromptBubble`, `ThinkingRow`). Headless promotions that landed alongside: `useTooltipState`, `useToastQueue`, the `status` utilities, the `path` / file-type utilities, the rich-text tokeniser, the chat-view domain types (`ChatMessageLike`, `ChatContextLike`, `ToolCallLike`, …).

Remaining:

- **`ToolCallCard` / `ToolCallHoverCard`** — tool-result rendering. The native chat surface ships with a `renderToolCall` host slot in lieu of these; the proper native peer can land once a real RN consumer hits the limitation.
- **`ChatSettingsDropdown`** + `ToolConfirmationModal` + `HistorySummarizationSettings` + `MessageSanitizationSettings` + `ChatTopicCreateModal` — settings / modal surfaces around the chat. Each is its own pass; the chat shell accepts the dropdown as a slot so consumers can keep using their own for now.
- **`FeatureForm`** — the headless `useFeatureForm` hook already lives in `headless/`; the web peer doesn't ship a `FeatureForm.tsx` yet. Skip until web ships it.
- **Markdown rendering** — `SystemPromptBubble` / `ThinkingRow` / `MessageRow` render their content as plain `Text` on RN. Lift to a real Markdown native peer (`react-native-markdown-display` is the leading option) when content fidelity becomes load-bearing.
- **Diff / merge** (`DiffViewer`, `MergeConflictResolver`) — large enough to stay web-only initially. The conflict-safe editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) is the natural pull-forward trigger.

### 3. Documentation pass

- `docs/ARCHITECTURE.md` — drop the `_(future)_` tag on the `native` row of the layer table now that `src/native/` exists with primitives.
- `README.md` — add a "Use from React Native" section pointing at `'thefactory-ui/native'` + the NativeWind setup snippet (consumers add `node_modules/thefactory-ui/dist/native/**/*.{js,mjs}` to their Tailwind `content` array; `@import 'thefactory-ui/native/styles'` in their NativeWind-processed CSS provides the token variables).

### 4. Promote backend API client + auth contexts into `headless/`

The shared spine for talking to `thefactory-backend`. The SDK-independent slice has shipped — `WsClient`, `extractErrorMessage`, `unwrapGitEnvelope`, `getResponseDataMessage`, `extractServerError`, `ServerError` now live under `src/headless/api/` and are exposed via the `'thefactory-ui/headless/api'` subpath as well as the main `'thefactory-ui/headless'` barrel. [thefactory-overseer-web](../../thefactory-overseer-web) has been rewired: `src/api/WsClient.ts` + `src/api/errorMessage.ts` are deleted and the trimmed `src/api/helpers.ts` keeps only the SDK-typed predicates (`isTestRun`, `isCoverage`, `isGrepHit`). The `reconnecting-websocket` runtime dep moved into this package.

Remaining work (the SDK-coupled half):

- **Generated SDK** — output of `@hey-api/openapi-ts` against `thefactory-backend/swagger/swagger.json`. The `openapi-ts.config.ts` and `generate:backend` script move here; each client deletes its in-repo `src/generated/backend/` and the script from its `package.json`.
- **`bootstrap`, `types`, SDK-typed `helpers`** — depend on the generated client (`isTestRun`, `isCoverage`, `isGrepHit`, `LastTestsRunRaw`, `LastCoverageRaw`, `GrepHit`, `GrepResult`). Land together with the codegen move.
- **`AuthContext`, `ApiContext`** — same React surface across clients. Storage is injected via a `TokenStorage` adapter passed to `AuthProvider`: `localStorage` on web, `safeStorage` IPC on desktop, `SecureStore` on mobile.

Cross-client landing for the remaining work (non-negotiable per the parity mandate — same release window):

- [thefactory-overseer-web](../../thefactory-overseer-web): delete the rest of `src/api/`, `src/generated/backend/`, `src/core/contexts/AuthContext.tsx`, `src/core/contexts/ApiContext.tsx`; supply the `localStorage`-backed `TokenStorage` adapter.
- [overseer-local](../../overseer-local) (desktop): same deletions under `src/renderer/src/`; supply the `safeStorage`-backed adapter that drives the existing `auth:get|set|clear` IPC.
- [thefactory-overseer-mobile](../../thefactory-overseer-mobile): consume from day one; supply the `SecureStore`-backed adapter.

Each client keeps only its first-run / login screen (presentation only) and its 3-line `TokenStorage` adapter. Drop any per-client `npm run generate:backend` script — codegen runs here.

Architectural note: the generated SDK is technically a backend artifact and would live most cleanly in a dedicated `thefactory-backend-client` npm package. We accept placing it under `thefactory-ui/headless/api/` to avoid package proliferation; revisit only if the boundary becomes noisy.

---

## C. Non-goals

- Storybook. Visual verification stays `npm run build` + `playground/` smoke run + consumer integration. RN consumers verify in EAS Build + simulator.
- A web↔native style-conversion CLI. The two platforms write their own peers; they don't share a single source for layout. Tokens are shared, components aren't.
- A single CSS bundle that works in both web and native. The styling pipelines stay separate (`src/web/styles/*.css` + Tailwind v4 on web; NativeWind on native).
- Promoting `MergeConflictResolver` or `DiffViewer` to native before a real RN consumer asks. See §B.2.
- A second design system. The whole point of this package is one set of tokens + components across desktop, web, and mobile.
