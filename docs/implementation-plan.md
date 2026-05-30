# Implementation plan

Open-work backlog: real tasks plus their blockers. Done tasks are removed — git history keeps the record. For layer rules and conventions see [ARCHITECTURE.md](./ARCHITECTURE.md); for setup see [README.md](../README.md).

---

## Parity mandate

This package is the **spine** holding the three frontend clients together — [thefactory-overseer-web](../../thefactory-overseer-web), [overseer-local](../../overseer-local) (desktop), and [thefactory-overseer-mobile](../../thefactory-overseer-mobile). They must mirror each other as closely as each host platform allows. What that means here:

- **Tokens, headless hooks/stores, business logic, badge math, sanitisers, form state machines all live here.** Logic needed by two clients lives in `src/headless/` (or `src/tokens/` for visual primitives), never duplicated in a client.
- **`src/web/` and `src/native/` are presentation peers with identical public APIs** — same component name, same prop surface, same headless hook underneath, modulo platform-required differences (native `Modal` vs DOM `Modal`, etc.).
- **A shared piece lands here first, then clients pull it in.** Once a real second consumer exists, lifting is mandatory — but don't lift speculatively.
- **Drift between clients is a bug in this package** — a diverging `useFoo` is a missing `src/headless/useFoo.ts`.

---

## A. Open questions / blocked tasks

Pieces waiting on a real second consumer or an external trigger. Don't preemptively lift; when the trigger fires, move the item into §B.

- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver`, tightly coupled to its UI. Lift when the `MergeConflictResolver` native peer ships, or when the conflict-safe-editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) needs to share the algorithm.
- **`DiffViewer` / `MergeConflictResolver` native peers** — stay web-only until a real RN consumer asks. The web conflict-safe-editing flow is the natural pull-forward trigger.
- **`ToolCallCard` / `ToolCallHoverCard` native peers** — the native chat shell ships a `renderToolCall` host slot instead. Lift when a real RN consumer hits the limitation.
- **`HistorySummarizationSettings` / `MessageSanitizationSettings` native peers** — no RN consumer yet. Write the native peers when a mobile chat-settings surface needs them; promote any logic the web + native peers would duplicate into `src/headless/` first.

---

## B. Pending tasks

Backed by the cross-repo plan at `/Users/cloud/.claude/plans/splendid-hopping-sunrise.md`. Four independent features; each pickable by a separate developer.

### B.1 `GitCredentialsForm` — add "Authorize with GitHub" (Feature 1)

Extend [src/web/compound/settings/GitCredentialsForm.tsx](../src/web/compound/settings/GitCredentialsForm.tsx) (and native peer) with two OAuth buttons next to the existing paste field:
- **Authorize with GitHub (redirect)** — `startGitCredentialGithubRedirect` then `window.location.assign(authUrl)`. Disabled when the host can't redirect.
- **Authorize with GitHub (device)** — `startGitCredentialGithubDevice`, show `user_code`, "Copy & open GitHub" button, poll `pollGitCredentialGithubDevice` until `authorized`.

Host capabilities arrive via a new prop `hostCapabilities={{ canOpenBrowser, canRedirect }}`. Native peer (mobile/desktop) only exposes the device flow.

### B.2 `useSpeechToText` headless hook + engine context (Feature 2)

New [src/headless/hooks/useSpeechToText.ts](../src/headless/hooks/useSpeechToText.ts) (signature in the cross-repo plan §Feature 2). The engine is injected via `SpeechToTextEngineContext` — `thefactory-ui` has no platform deps. Native + web `ChatInput.tsx` gain an optional mic button that only renders when `useSpeechToText().isSupported` is true.

Tests at `src/headless/hooks/useSpeechToText.test.ts` — stub engine drives partial/final/error paths.

### B.3 CLI surface — hooks + ModelChip + settings form + permission UI (Feature 4)

Headless additions:
- [src/headless/hooks/useCliConfig.ts](../src/headless/hooks/useCliConfig.ts) + [src/headless/contexts/CliConfigsContext.tsx](../src/headless/contexts/CliConfigsContext.tsx) (mirrors `LLMConfigsContext`). Wires WS `cli:auth-login` chunks into per-loginId streams.
- [src/headless/hooks/useChatCliRunner.ts](../src/headless/hooks/useChatCliRunner.ts) — `cliRunner?: ChatCliRunner` (undefined = API-backed); `attach` / `detach`.
- [src/headless/contexts/createChatsContext.tsx](../src/headless/contexts/createChatsContext.tsx) — in the `sendCompletionWithTools` call site, branch on `chat.cliRunner`: present → `sendChatWithCli`; absent → existing path.
- `usePendingToolGrants(chatKey, runId?)` — unified hook surfacing both API `require_confirmation` calls and CLI `PendingAction`s into a single `PendingToolGrant[]` shape:
  ```ts
  interface PendingToolGrant {
    id: string                          // toolCallId | actionId
    source: 'api' | 'cli'
    label: string
    detail?: ReactNode
    decide(outcome: 'once' | 'permanent' | 'deny'): Promise<void>  // 'permanent' only exposed for cli
  }
  ```

Components:
- New [src/web/compound/settings/CliConfigForm.tsx](../src/web/compound/settings/CliConfigForm.tsx) (+ native peer): list caches grouped by CLI; per-row "Test (models)" (instant) + "Test (live)" (sandbox-boot, spinner + "may take 10–30s" banner); per-row "Default" radio; "Add credential" picker triggers `startAuthLogin` with chunked WS output; per-CLI "Enable in chip" toggle.
- Modify [src/web/compound/ModelChip.tsx](../src/web/compound/ModelChip.tsx) (+ native): top "Use CLI" switch; sub-selector of enabled CLIs + model-list dropdown from `probeModels`; persists via `useChatCliRunner.attach`. Small "API" / "CLI" pill on the chip itself.
- Modify [src/web/compound/chat/ToolConfirmationModal.tsx](../src/web/compound/chat/ToolConfirmationModal.tsx) (+ native): consume the new `PendingToolGrant[]` shape. Per row, when `grant.source === 'cli'`, render a third button **"Allow permanently"** alongside the existing Allow / Deny. Footer Cancel / Deny all / Allow all stays. **No new `CliPermissionModal`** — the existing surface owns both pools.
- Modify [src/web/compound/chips/CostChip.tsx](../src/web/compound/chips/CostChip.tsx) and `UsageModal` (+ native peers): add an "API" / "CLI" pill from `LLMCostLedgerEntryContent.source`. Aggregate breakdowns per source.

Re-exports: append new symbols to `src/web/index.ts`, `src/native/index.ts`, `src/headless/index.ts`.

Doc updates: [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams for the `SpeechToTextEngine` injection seam and the runner-aware `createChatsContext` branching.

---

## C. Deferred

### C.1 React testing setup for headless contexts/hooks

Vitest here runs in `environment: 'node'` with no React renderer, so context providers and hooks (e.g. `OverseerGitContext`, `GitContext`) have no co-located tests — consumers carry the only coverage. Add `jsdom` + `@testing-library/react` (+ `@testing-library/jest-dom`) as dev deps, switch the relevant tests to a jsdom environment (per-file `// @vitest-environment jsdom` or a second vitest project), then add provider/hook tests starting with `src/headless/contexts/OverseerGitContext.tsx` (mount → asserts the `overseer:git-status-changed` WS subscription drives a refresh, and `fetchCommitDiff` delegates with body+signal) and backfill `GitContext`.

Deferred because it's test-infra setup, not a feature blocker — the contexts are exercised through the client apps today. No external trigger; pick up when touching this area or when a context regression slips through.
