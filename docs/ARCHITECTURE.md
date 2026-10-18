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

- **From `thefactory-ui`** — tokens, primitives, compounds, headless hooks, the backend SDK surface (`thefactory-ui/headless/api`). This is the default; reach here first. Pure `thefactory-tools` helpers an app needs (the git/diff family — `parseUnifiedDiff`, `countPatchAddDel`, `generateHunkPatch`, `getFilePatch`, `getPRUrl`, `mergeUnstagedWithUntracked`; and the process readers — `processStepStates`, `processRunProgress`, `processParkChoices`, `stepChainSummary`, plus the `Process*` types) are re-exported from `thefactory-ui/headless`; import them there, so the app keeps a single dependency edge to `thefactory-ui` and `thefactory-tools` stays an internal detail of the spine.
- **From `thefactory-tools` directly** — _only_ pure, node-free helpers whose output must byte-match the backend's own derivation. Currently that is `getChatContextKey` / `getChatContext` from `thefactory-tools/utils`: they derive the `chatKey` used for routing and cost-aggregate lookups, so a client-side re-implementation that drifts from the backend silently breaks (it did — cost totals read `$0` because the client queried `projects/X` while the backend stored `/projects/X`). Each client re-exports these through its own `core/chats/chatKey.ts` shim.

The direct-`thefactory-tools` exception is deliberately narrow: pure functions, no node dependencies, and a hard "must match the backend exactly" justification. Everything else an app needs from `thefactory-tools` is routed through `thefactory-ui`'s re-export.

## Embedded project apps (the App view)

A project can ship its own **app surface** — a self-contained web app the Overseer embeds in its
**App** tab. `ProjectAppView` (`web/` = an `<iframe>`, `native/` = a `<WebView>`) renders it; the URL
comes from `useProjectAppView`, which mints a short-lived **view token** and points the frame at the
host route `…/projects/<id>/view/<file>?viewToken=…`. The host serves the project's `metadata.appDir`
(falling back to the checkout root) with `Cache-Control: no-store`. The app talks back to the host only
through the **`OverseerBridge` postMessage protocol** (`headless/utils/appBridge.ts`; the `data.*` / `settings.*` payloads are read by thefactory-tools' `projectAppDataQueryOf` / `projectAppDataPutOf` / `projectAppDataRefOf` / `projectAppSettings*Of`, the same readers the backend's App capture harness answers with) — `data.*`,
`activities.*`, `settings.*`, `live-data.*`, `user.current`, `work.start`, `nav.*`, `chat.discuss`/`chat.requestSidebar`,
`story.create`, etc.; the host holds every credential, the app never does.

### Unsaved changes (`overseer:app.dirty`)

An app tells the host its unsaved state, fire-and-forget, once at boot and whenever it changes (the
boot post is what clears a stale state after the app reloads itself inside a still-mounted frame):

```js
parent.postMessage({ type: 'overseer:app.dirty', payload: { dirty: true, message: '2 scenarios not saved.' } }, '*')
// …and { dirty: false } once saved or discarded. `message` is optional.
```

(On native the app posts the same object through `window.ReactNativeWebView.postMessage(JSON.stringify(…))`.)
`APP_DIRTY_TYPE` / `parseAppDirtyPayload` / `appDirtyLeaveMessage` (`headless/utils/appDirty.ts`) read it;
a payload without a boolean `dirty` is ignored. `useAppDirtyGuard(mountKey)` holds the state per mounted
app — a new `mountKey` (project + surface URL + remount key, so every host remount and project switch)
starts clean — and while dirty it blocks leaving through the shell's **leave guard** with the app's
message, or `APP_DIRTY_DEFAULT_MESSAGE` ("This app has unsaved changes. Leave anyway?").

The leave guard is generic: `LeaveGuardStore` (`headless/utils/leaveGuardStore.ts`) holds blockers
(`useLeaveBlocker(message | null)`) and runs a leave-intent at once or holds it for the person
(`useRequestLeave()(proceed)`); a confirmed leave runs with blocking suspended so the navigations it
makes go through. Hosts render the question in the forms' discard-style `ConfirmDialog` ("Unsaved
changes", one destructive **Leave**, X / Esc / back stays):

- **web / desktop** — `RouterLeaveGuard` (`thefactory-ui/web`) wraps the routes. It patches the router's
  navigator so any `navigate` / link to another pathname asks (a query-only change, e.g. an App deep-link,
  does not), intercepts back / forward (`popstate`, reverted and replayed on confirm), and adds
  `beforeunload` while anything blocks. The sidebar's project switch, which sets the active project before
  it navigates, goes through `useRequestLeave`. Desktop's main process answers the renderer's
  `beforeunload` (`will-prevent-unload`) with a native Leave / Stay box, since Electron would otherwise
  cancel the close silently.
- **native** — `LeaveGuard` (`thefactory-ui/native`) sits above the navigator and the nav drawer; the App
  screen routes its removal through `usePreventRemove` → `useRequestLeave`, and the drawer's project switch
  through `useRequestLeave`.

### Live data, the person, starting work and the URL (`live-data.*`, `user.current`, `work.start`, `nav.*`)

Requests (page → host, `{ id, type, payload }`) are answered with `buildBridgeResponse`; a notification
or a push has no `id` and gets no answer. None of them has a timeout on the host side.

**Declared source ids.** A project declares task live-data sources in its `package.json`
(`factory.liveData`, e.g. WarGames' `official-sources`); the backend stores each as
`<projectId>:<declared id>` and subscribes the project. An app names its sources by the **declared**
id; `projectSourceId` maps it (an id already under this project is kept, any other is prefixed, so an
app can never name another project's source), and `findAppSource` accepts only a source whose stored
id matches **and** whose `projectId` is this project. Answers name the source by its declared id again
(`declaredSourceId`). Logic: `headless/utils/appLiveData.ts`; dispatcher: `api/liveDataBridge.ts`.

| Message | Payload | Answer |
| --- | --- | --- |
| `live-data.read` | `{ sourceId? }` | Without `sourceId`: every subscribed source as before (`SubscribedRecords[]`, stored ids), each with `{ autoUpdate, freshnessMs, lastRefreshedAt }` added when the source is known. With `sourceId`: a one-entry array `[{ sourceId: <declared>, recordType, records, autoUpdate, freshnessMs, lastRefreshedAt }]` (`lastRefreshedAt` is `null` before the first refresh). |
| `live-data.refresh` | `{ sourceId }` | The backend's `RefreshResult` `{ sourceId: <declared>, recordType, itemCount, at, error? }`. It waits for the task, which can take minutes; a failed run is `error` in the result, not a rejected request. |
| `live-data.schedule` | `{ sourceId, autoUpdate, freshnessMs? }` | `{ autoUpdate, freshnessMs }` as stored. Sends only `{ autoUpdate, freshness? }`, the fields a task source accepts; a backend 400 comes back as the request's error. |
| `user.current` | — | `{ name, email?, username? }` from the stored git credentials (`GET /git-credentials`, redacted): the connected GitHub account (`tokenSource: 'oauth'`) first, else the first credential that names someone. `name` is the username — a credential's own `name` is its label ("GitHub OAuth (login)") and is used only when it has no username. None: error `No account connected`. (`utils/appUser.ts`, `api/userBridge.ts`.) |
| `work.start` | `{ title, description, features?: [{ title, description }] }` | Shown to the person over the App view (`useAppWorkStart` → web `AppWorkStartDialog`, native `AppWorkStartSheet`): title, description and features, editable until Start makes the story. **Start** makes a story, one feature per asked feature (none asked: the work as one feature, since a run works features), then `start-work` with `mode: 'process'` on exactly those features → `{ status: 'started', storyId, runId? }`. **Cancel** / X / dismissing the sheet → `{ status: 'declined' }`. It waits as long as the person takes (no ask expires); asks queue first come first shown (`AppWorkStartStore`). A failed Start keeps its progress (`startAppWork` carries on from the story it made, never a second one) and shows the error for another Start. When the App view unmounts or remounts (`mountKey`), every open ask is declined with `reason: 'The app was closed before an answer.'` — the page that asked is gone. |
| `nav.current` | — | The deep-link as before, plus `appUrl`: the absolute Overseer URL of the app's route (web / desktop `window.location.href`; mobile `Linking.createURL('projects/<id>/app', { queryParams })`, the `thefactory-overseer://` scheme). Without a deep-link the answer is `{ appUrl }` alone (apps already ignore an answer without `view`). |

**Pushes** (host → page, no `id`, `buildBridgePush`), delivered by `ProjectAppView`'s `pushes` channel
(`useAppBridgePushes(projectId)` → `AppPushChannel`):

- `overseer:live-data.changed { sourceId: <declared id>, status: 'fetching' | 'fresh' | 'error', at }` on
  the WS `liveData:updated` of one of this project's own sources (the event's `projectId`, or a stored id
  under the project when it names none). `at` is when the host received it. Global and other projects'
  sources are not pushed.
- `overseer:data.changed { collection }` on the WS `data:updated` (DataStorage record upsert / delete) of
  this project's records (`scope === projectId`); `collection` is the record `type` — what `data.*` calls
  `type`. The app's own `data.put` / `data.delete` produce one too.

**`overseer:nav.changed { view, params }`** (page notification). The app says where it is; the host
mirrors it in its own URL with the same encoding `nav.open` / `appDeepLinkFromParams` read
(`appDeepLinkQuery`; `parseAppDeepLink` turns number / boolean params into strings and drops route
params): web / desktop `setSearchParams(…, { replace: true })`, mobile `router.setParams(appDeepLinkParamsPatch(…))`
(stale params cleared). It is a query-only replace — no history entry, no iframe / WebView remount, no
leave-guard ask (the guard asks only on a pathname change). `ProjectAppView` handles it when given
`onNavChanged` and records the reported deep-link as the push baseline first, so the `deepLink` prop that
comes back from the URL change is **not** echoed to the app as `nav.open`.

**Agents.** Chat agents have no tool to refresh a live-data source or change its schedule yet (no
live-data names in thefactory-tools' `ALL_CHAT_AGENT_TOOLS`, no host extra tool in the backend).

Showcase: `app-work-start` (`features`, `no-features`, `start-failed`), `live-data-task-source`
(`schedule`). The Live data edit form of a task source (`sourceToForm` → `adapterKind: 'task'`) shows its
name and script read-only and saves only `{ freshness, autoUpdate }` (`formToSourcePatch`,
`LiveDataTaskSourceFields` web + native).

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
   variant** — same `document.write` cache-bust but _without_ `defer` — because its inline bootstrap consumes
   the bridge globals during parse, so the busted scripts must execute before it (defer would leave them
   undefined). Without one of these, a developer editing the app sees no change on reload and wrongly
   concludes the host didn't rebuild — it did; the iframe served a stale asset.

## CLI agents: runner-aware chat dispatch

A chat is **API-backed** by default and **CLI-backed** when it carries a `cliRunner` binding. The binding is persisted on the chat (`Chat.cliRunner = { tool, credentialId?, apiKeyCredentialId? }`) via `useChatCliRunner(ctx).attach/detach` → `attachChatCliRunner` / `detachChatCliRunner`.

`createChatsContext.sendMessage` forks on that binding:

- **API** (no `cliRunner`): append the user message via `addChatMessages`, then `sendCompletionWithTools` with an explicit `messages` array. The CLIENT owns the append; neither the route nor the SDK adds one.
- **CLI** (`cliRunner` set): `sendChatWithCli` with `runner: 'cli'` (the route STARTS the sandboxed run, answers `202 { runId }`, and detaches; the SDK appends the message and persists the reply back into the chat; progress streams on the `cli:run-update` WS topic). The composer does **not** pre-persist — the route owns it.

**Restarting a turn.** When a turn ends without a reply, the conversation's last message is the user's own — or the `Error` notice its failed turn left right under it — and `createChatsContext.restartLastTurn` re-triggers the agent on it — appending no second copy. The notice goes as the restart takes its place: the context drops it at once, and the server takes it off the stored chat as the turn starts (thefactory-tools `chatRestartMessages`, the rule `isRestartableChatTail` applies too). Because the two transports append at opposite ends, the restart forks the same way, and neither fork can be replaced by simply re-issuing the send:

- **API**: the same `sendCompletionWithTools` call as a send, with `messages` read from the chat and the `addChatMessages` step skipped. No new route.
- **CLI**: `restartChatWithCli` → `AgentRunnerTools.restartChatCompletionWithToolsCli`. Re-posting to `sendChatWithCli` would duplicate the message, and `retryChatCompletionWithTools` would delete the very message being re-run. The restart also always seeds the transcript and prompts a session the CLI still holds with a directive rather than the message text, since that session was already handed it by the attempt that failed.

The affordance is `describeLastUserMessageRestart` (`headless/utils/chatMessageRestart.ts`) — the same pure-describe shape as the delete control, rendered by `MessageRow` on web and native, on the user's row or under the failure notice (`isErrorNotice` + `previousRole`).

**Live preview of an API turn.** `completion:progress` names its chat and API turn (`chatContextId`, `turnId`); `createChatsContext` keeps one entry per chat with a send or restart in flight from this client and shows each event on the chat it names alone (`headless/utils/chatCompletionProgress.ts`: `parseCompletionProgressEvent`, `routeCompletionProgress` — the chat is pinned to the first turn it hears, so another turn's `done` never clears it). Two API turns in two chats each keep their own Working state and preview.

Two distinct runner shapes exist and must be mapped at the dispatch boundary: the chat-persisted `ChatCliRunner { tool, credentialId }` vs the dispatch `CliRunnerDispatchOptions { cli, authCredentialId }` (`tool → cli`, `credentialId → authCredentialId`) — see `headless/utils/cliRunner.ts`.

**One settings panel for every model.** `ChatSettingsDropdown` (web + native) shows the same controls whatever runs the chat — no transport flag, nothing greyed. Every completion setting takes effect on a CLI chat too (thefactory-tools `SANDBOX_AND_CLI_AGENTS.md`, "A chat's completion settings bound a CLI turn"): max turns and finish-on-errors bound the resident turn, and the number of messages, history summarization and message sanitization shape the history a CLI session starts from, as they shape every API request. The Tools section's line is one sentence for every model (`CHAT_TOOLS_HINT`, `headless/utils/chatToolTogglesConstants.ts`), rendered by the dropdown itself so no client can word it per transport.

**The model chip always names what the chat runs on.** `LLMConfigsContext` resolves `activeChatConfig` / `activeAgentRunConfig` (and their ids) with `activeLlmConfig` (`headless/utils/modelChip.ts`): the chosen config while it exists, else the first — exactly what a send runs on. A chosen id that was deleted, or never chosen on this device (a fresh browser), used to leave the chip reading "Select model…" while the chat ran on `configs[0]`. The agent-run choice is the server's, not the device's: `activeRunnerKind` and `activeAgentRunConfigId` are read from `GET /agent-runner/active` — whose `activeLlmConfigId` is the config agent runs use (the stored choice while it exists, else the first) — on sign-in and again on every WS `agentRunner:updated` (another device, or an agent's `chooseAgentRunner` / `chooseAgentLlmConfig`); picking writes through (`setActiveRunnerKind` / `setAgentRunLlmConfig`) and a refused write re-reads the server. A read already out when the person picks never overwrites the pick (`agentRunnerSelectionUpdate`, `headless/utils/agentRunnerSelection.ts`). It used to live in this browser's storage, so the Run chip could name a model process steps and launch cards never used. The agent-run CLI pick stays on the device: the Run button sends it with each run and nothing on the server reads it. What the chip says is `modelChipLabel` (same file) on both peers — provider (or CLI) and model on two lines, each cut with an ellipsis inside a `min-w-0` column (`numberOfLines` + `ellipsizeMode` natively), and both in full as the tooltip / accessible label; native names a CLI model by the same short label as web (`shortCliModelLabel`).

**One "working" signal for every agent.** `usePendingToolGrants` also answers `isRunActive` — whether the SERVER is running a turn of the chat now: a CLI run in `running` status, or an API turn the server runs by itself (`GET /completions/turn`, kept live by `completion:turn` events, `chatTurnActivity`). Clients pass it as `ChatBody`'s `isBusy`, so a chat carried on after a decision shows the same "Working…" row and Stop whichever agent it runs on, on web, desktop and mobile.

**One ask list for every agent.** `usePendingToolGrants(ctx, runId?)` lists the chat's broker asks (`listPendingCliAgentActions({ chatContextId })`) — an API chat turn's and a CLI run's are the same records (the backend's "One approval path for every agent") — as one `PendingToolGrant[]`, each decided on its own through `decideCliAgentAction` with `decidedVia`, an always-allow's `grantScope` (`decisionGrantScope`) and the person's edits in `metadata.args`. A grant's `chatRunner` (`'api'` when the ask's run id is an API chat turn — thefactory-tools `isApiChatTurnId`) is only what a launch card names as "the same agent as this chat" (`launchRunnerLabel`); nothing about deciding depends on it, so the launch cards offer their note, model and agent pick on every transport. Ordinary tool asks are decided on the rows that show them: a CLI turn's transcript rows (`cliTranscriptToMessages`) and an API turn's stored rows (`storedChatAskRows`, by the row's `toolResult.actionId`) get the same `approvalId` / `awaitingDecision` / decided-row states and notes (whichever CLI wrote the transcript: Claude Code results in string or content-block form, Codex `mcp_tool_call` items one-shot or resident, Cursor ACP updates with the host's `hostOutcome` — an `errored` one shows the host's words), and the same toggles, "Always allow" and Resume (`useInlineApprovals`, `ToolApprovalFooter`) on web and native; the approval panel keeps the rest (`panelApprovalGrants`). "Always allow" is a split control (`AlwaysAllowControl`, web + native, view from `alwaysAllowChoiceView`): one click gives "Always allow in this chat", the chevron offers "Always allow everywhere" ("every chat, with any model or sign-in" — a rule is never tied to the sign-in it was given on, which the rules lists show as "Given on …" and filter by); `alwaysAllowScopes` on a grant says which are on offer (`cliAlwaysAllowScopes`: none for a `noPermanentGrant` ask, only everywhere for an ask raised outside any chat) and `grantCovers` whether it allows the whole tool or the one exact call. Saved rules: `ChatRulesPanel` ("Rules for this chat", in `ChatSettingsDropdown` via `rulesChatContextId`) and `SavedRulesSettings` (Settings → Saved rules: everywhere first, then project → chat, filters by project and sign-in), both over `useActionRules` and the `actionRules` view utils.

**A call that outlives the call budget looks the same on every agent.** A tool row whose result is a background job (`backgroundJobIdOf`) is typed `BACKGROUND_TOOL_RESULT_TYPE` on a CLI transcript row and on an API turn's stored row alike (`storedChatAskRows`), so it shows as running in the background. Its later result arrives as the same `backgroundResults` user message on both transports, which links back to the call's row.

**CLI grants are read per CHAT, not per run** — `listPendingCliAgentActions({ chatContextId })`. A gated tool call no longer holds its run open while it waits: the SDK raises the approval, waits ~20 s, and returns "still pending, call the same tool again", so the agent routinely finishes its turn with the prompt still waiting and retries on a LATER run. Reading approvals from one runId would make the prompt vanish the moment its run went terminal — i.e. hide exactly the thing the agent just told the user about. `runId` is still resolved (`listCliAgentRunSummaries({ chatContextId, status: 'running' })` — ids only, never transcripts) and returned as `cliRunId`, but only to say which run is currently EXECUTING; **consumers gate the run view on the returned id, never on their own live state**, which a reload loses. An API chat's asks are read the same way, so they survive a reload too, and the server carries the turn on when they are decided — no page has to be open. Both ask lists (pending, decided) are kept per chat for the app's life (`hooks/chatAsksCache.ts`), so returning to a chat paints its rows as last read instead of "did not run" while the re-read lands. CLI configs (auth-cache CRUD, default CLI, enabled set, login streaming, probes) live in `CliConfigsContext`/`useCliConfigs`, mirroring `LLMConfigsContext`.

### Which tools a chat's agent may use

The chat settings **Tools** section is the per-conversation tool allowlist, and it means something on both transports.

Its rows come from `useChatToolCatalog(runner)` → `GET /tools/chat-catalog`, which the backend assembles from the arrays the runtime actually registers from (`ALL_CHAT_AGENT_TOOLS` for an API chat, the `CLI_AGENT_*_MCP_TOOL_NAMES` groups for a CLI chat). They are NOT derived from the chat's own stored settings — that was the old shape, and it made a tool the chat did not already carry impossible to switch on, showed every description as an empty string, and hid every backend-injected tool. `headless/utils/chatToolToggles.ts` owns the pure half (`buildChatToolToggles` / `applyChatToolToggle` / `resetChatToolToggles` / filter + group); the three client wrappers are prop passers.

The two transports keep **separate** allowlists on `CompletionSettings`, because their tool universes differ: `availableTools` for API, `cliAvailableTools` for CLI. Reusing `availableTools` for a CLI run would strip most of its built-ins — including tools no chat setting ever listed.

**A chat asks before it acts.** The allowlist says which tools EXIST; a second, independent axis says which of them stop for a human. `CompletionSettings.toolApprovalMode` (`'ask'` by default, and for every chat that never chose) is the **Run tools without asking** switch in the Tools section — `buildChatToolApprovalToggle` / `applyChatToolApprovalMode` in `chatToolToggles.ts`, rendered by both `ChatSettingsDropdown` peers. Off, the agent stops for approval before anything that acts — a story or file write, `spawnAgent`, any backend-supplied tool — while reads run straight through. On, it runs everything it is permitted to call. It is ONE switch on every transport: an API chat and a CLI chat read it through the same server policy (`buildToolApprovalPolicy`), and there is no per-tool auto-call column any more — which single tools run unasked beyond the switch is the person's "Always allow" rules. Settings stored with the old per-tool list are migrated on read (thefactory-tools `withOneToolApprovalSetting`). The CLI chat's per-turn/resident toggle is gone too: every chat turn runs resident.

The switch **cannot widen the allowlist**: `applyChatToolApprovalMode` writes only the mode, and a tool outside the chat's allowlist is never offered, so nothing downstream can make it callable. An unattended run (`startFeatureWork`) inverts the default — it does not ask for ordinary work, only for the small host-named critical set. See `SANDBOX_AND_CLI_AGENTS.md` §5b.

**Absence means unset, never deny-everything.** A missing or empty `cliAvailableTools` leaves the run with today's full built-in set, so every chat written before the field existed is unaffected. Enforcement happens at MCP **registration** (`createCliToolNameFilter` → `registerMcpToolsFromSchemas`), not at Claude Code's advisory `--allowedTools`: `McpServer` answers `tools/list` and `tools/call` from the same registry, so an unregistered name is genuinely undispatchable, and the boundary holds for codex and cursor too (neither reads an allowlist flag). The approval family (`askUser`, the `request*` tools) and the artifact family (`proposePr`, `proposeCommitToRealRepo`) are never filterable — a run that cannot ask a human fabricates instead, and one that cannot land its work cannot deliver. The resident session-pool key includes the allowlist, or a switched-off tool would keep being served by the session that still has it.

Scope caveat worth repeating to users: this bounds the **factory** tools an agent can reach. A CLI's own Read/Write/Edit/Bash are not MCP tools; the sandbox and the review gate are what bound those.

**Reset to defaults is the same on every model.** The Tools section's **Reset to defaults** puts back the chat TYPE's tool lists (`availableTools` and `cliAvailableTools` — a type that leaves the CLI list unset resets to the empty, self-healing "everything" reading) and its approval switch (absent → `'ask'`): `resetChatToolToggles(typeSettings)` in `chatToolToggles.ts`, fed by `ChatsContext.getChatTypeSettings(ctx)` — the type's settings from `getChatsSettings` with the same fallback `getEffectiveChatSettings` uses. `onResetTools` is required on both `ChatSettingsDropdown` peers, so no client can leave it off for one transport.

**Turns are unlimited unless the chat limits them.** `CompletionSettings.limitTurns` is the **Limit turns per run** switch; the **Max turns per run** slider (`CHAT_TURN_LIMIT_MIN`–`CHAT_TURN_LIMIT_MAX`) shows only while it is on. `buildChatTurnLimit` / `applyChatTurnLimit` (`chatTurnLimit.ts`) render and patch it for both peers; switching it on keeps the chat's `maxTurns`, or starts at `CHAT_TURN_LIMIT_START` (20). Every chat type defaults to off (thefactory-tools `DEFAULT_COMPLETION_SETTINGS`), and the API loop and a CLI turn's guard read the same switch. Settings stored before the switch existed are migrated on read (thefactory-tools `withTurnLimitSetting`: a `maxTurns` still at the old default of 20 becomes unlimited; any other number keeps its limit on). A one-off agent run started from `AgentsContext` keeps its cap (`limitTurns: true`, 50).

### Watching a CLI turn while it runs

A CLI turn takes minutes. It renders through the SAME vocabulary as an API turn — `cliTranscriptToMessages` maps the run's transcript onto `assistant` + `tool` `ChatMessageLike`s and `CliRunMessages` (web + native) renders them through the standard `MessageRow` / `ToolCallCard`. So the user sees each tool NAMED as it is called (running spinner → elapsed time on completion) and the reply filling in as it streams, not a bare spinner.

Under it sits one **activity line** — `describeCliRunActivity` in `headless/utils/cliRunActivity.ts`, rendered by `ThinkingRow`. It answers "what is it doing right now" in strict priority: **blocked on you** > booting the sandbox > running `<tool>` > working, with the elapsed / approximate-output-token readout appended. Blocked outranks everything on purpose: a run parked at the broker emits nothing, so without it a waiting run and a busy run were the same spinner. A blocked line names the tool and swaps the spinner for the teal hourglass the tool cards already use for `require_confirmation`; the row for the call itself is re-typed to `require_confirmation` too (`cliTranscriptToMessages`'s `awaitingApprovalToolNames`), so the badge lands on the exact operation. A row reads **Queued** (`pending`), never a spinner, when nothing is running it: a call made after one the user is asked about in the same message (the CLI sends calls one at a time), an ask decided here whose outcome has not arrived, and an approval no turn has picked up yet (`executedAt` unset — the resumed turn may still be starting). Every decided row says who settled it (`toolCall.decisionNote`, rendered under the row by both `ToolCallCard`s): "Approved by you", "Approved by you (approve all)", "Declined by you", or "Approved by rule: always allow `<tool>` in this chat" / "…everywhere" for a call a standing grant covered (`grantRuleText`, from the action's `grantScope`; none recorded reads as everywhere) — read from the action's `decidedBy`/`decidedVia` (`cliDecidedAsks`), and nothing for asks recorded before decisions were attributed. A call that came back "already carried out" ran nothing and is folded out, like the call that carried an approval out in a later turn. Every decision sends `decidedVia`: a card or panel decides as `card` (`PendingToolGrant.decide`'s default), a row Resume over several listed asks as `approve-all` (`inlineApprovalVia`); a Resume decides only the asks its rows list.

What is blocking comes from the SAME feed as the approval surface — `ChatBody` projects `usePendingToolGrants`' grants through `blockedOnFromGrants`. There is no second channel, so the line and the prompt cannot disagree. The tool's name comes from the broker action's `{ tool, args }` payload (`pendingActionToolName`), which is also what the grant is now labelled with — the action `kind` (`inspect-host-path`) groups permanent grants and does not identify the call.

**Three things keep the live view from going blank**, all in `useCliRunArtifact`:

- The run record is **never allowed to shrink** the transcript (`mergeCliRunTranscript`). Mid-run, the resident runner has not persisted its transcript yet, so `getCliAgentRun` answers with an empty one — taking it verbatim erased everything the user had watched.
- A **remount rehydrates** from `cliRunTranscripts`, a bounded in-memory per-run cache. The live trailing block hands over to the persisted inline row the moment the run's placeholder message lands, and navigating away tears the view down; neither can be recovered from the record.
- The not-ready retry (a just-started run whose record is not on disk) resets **only on a change of run**, never on a refetch. Resetting per retry both wiped the streamed entries and made the retry cap unreachable, so it polled forever.

Live entries are buffered and committed on one `CLI_TRANSCRIPT_FLUSH_MS` tick rather than per entry, and `applyChatLiveStatePatch` keeps the chats-context live-state map identity when a patch changes nothing — a streaming turn re-asserts the same `cliRunId` hundreds of times, and each one used to re-render every chat surface in the app.

`ChatBody.activeCliRunId` is the reload fallback: `liveState.cliRunId` only knows about a send this session made, so hosts pass the run `usePendingToolGrants` resolved from the backend. Clients wire that one prop; everything else is in the package.

**Known gap:** `ResidentCliSessionManager` (thefactory-tools) writes its transcript to the run record only at the terminal write — the per-turn runners flush as they stream (`createTranscriptFlusher`). Until it does the same, a genuine page RELOAD mid-run shows the run's activity from the reload onward, not the steps that preceded it.

### Diagnosing what a chat renders

**One header for chats and runs.** `ChatHeader` (web + native) draws `useChatHeaderView(context)` — the pure `chatHeaderView` (`headless/utils/chatHeader.ts`): the kind tile (`ChatKindTile`, `chatKindOf`, `CHAT_KIND_VIEW`), the title (a run chat's is `run.title`), the status pill of the run, story or feature it is about, a context line with the run's `DurationChip` and the `CostChip` (the run's spend for a run chat, the chat's own messages — `chatMessagesCost` — otherwise), the model chip and the settings gear. The gear opens `ChatSettingsMenu` over `chatSettingsMenuItems`: Notify me, Turn limit and tools (the `ChatSettingsDropdown` panel), Archive from list, the Developer rows — System prompt, Costs, Dynamic context, Debug — only with the **Show developer tools** preference (`userPreferences.showDeveloperTools`, Settings → Developer), then Clear messages… and Delete this chat…. Under a run, story or feature chat sits the `StepsStrip` (web + native): `processRunStripEntries`, `storyStripEntries` or `featureStripEntries` folded by `stepsStripView` — a long list (more than `STEPS_STRIP_FULL_MAX`) or any narrow strip keeps `✓ N done`, the current step with its attempt pill, the next step on a wide strip, and `+N more`; the chips open the whole list. The process run header (`RunHead` in both `ProcessPipeline` peers) uses the same `HeaderBar` layout and the same strip.

The chat settings menu's **Debug** row (Developer section) opens `ChatDebugModal` — one copyable JSON document answering "why does this chat look like this". `useChatDebugDump(ctx, isOpen)` gathers it: the chat record from `useChats`, every CLI run for `getChatContextKey(ctx)` from `listCliAgentRuns`, and the `cliShowThinking` preference the chat actually renders under. `buildChatDebugDump` (`headless/utils/chatDebugDump.ts`, pure) assembles four sections — a header (context key, the attached `cliRunner`, counts, the caps), the stored messages, and per run the **raw `transcript` entries verbatim** beside the `normalizeCliTranscript` steps and `cliTranscriptToMessages` messages those same entries produce.

Raw and interpreted sit side by side on purpose: a rendering bug is almost always a disagreement between what the CLI emitted and how the normalizer read it, and summarising the payloads away destroys the evidence. So payloads are **never rewritten** — they are embedded by reference. Bounding happens two ways instead: individual texts and serialized values are cut to `CHAT_DEBUG_TEXT_PREFIX_CHARS` (keeping their true `length`), and three shared character budgets (stored messages / raw transcript / interpreted views) admit each section whole or not at all, counting what did not fit rather than dropping it silently. Nothing is redacted for content — tool arguments and results are exactly what the agent saw.

The snapshot is deliberately not live: it is gathered when the modal opens and re-gathered only on Reload, so what the user copies is what they were looking at.

**One chat list.** `ChatList` (web + native) draws `useChatList(scope, seen)` — every chat of a project (or a group's own chats with what needs the person and what runs in its projects) as `chatListRow`s: kind tile, title, the run/story/feature pill, the line under it, an `InkBadge` for what waits (chat channel) and what runs (process ink for a working run, chat ink for a thinking agent), and a dot for unread messages. Filter chips All / Needs you / Running / Runs / Stories (`CHAT_LIST_FILTERS`, `matchesChatListFilter`), sections by `chatListSections` (a group's: Group chats, Needs you in this group, Running in this group — each row naming its project), ⋯ → Show archived chats. "Archive from list" is `useChats().hideChatFromList` / `showChatInList` — the list-only `Chat.listHiddenAt`, never `archivedAt` (which closes a chat); the context's `chatListNotice` becomes a toast with Undo where the list is mounted. The backend brings a hidden chat back when something new needs the person. Agent run chats and the assistant's conversations are not in it; a process run's own chat is listed only under Runs, with no badge — it counts on Processes (`chatChannelOf`).

**The Assistant.** `ASSISTANT_NAV_DEF` is the first nav item in every scope (web/desktop `Sidebar`, native `NavDrawer`'s `leadItem`), above a project's or group's tabs; its indicator is `assistantNavIndicator` — chat ink for what waits, moving while an agent replies, else a blue dot for a new reply (each conversation read at its notification level). Its page (`/assistant[/:contextKey]` on web/desktop, `/assistant[/timestamp]` on mobile) lists the `GENERAL` chats through `useAssistantConversations(seen, open)` → `assistantConversationRows` (thefactory-tools `globalChatConversations`: newest first, the list-hidden ones only in the archived view, which stays quiet) in `AssistantConversationList` (web + native): + opens a fresh `newGlobalChatContext()` — listed at the top until something is written in it, persisted by its first message, every other conversation untouched — and ⋯ toggles Archived. The open conversation is the normal chat body under `ChatHeaderConnected`; its settings menu (`chatSettingsMenuItems({ assistant: true })`) says Archive / Move back to conversations / Delete this conversation…, archiving being the same list-only hide with an assistant-worded `chatListHiddenNotice` / `chatListBackNotice`, and the header pill reads Archived. A conversation takes its title from the first thing the person writes in it (thefactory-tools `globalChatTitleFrom`). Agents start one with the `startAssistantConversation` host tool.

### Deleting a turn

`deleteLastChatMessage` is the only delete the backend offers, so the control is **last-message-only** on every runner. A CLI turn is ONE stored assistant message — the placeholder carrying `cliRunId` — plus rows derived from the run record: the tool calls and interim replies `CliRunMessages` renders have no chat message behind them and nothing to delete. So the control sits on the turn's block rather than on a derived row, and its label admits what it does (`Delete this agent turn — its whole run goes with it`). Deleting it takes the turn's whole visible detail with it and leaves the user's message deletable next, exactly as in an API chat. Without this the affordance rendered nowhere in a CLI chat: `MessageList` swaps `MessageRow` for `CliRunMessages` on any message with a `cliRunId`, so the agent's turn had no control — and since that turn is always the last message, neither did the user's.

`describeLastMessageDelete` + `refuseWhileRunActive` (`headless/utils/chatMessageDelete.ts`) own the rules. Deletion is **refused while the turn is in flight**, matching the API path (whose control is already disabled while a completion streams): the composer's Stop is how a run is ended, and removing the message a live runner is about to write back into would race it. The refusal reads from two independent sources — the list's session state (`isSending` / a pending bubble) and, inside `CliRunMessages`, the RUN RECORD's own status, so a turn started before a reload still refuses. `pendingCliRunId` is deliberately NOT one of them: it stays set after a run terminates so the run view keeps its mounted instance, and gating on it would make every finished turn permanently undeletable. The delete also clears the chat's live `cliRunId`, or the trailing live block would remount the very turn just deleted.

Should a run outlive its message anyway, `finalizeRunMessage` (thefactory-tools) writes nothing instead of re-appending: a missing placeholder means the user removed the turn (or cleared the chat), and resurrecting it there is precisely what they asked not to happen.

### Mid-run questions (`askUser`)

A sandboxed agent can park its run and ask the human a question. Mechanically it is the same broker round-trip — a `PendingAction` with `kind: 'question'` — but it is **answered with text, not approved**: the answer rides back as `decideCliAgentAction`'s `metadata: { answer }`. `headless/utils/agentQuestions.ts` owns the split (`isQuestionAction`, `parseQuestionPayload`, `answerDecision`, `declineDecision`, `partitionGrants`), the grant gains `question` + `answer(text)`, and `ChatBody` renders those grants inline as an `AgentQuestionCard` (web + native peers, same props) while the approval panel leaves them out — a question must never surface as an Allow/Deny prompt. Declining decides the action `denied` with an answer telling the agent to proceed on its own judgement. A malformed payload falls back to a generic prompt plus the raw payload rather than crashing. No client uses `window.prompt`. An API chat raises the same question through the same broker (the backend's `withAskUserTool`), so the card, its place in the conversation and its answer are the same whichever model the chat runs on.

The card **takes the composer's place** (the bottom slot that replaces the input, outranking the approval panel): the agent cannot go on without the answer, so a free-text message sent past it would be typed into a conversation that is not listening. Options are rich (`{ label, detail?, recommended? }`, the agent's pick marked "Agent’s pick") and each sends in one click; "Something else…" opens an inline answer box; "Let the agent decide" declines; "Not now — keep it waiting" sets it aside — giving the composer back — as a slim "Still waiting: …" row in the conversation (`MessageList`'s `tailContent`; `splitParkedAsks`, per chat, session-only) with an Answer button. An `answerKind` (`branch`, `file`, `story`, `feature`, `project`, `chat`, `process`) adds a picker filled from host data (`useContextPickerItems` over `useGit` / `useFiles` / `useStories` / `useProjects` / `useChats`, `useProcessPickerItems` over `useProcesses`; pure mappers in `questionPicker.ts`): filterable, the agent's own options marked and first (`withAgentPicks`), options no item stands for kept as one-click rows (`unmatchedOptions`), sent with one primary verb. Several open asks keep the pager. Once settled, the `askUser` row folds to a question→answer bubble (`answeredQuestionOf`, reading the row's `{ answer }` or the decided ask by `toolResult.actionId`).

### One card for every tool that waits on the person

Every non-launch approval renders one anatomy (`ToolAskCard`, web + native, from `toolAskCardView` / `gitChangeAskView` in `headless/utils/toolAskCard.ts`): the host's plain sentence of what it wants under a tool tile, the headline, "Why:" (the agent's `reason` argument), the thing itself (package, host, URL, message with target and wait-for-reply switch, new file with its lines, story/feature delete with what goes and what stays, or a git change's branch picker, commits, toggles, diff), the consequence, and [verb] [Not now] [Decide later]; a destructive ask gets a red header and a danger button. A reusable approval offers a scope radio (`toolAskScopeOptions`: Just this once / Always in this chat / Always, everywhere — the existing always-allow scopes). A decided card folds to one line in the conversation (`toolAskDecidedLine`). `sendChatMessage` and `writeProjectFile` asks are decided on this card, not on their rows (`ROW_DECIDED_ACTION_KINDS`). A git change card's `edits` may be `kind: 'branch'` (a pick among the project's branches — the backend re-reads the card for the pick and holds the change to the card the person saw) or `kind: 'toggle'` (sent as a boolean). A decision on the chat's open changes (`decideChatOpenChanges`: merge, pull request, approve and keep the branch, ask for changes, discard) is read from the card the host built before asking (`chatReviewAskView` → body `kind: 'review'`: the branch, where it goes, the file count and the first files; copy in `CHAT_REVIEW_ASK`); it is always asked with no "Always allow", a discard is a danger card, and a decision the review's gates refuse never reaches a card — its row shows the refusal, as does one approved after the changes moved ("The changes moved since you were asked — ask again."). Showcase: `chat-review-decision` (`playground/scenes/chatPausedRun.tsx`, `moved` among its states). Closing the chat's open changes as already on their base (`resolveChatOpenChangesToBase`) is read the same way (`chatToBaseAskView` → body `kind: 'review'` with a `note` on how they stand: the base holds them, a later commit replaced them, or the base lacks named files and approving closes them anyway — a danger card; copy in `CHAT_TO_BASE_ASK`); always asked, no "Always allow", and one asked without the person's word on changes the base lacks is refused before any card. Showcase: `chat-close-on-base`. An agent's answer to a feature's question (`submitFeatureQuestionAnswer`) is read from the host's card (`featureQuestionAskView` → body `kind: 'question'`: the question as the run asked it, its feature, and the agent's answer; copy in `FEATURE_QUESTION_ASK`): the answer is an editable box, sent back only when the person changed it (`featureQuestionAnswerMetadata` → `metadata.args.answer`), and Send waits while it is empty (`featureQuestionAnswerProblem`); always asked, no "Always allow". Showcase: `feature-question-answer`.

**A paused run's questions in its chat.** When a person's reply in a feature request's chat could not be matched to one of the questions its run paused on, the host posts a message carrying `openQuestionsCard`; `MessageRow` (web + native) draws it as `OpenQuestionsCard` — read live from the story (`openQuestionsCardView`: the run's features only, oldest first; "All answered." once none is open, wherever they were answered), each question with its answer box, answered through the feature's answer route (`useFeatureQuestionAnswers`), which carries the work on server-side. A reply that matched the one open question is taken as its answer by the server, on every model alike; a CLI send that started no run (`send-chat-with-cli` answering without a `runId`) is done at once, as an API send. Showcase: `paused-run-questions`.

### In-chat credential capture

An agent that needs credentials never asks for them in the conversation — the secret must not enter the transcript. It opens a **capture** (`credentialCaptureTools`, in process), the backend broadcasts the record on `credentialCapture:updated` (both on open, so the form appears, and on every resolution), and the chat renders a form for it. The user's fields go **from that form straight to `POST …/credential-captures/:id/submit`**, which stores them the same way the Settings flow does. The agent only ever learns that the capture resolved and which credential (`credentialId` / `credentialName`) it produced.

**`requestGitCredentials` blocks.** The tool call does not return when the form opens — it awaits `CredentialCaptureStore.waitFor(id, ttl)` and resolves on submit / cancel / expiry, so the agent's turn is parked on the human and continues by itself the moment they answer. Returning `awaiting-user` instantly is what made the flow read as "a form is open somewhere, goodbye": the turn ended and the submit had nothing to wake. The window is one hour, matching `askUser` — the user is being sent to another site to mint a PAT.

`useCredentialCaptures(ctx)` tracks the captures for one chat — rehydrated on mount from `listCredentialCaptures({ chatContextKey })`, then kept live over the websocket — and exposes `submit(id, fields)` / `cancel(id)` / `refresh(id)`. The mount fetch is what makes a reload survivable: a capture outlives the page, so without it a refresh would hide a form the agent is still waiting on. The listing serves **only still-requested** captures, so a reload cannot re-pin a form the user already answered. A refused submit or cancel re-reads the record before rethrowing, because the store ages an unfilled capture out to `expired` **on read**, not on a timer.

Every client feeds this into `ChatBody` next to `grants` — `credentialCaptures` + `onSubmitCredentialCapture` + `onCancelCredentialCapture`. The card is gated on both resolutions being wired, so a client that passes none of the three renders no form at all and the agent waits on a capture the user can never see.

The pure half lives in `headless/utils/credentialCaptures.ts`: the WS-payload guard, the awaiting/chat predicates, the feed upsert, form validation, the status → display mapping, and `capturesBlockedOn`; `userAsks` (in `agentQuestions.ts`) merges open forms with questions. **`captureSubmitBody` is the only function anywhere in the package that touches the secret**, and only to build the request body; `credentialCaptures.test.ts` pins that with a sentinel token asserted absent from every other helper's output. The capture record itself has no field a secret could serialize into — confirm against the generated type before adding to this flow.

**The card takes the composer's place, like an `askUser` question.** A capture parks the agent on the user exactly as a question does, so it is answered the same way: no approval in front of it (the backend auto-approves every capture tool — the form carries its purpose and IS the consent), and the card holds the composer's slot until it is saved or dismissed. `ChatBody` (web + native) builds one list of everything waiting on the user with `userAsks(questionGrants, captures)` — questions first, then open forms — and pages through it one at a time ("1 of 2 waiting on you"), rendering `AgentQuestionCard` or `CredentialCaptureCard` for the shown entry. The same placement covers every runner, CLI included, since nothing depends on finding the call's transcript row. `capturesBlockedOn` adds open forms to the live run's activity line, so it reads as waiting on the user rather than working.

Only captures still awaiting the user render at all. A resolved one is dropped: the tool call it belongs to has a real result in the transcript, which says what happened better than a spent form would.

Both peers map over the single `CREDENTIAL_CAPTURE_FIELDS` spec rather than hard-coding inputs, so they cannot drift on which fields exist, which are optional, or which one is masked (`type="password"` on web via `SecretInput`, `secureTextEntry` on native). `host` is the one optional field — it scopes the stored credential to a git host (`dev.azure.com`) and is omitted from the submit body when blank.

### Git credentials — one surface, every host

Settings → **Git Credentials** (`GitCredentialsSettings` on web/desktop, `GitCredentialsSettingsView` on mobile) is host-agnostic: GitHub OAuth is one method inside it, and a PAT for Azure DevOps, GitLab or Bitbucket is a first-class citizen. It was previously framed as "GitHub Credentials" throughout, which made a stored Azure DevOps credential invisible-by-labelling even when listed. Each row shows the credential's `host` via `formatGitCredentialHost`, which reduces a pasted remote URL to a bare host (stripping any `user:token@` userinfo, so a token in that field never reaches the page) and falls back to a sentence for records written before `host` existed — never `undefined`. `normalizeGitCredentialHost` runs the same reduction on the form's input, so what is stored matches what is displayed.

`GitCredentialsProvider` subscribes to the `gitCredentials:updated` ws topic and refetches on it, exactly as `OverseerGitProvider` does with `overseer:git-status-changed`. Without that the list was a snapshot taken at login, and a credential written by any route other than the Settings form — an in-chat capture, a GitHub OAuth device/redirect flow, another window — stayed invisible until a full reload. The event carries `{ action, credentialId }` only: the record holds a decrypted token, so the refetch (authenticated) is the read, never the broadcast. The backend emits it from every git-credential write path — POST/PATCH/DELETE, both OAuth landings, and the capture submit handler.

### Starting work — a process run or in this chat

Every start — a story's or a feature's Run, Accept & start work on a feature request, Start work on one accepted but not started, Start again — makes one choice, drawn by `WorkLaunchChooser` (web + native, options from `workLaunchOptions`, the project's last way — `metadata.workLaunchMode` via `useProjectWorkLaunch` — picked first). Hosts drive it with `useStartWork` (a story or feature) or `useFeatureRequestStart` (a request) and draw it with `StartWorkDialog`: in the chat starts at once (`startStoryWorkRequest` / `startRequestWork` / `startRequestAgain`, the person's active agent as `chatAgent`), a process run opens `StoryLaunchDock` — the same `ApprovalPanel` launch card an agent's `startFeatureWork` raises, fed a `storyLaunchGrant` whose Approve launches with the card's picks. `onStarted` hands the host where the work went (the chat, or the run's pipeline). On every launch card a `SegmentedControl` switches Process run / In this chat (decision metadata `mode`), and "Suggest setup" (`useLaunchSuggestion`, `LaunchSuggestionPanel`) asks the agent the launch runs on once for the setup — the CLI picked on the card or the agent asked for (`launchAgentPickSuggestionAgent`, body by `launchSuggestionBody`), else the API model — each setting with why; a CLI that cannot answer says why on the card. "Use these" sets the card (`launchSuggestionPicks`, `launchSuggestionProofEdits`) and never launches. A launch opened from a page runs on the person's active agent (`storyLaunchGrant`'s `agent`, from `useStartWork().chatAgent`) unless the card picks another. An agent's `acceptProjectFeatureRequest` is decided on its own card, not its row (`isToolAskDecidedOnRow`): the request and a `WorkLaunchChooser` starting on the agent's proposed way; Accept carries the pick as `args.mode` (`acceptRequestDecisionMetadata`). Scenes: `work-launch-choice`, `work-launch-request`, `work-launch-accept-ask`, `launch-suggestion`.

### Processes — the pipeline surface

**Group runs — work that landed outside the run, and resuming.** `processGroupBadge` reads a group run that ended with only some projects merged as "Partly done" (`PROCESS_GROUP_PARTLY_DONE_BADGE`; the engine now ends such a run `failed` with a summary in `group.error`, shown under the legs and on the chat card). A leg row (`processGroupLegRows`) carries `canMarkLanded` — thefactory-tools `processGroupLegLandingRefusal` allows it: stopped, skipped or not merged — and `landed` once marked ("Landed on main by e9b3c02 — merged by an agent from its run’s chat"). Both pipelines (web and native `ProcessGroupPipeline`) put "Mark as landed" on such a leg, opening `ProcessGroupLegLandingDialog` (web and native) over the shared `useProcessGroupLegLanding`: the person may name a commit, "Check" calls `checkProcessGroupLegLanding` and shows `processGroupLandingCheckView` (the commit, the base branch, where it was found, the story done — or every problem), and "Mark as landed" is enabled only by a check that proved it and records exactly that commit (`markProcessGroupLegLanded`). `processGroupResumeView(group, plans)` puts "Resume" in the header of an ended group run whose skipped legs can now start (confirm modal stating what starts once each merged prerequisite is rebuilt as its real plan says — built (the running server's own checkout in place when nothing reloads it), built in a scratch copy (that checkout under a watcher), only its API description refreshed, nothing, or not here — with the plan's reason; `reopenProcessGroupRun`), or says what a skipped leg still waits on. The plans come from `useProcessGroupRebuildPlans(legIds, planRebuild)` (`GET …/legs/:legId/rebuild-plan`) for `processGroupResumeRebuildLegIds(group)`; a plan not read yet reads "rebuilt if what needs it uses its build output". After a check proves a leg landed, the dialog states what follows for the legs that need it (`processGroupLandedNextView`: in a live group run, the leg's plan, read for `processGroupLandingPlanLegIds`; in an ended one, resume to start them). Wording is thefactory-tools `processGroupRebuildSummary` / `processGroupStartWords`, shared with the backend's cards. `useProcessGroupRun` gained `checkLanding`, `markLanded`, `planRebuild` and `reopen`; refusals land in its `actionError` like the park answers'. The park block (web and native `ProcessGroupParkReview`) renders whatever thefactory-tools `processGroupParkChoices` offers, so a prerequisite-build park (a failed or refused rebuild) shows Build it again, Skip the rebuild (`skip-rebuild` — the legs that need it start without it; the leg records who skipped it) and Stop with no UI change.

A **process** is the unit of agent work: a named sequence of steps (implement →
verify → report) with the loop edges that send a failed step back. The engine
and every pure reader live in `thefactory-tools`; this package ships the three
surfaces and the mapping that keeps them honest.

`useProcesses(projectId)` fronts the library — the shared definitions plus this
project's own, resolved so a project entry SHADOWS a global one by id. Saving
inside a project always writes the project's copy, so editing a shared process
from a project screen **forks** it rather than changing the library everyone
else uses; the row says which it is. `useProcesses` also reports the step kinds
this build can EXECUTE, and the editor offers only those — a kind the save
would refuse must never be selectable.

`useProcessRun(runId)` fronts one run and keeps it live on the
`process:run-update` topic. The server pushes the WHOLE record on every step
change, on purpose: a client that re-fetched per step would flicker through a
loading state on every node, which is most of what the user is watching.

**A run a person ended reads as their decision, never as a crash.**
`processRunPersonEnding(run)` (`processView.ts`) names a run that failed on a
person's "no" — "Changes requested", "Rejected" or "Abandoned", with where and
their words — and `processRunBadge`, `processRunChipLabel` and
`processRunCardView` use it in place of "Stopped", so the run rows, chat cards
and pipeline headers agree; the pipeline's ended line (`RunEnding`) says it
too. A request for changes at a gate always sends the work back (the engine
adds a fix in front of a gate with none), so the park note composer has one
copy (`PARK_NOTE_COPY`, "Send back to be fixed"). A run an earlier build ended
on such a request (`processRunSendBackGateId`) offers **Send back for changes**
on its pipeline — `useProcessRun().sendBack()`, `POST /process-runs/:runId/send-back`
— and the story chip shows "Changes requested →" for it (`processStatusOverlay`,
which also carries the chip's `title`).

Three components, each with a `web/` + `native/` peer:

- **`ProcessPipeline`** REPLACES the message list for a run — the plan, where it
  is, which attempt, and what it is parked on, which is exactly what a
  transcript buries. Each step is ONE line (`processStepRowView` in
  `headless/utils/processStepRow.ts`): its status dot, its name — a feature step
  by its `DependencyBullet` alone — a one-line result read from what the step
  recorded (a review's verdict, "Waiting for you", "Not needed — nothing was sent
  back"), the standard time and cost chips, and a chevron only when it produced
  something. A skipped, not-needed or not-reached step is grey, dashed and inert:
  no chips, no chevron. The chevron opens a preview card of the step's output
  (`StepPreview`): a code review's verdict badge, severity counts and criteria
  tally (`codeReviewPreview`), a report's tiles (`reportPreviewTiles`), a
  feature's stages as chips (`processStageChips`), a checks list, or an agent
  attempt with its attempt chips. A preview or stage chip opens the full view in
  a right-hand side panel on web (`StepSidePanel`: the code review, report,
  checks, the verify proof or the chat via `renderAgentRun`; ↗ opens the host's
  full page through `onOpenAgentRun`, ✕ closes) and a pushed step screen on
  native (`StepScreen`, "‹ Pipeline" + ↗, the system back closes it). A step's
  filing is found by `stepFilingOf` (`useStepFiling`): the newest report of its
  author filed while its attempt ran. Drilling into a feature's own pipeline
  stays in-component with a breadcrumb (the stages row's ↗). There are no "Open
  the …" text links. The run head keeps words off its actions: a Group chip
  (`IconGroup`, tooltip `SIGNOFF_GROUP_CHIP_TITLE`) for a group's leg, an
  icon-only Stop while the run can still do work, and a ⋯ menu (`OverflowMenu`
  on web, `ActionMenu` on native) with Copy run link (web), Download report (at a
  sign-off) and Delete run… (which still confirms).
- **`ProcessRunChip`** is the chat card for the run `startFeatureWork` launched.
  **It reports; it never decides.** A parked run says a decision is pending and
  nothing more — which one, and the choices that answer it, live in the
  pipeline. A second door to the same decision is how two surfaces drift apart.
- **`ProcessesView`** is the library screen. Web takes a `narrow` prop and
  collapses to one pane; native is always one pane.

**The checks step.** A `check`-kind step — the seeded `checks` step right after
the implementing agent in `feature-default`, `fix-default` and
`feature-self-verified` — runs the project's non-agentic checks (build, type
check, lint, format, unit tests) as plain commands, no agent and no judgement.
Its node lists each command of its newest attempt under it (`ProcessCheckList`,
web + native, from `processCheckRows` in `headless/utils/processChecksView.ts`):
the label, ✓ / ✗ / ! / –, an "advisory" marker on a command whose failure does
not stop the step (lint, format), where it ran — a "sandbox" / "host" chip whose
hover (web) or accessibility label (native) says why a host run could not use the
sandbox (`ranInLabel` / `ranInDetail`) and, for a host run, which revision of
each dependency outside the checkout it built against, on which branch ("Built
against thefactory-tools on dev at 1a2b3c4 with uncommitted changes", or "main at
5d6e7f8 (a clean copy)" for a stable-branch snapshot, `dependencyDetail`) — a
dashed "pre-existing" / "partly pre-existing" chip on a failure the change's base
shares, its hover or label saying how it compared (`baselineLabel` /
`baselineDetail`) — and its duration. The sign-off's check
chips say the same at the end of their detail and of an available check's last
run (`checkRanInSentence` in `checkMethods.ts`: "Ran in the sandbox." / "Ran on
the host — why"). A test command that counted its tests says so on its row
("Unit tests ✓ passed — 14 tests", `testCountLabel` in `testCounts.ts`, read from
the result's `testCount` before its summary); one that ran none is `skipped` by
tools with "0 tests ran", so its chip is never green. **A chip opens the tab its
check is in**: `reviewCheckGroups` (`runReview.ts`) splits a run's checks by the
method each rolls up into (`checkMethodFor`), so a project's unit-test COMMAND
sits in the Tests tab beside `tests` checks — split by `kind`, a green Tests chip
opened a tab its check was not in. The chips put what was checked first, in tab
order, and what was not — skipped, available, missing — last (`checkRowLayout`);
the Tests and Build tabs list only the methods that ran (`ranCheckMethods`) and
exist only when a check in them ran (`ranReviewChecks`), since the dashed chips
already say what did not. Each check there shows its command, and
`reviewCheckMeta`'s line — variant and why (`variantReason`: the default, or the
flavor source set the change touched), the modules it covered, test count, where
it ran, the out-of-tree revisions it built against and how a failure compares with
the base (`dependencyDetail`, `baselineDetail`). A test check is drawn by the same
**Tests display** as the Tests screen — `TestResultsList` (web + native; native's
`inline` lays it out inside a parent that already scrolls), fed by `checkTestResults`
(`testResults.ts`: each kept suite as `module › name` with its counts, time and
failing tests with their messages; else the failing tests the runner named, grouped
by file, and what passed under the command; totals from `testCount`; how many suites
the bounded record left out) — with its raw output folded beneath. All command
output renders in ONE terminal block, `TerminalOutput` (web + native): dark in both
themes, monospace, scrolling in its own container, with a copy button on web.
`terminalOutputView` (`terminalOutput.ts`) turns SGR colour and weight codes into
styled spans, drops every other escape sequence and control character, lets a
carriage return overwrite its line, and reads codes whose escape character was lost
(`[32m…[39m`) as codes when a reset among them says so — no raw escape sequence
reaches the screen. What a run could not
cover (`coverageNote` — tests in a directory no Gradle module includes) is said
in a note, and a command result recorded before checks kept their command and
output says so (`legacyNote`, `LEGACY_CHECK_RECORD_NOTE`) instead of reading as
an empty success. A `developer-verifier` step —
the self-verified process's one agent, which implements and proves the change
itself — is read as a verify attempt filed under its own run, exactly as the
tools' `processVerifyReview` reads it (`PROVING_AGENT_TYPES`). Every surface that
names a role does it through `agentRoleLabel` ("developer + verifier").

**Checks against a sibling's stable branch.** When the checks failed against
out-of-tree code with pending changes and ran again at that code's stable branch,
the attempt carries `siblingFallback` (`stable-passed` / `stable-failed` /
`unavailable`). `ProcessCheckList` (web + native) leads with `SiblingFallbackNotice`
— its heading and tone, the host's sentence ("Passed against shared-db@3161c83;
your pending changes in shared-db break it: …"), a chip per dependency (its
working tree, "pending changes", → the stable branch@commit used), what failed
(collapsed) and why a dependency could not be checked — and a `SegmentedControl`
between the attempt's two runs ("Stable branch" / "Your pending changes",
`siblingFallbackCheckSets`); all from `headless/utils/siblingFallbackView.ts`. The
run's chat gets a host message carrying `processRunChecksEntryId`;
`RunSiblingFallbackNotice` reads that attempt live off the run
(`useSiblingFallbackNotice` → `siblingFallbackNoticeState`) and marks it history
once a newer checks attempt ran ("Checked again since — this no longer applies" /
"… see the newer notice"). `MergeChecksResult` shows the same notice under its
summary (which already carries the sentence). The project editor's "Stable
branch" field (`ProjectStableBranchField`, web + native; `projectStableBranchField`
/ `projectStableBranchError` in `headless/utils/projectStableBranch.ts`) trims the
value, drops the key when blank and says inline when git would not take it as a
branch. Showcase: `checks-stable-branch`, `run-chat-stable-branch-notice`,
`merge-result-stable-branch`, `project-stable-branch-field`.

**The process the agent chose.** `startFeatureWork` may name a `processId`;
`startFeatureWorkGrantSummary` reads it (trimmed, on either transport) and both
`ApprovalPanel`s hand it to `useProcessProposal`, so the plan read before
approving is the one the launch will run — a story process forked to nest
`feature-self-verified`, or any definition.

**The launch card's shape.** The launch `ApprovalPanel` is bounded — at most
~62% of the window (web `max-h-[min(62vh,600px)]`, native `maxHeight` from
`useWindowDimensions`), with an expand toggle — with its header ("Needs you",
the story) and its decision (Decide later · No — cancel · Start work) pinned and
everything between scrolling; web `ChatBody`'s panel wrapper is shrinkable, so
the messages give way first. Unbounded, a story of a dozen features pushed the
decision off the screen with no way to reach it. In the body: the open-work
choice when there is one, then "How it runs" — a row of chips (how features are
worked, the model, "Isolated copy") — then `LaunchFeatureList` (web + native):
each feature ONCE (`launchFeatureRows` merges the proposal's per-feature chain
with its proof row), its proof as summary chips with "Edit" opening the kinds
and notes in place, warnings always shown, and its pipeline steps behind "Show
steps" (the story's tail after them). Then the notes, the agent's note and the
run note, each collapsed.

**How features are worked — the person's choice.** When the proposal works
features one by one (`proposalFeatureProcessId`), the launch `ApprovalPanel`
shows `FeatureProcessChooser` (web + native) — one chip naming the way chosen,
opening "Developer, then Verifier" and "Developer + verifier in one" (the story
process's own marked "Default") in a popover on web (fixed-positioned, so the
scrolling card never clips it) and in place under the chip on native, each with
its one plain line (`featureProcessOptions`, copy in `processFeatureProcessConstants`),
and a line saying a fix is made by a fixer and proven by a verifier either way.
It shows the story process's own feature process until the person picks
(`featureProcessChoice`); a pick re-fetches the proposal with
`featureProcessId`, so the nested pipeline shows the self-verified shape before
anything runs. The pick rides the decision as `{ featureProcessId }`
(`featureProcessMetadata`) — the same decision on every transport — and the
server validates it against the definitions that exist. Over open work, "add to
that process" hides the choice: the added features are worked the way that run
works its own. A pair the gate counted from a
developer-verifier's capture of its uncommitted workspace is captioned as the
code it held (`captureBuildCaption` with the pair's `counted`,
`CAPTURE_SAME_CODE_LABEL`), never as a wrong commit.

**How each feature is proven — the proof plan.** Whoever asks for a feature
decides what proves it: its `proofPlan` (thefactory-tools' kinds — unit tests,
checks, code review, before/after screens, live backend, manual — and notes on
what must be shown). The feature editor sets it beside the new Acceptance
Criteria field: `useFeatureForm` holds it as a `ProofPlanDraft`
(`toggleProofKind`, `setProofNotes`) and submits it canonical, an edit clearing
it with `{ kinds: [] }`; `ProofPlanEditor` (web, exported for both web clients'
`FeatureForm`s; native inside `FeatureForm`) says when the feature inherits its
story's plan or has none. The launch card's `LaunchFeatureList` (web + native) shows, per feature, from the preview's `proofPlans`
(`headless/utils/proofPlanView.ts` → `launchProofPlanRows`): each feature's
plan, where it came from ("Suggested — the feature has no plan" when today's
automatic choice stands in), every kind toggleable but one the host or process
cannot prove — struck through with why and held off (`disabled`; only an older
plan that still asks for it flags it, and it can be dropped) — what the
feature's or story's own plan asked for that was dropped (`dropped`,
`PROOF_PLAN_DROPPED_LINE`), notes, and "Save
these plans to the features" (forced, with a line saying why, when the work
joins an open run), and a warning on a feature the preview marks `looksUi`
while its plan asks for no before/after screens — or, when only its words say so
(`looksUiByWords`), a quiet hint instead (`uiHint`, `UI_CHANGE_WORDS_HINT`). `proofPlanMetadata` rides the decision as `{ proofPlans,
saveProofPlans }` on every transport. The story
sign-off marks each feature's plan per kind (`proofPlanMarkRows` over the
tools' `processRunProofPlanStanding`, on `FeatureSignoff.proofPlan`), drawn by
`ProofPlanMarks` (web + native) in `FeatureReviewSection`: met, not met,
unchecked with the reason, not judged yet, or yours to check. Tool previews
print a plan in a line (`proofPlanFieldText`).

**The branch the work goes off — the person's choice.** The launch preview
carries `baseBranches` (thefactory-tools `ProcessBaseBranchOptions`: the
checkout's `current` branch, the `preselected` one, and every local branch with
`dev` and `main` first; absent for a folder with no git of its own). The launch
`ApprovalPanel` shows `BaseBranchChooser` (web + native) in "How it runs" — one
chip ("Branch dev") opening the branches in a popover on web and in place on
native: `dev`, `main` and the current branch (tagged "Current") first, then
"Other branches", and a line saying the work starts from it and goes back into
it when approved (`baseBranchChoiceView`, copy in `processBaseBranchConstants`).
It shows the person's pick, else the branch the agent asked for
(`StartFeatureWorkGrantSummary.baseBranch`) when the project has it — saying so
when it does not — else the preselected one (`baseBranchChoice`); the choice
rides the decision as `{ baseBranch }` (`baseBranchMetadata`) on every
transport, and the server refuses a branch that no longer exists. Over open
work, "add to that process" and "a new process on its branch" replace the chip
with "Same branch as that run". A group launch (`GroupWorkLaunchPanel`) shows
the same chip on every leg, from that leg's preview `baseBranches`, and sends
every leg's branch as `{ legBaseBranches }` (`groupBaseBranchMetadata`).

**Starting a story that has open work.** The launch preview carries the story's
`openWork` (a run still going, parked, waiting at its sign-off, or finished and
not merged). The launch `ApprovalPanel` then shows `OpenWorkChooser` (web +
native) first in its body: which run, where it stands, the three ways on — add
to that run, a new process on its branch, a fresh branch (marked risky) — as one
row of choices (stacked on native), what the picked one entails, and the
warning for that state (`processOpenWorkView`). Start stays disabled
until one is picked; the pick rides the decision as `{ openWork, runId, state }`
(`processOpenWorkMetadata`), as the decision's metadata on every transport —
the choice is the person's and never the agent's. A run that took added work
tags each added step "Added <date>" and lists what came in, and what it closed,
set aside or reopened, above its pipeline (`processAmendmentView`). While the
open run is live (running, parked, waiting at its sign-off) only adding to it
is offered — no second run of a story starts beside it — and the chooser shows
that run as the host's live card (`renderProcessRun`, threaded from `ChatBody`
through `ApprovalStack` / `ApprovalPanel`, so it opens the run); when it can
take none of the work the chooser says so (`processOpenWorkView(...).blocked`)
and Start stays off. Features an earlier merged run already delivered are
listed under it ("Already done by …", `AlreadyDoneNote`, from the preview's
`alreadyDone`); a group launch lists them per leg and shows a leg's open run
by its card (`openRunId`). Showcase: `story-open-run`.

**Flaky tests.** A checks step's row carries a "N flaky" chip naming the tests
that failed in the full run and passed when their file ran again alone
(`checkFlakyChip`, on `ProcessCheckRow.flaky`); the sign-off's tests tab lists
the project's known flaky tests from its checks listing (`knownFlakes`,
`projectFlakeRows`, `ProjectFlakesList` web + native) — runs seen in, when last,
and the fix filed for one seen in 3 runs. Showcase: `process-check-list`
(`flaky-passed`, `flaky-and-failed`), `project-known-flakes`.

**Merged after regenerating.** An approved run whose merge re-conflicted only on
generated files that were rebuilt and checked merges with no second "Confirm the
merge"; the run's merge result and its sign-off record say "Merged after
regenerating <files>; checks passed at <sha>" (`processRegeneratedMergeNote` in
`processIntegrationView` and `processSignoffRecord`). Showcase:
`regenerated-merge`.

A park is answered with NAMED choices (`processParkChoices`), never a generic
"resume": the reasons a run parks are not interchangeable — nothing was
measured, the check said no, the retries ran out — and one button would hide
which one this is.
A pipeline reads a run's choices with `processRunParkChoices(run)`, which adds
what the run itself offers: at a checks park whose base branch moved on
(`run.baseMoved`, read by the backend on every read), "Bring in main (2 new
commits) and re-check"; after that conflicted, "Send to the developer to
resolve" or Stop. "Try again" says what it will do: inside a checks loop whose
work branch moved past the checks that failed (`run.workBranchTip`, read by the
backend for a parked run) its detail is "The branch changed since “Checks”
failed, so “Checks” runs again first." — rendered as given, no component logic.
Once it has, the retried step reads `rechecked` (`ProcessStepState.rechecked`
from thefactory-tools' `processStepStates`; `processNodeState` → a dashed, queued
marker, never the red of a failure) and its line says "Try again ran the checks
first — branch changed (597e5bd9)" (`PROCESS_STEP_RECHECKED`, the commit the
checks ran on) instead of the old attempt's error.
`BaseMovedNote` (web + native, laid out by
`processBaseMovedView(run)`) says "main has 2 new commits" above the pipeline,
with the same choice while the park offers it, and the newest time the base was
brought in.

**An agent waiting on you** (`step-waiting`, the ask on `park.ask`) gets its own
card in `ParkBlock` (web + native `WaitingCard`), laid out by
`headless/utils/processWaitingView.ts` → `processWaitingView(run)`: a heading by
kind ("The verifier needs network access", "The developer has a question", "The
developer is blocked"), the agent's own words, what exactly it asked for (host,
package, URL, tool), a link to its transcript, and the answers its kind takes —
each button with its one line (`allow` "Allow <host> and continue", `resolved`
"Issue resolved — Continue", `more-info` "Provide more info" / "Answer",
`delegate`, `abandon`) — the run's own `processRunParkChoices`, so where the
agent could not go on (`ask.agentFailed`) "Try again" leads, with
`RetryChoiceOptions` to carry its agent on or start fresh. "Provide more info" and "Answer" open `ParkNoteComposer`
with `waitingNoteCopy(kind)` and `required` (`parkNoteRequired`): the words ARE
the answer, so it will not send blank. "Delegate to another agent" calls
`useProcessRun().delegate()` (`POST /process-runs/:runId/delegate`); the run
stays parked and the card then offers "Delegated to another agent — open the
chat", opened through the host's `onOpenChat(context)` — a prop on
`ProcessPipeline` and `ProcessRunsView` (web + native), wired by each client to
its own chat navigation, since this package never navigates. A story's mirror of
the park says "Waiting on you: <title>" and points into the nested run, where it
is answered. `isResumeParkChoice` separates the choices that go through resume
from `delegate`. A park reason this build no longer raises (an old
`step-question`) renders its stored message with Try again / Stop. The same
request also shows on the agent's chat composer; the backend resumes the run the
matching way whichever surface it is decided on, so the two never disagree. A
process agent's `reportBlocked` (its last-resort "I am blocked", which replaces
`askUser` in every process step) is a `blocker` ask: the pipeline card shows its
words — what blocks it, what it tried, what it needs from you — with no tool row,
and the chat composer answers it on the question card (`isQuestionAction` takes
the `blocker` kind, `parseQuestionPayload` reads its fields). An API step that
waits MID-STEP (`park.stepInFlight`, its entry still running) shows the same card
with the same choices; answering hands the decision to the same in-process agent.
Captures an attempt filed before it waited stay on the sign-off: its scope is
every ledger entry's run, waiting attempts included.

`headless/utils/processView.ts` is what stops the two peers drifting: one place
says what an outcome is called and which status tone it carries. The tones are
the package's own semantic set (`--status-<key>-*` on web, `status[key]` on
native), never invented names — **a colour that resolves to no token renders as
nothing at all, which looks deliberate and is therefore worse than being the
wrong colour.** Work an agent is doing right now carries its own `running` tone
(`PROCESS_LIVE_TONE`, sky blue): the "Running" and "Manager on it" pills, the
current step, the Processes list's Running heading, a running group leg, an
agent resolving a merge conflict, an agent run's status chip. `done` green is
only finished work, `review` gold only the sign-off, and `working` orange the
story status "Working" and the host's own merging and building.

Time and cost are never computed in a view. Every run arrives with `totals`
(derived from its ledger by thefactory-tools), and `processRunWorkMs` /
`processStepWorkMs` / `processRunSpend` / `processStepCostLabel` read them — a
step's time is every attempt's, and a clock ticks only while `totals.ticking`.
Each surface once had its own formula, and they disagreed by hours and by
dollars.

A time CHIP says the total; where it went is ONE details view,
`headless/utils/processTimeDetails.ts` → `processTimeDetailsView(time, workMs, manager?)`,
read off the `time` breakdown every total carries (`ProcessRunTotals.time`, a
step's, an attempt's — thefactory-tools splits each attempt from what its agent
runs recorded): **Agent thinking** and **Tools & commands** always, then
**Setup, checks & landing**, **Other** (time no record could place — never
forced into a part) and **Still running** when non-zero, each with its duration
and share, the three slowest tools (`mobileTestBuildApp ×3 — 4m 12s`), and time
**waiting on a person** beside the total, never in it. A run's time chip (its
header and its chat's) also passes `totals.manager`, adding one **Agent manager**
line — its turns' charge as `costChipLabel` words it (a subscription's share
unknown, never $0.00) and their work time, counted in the total. While a step runs, the
clock carried on since the totals were read is still running, so the parts
always add up to the chip. Every time chip opens it through `DurationChip` — a
hover/focus/pinned popover on web (`TimeDetailsPanel`), a long press opening a
bottom sheet on native (`TimeDetailsSheet`, so a press on the row still does
what it did): the pipeline's run head, each step and each inline sub-step, and
the sign-off's head, Overall and every feature (`RunReviewFacts.timeDetails`,
summed across scopes by `storySignoff` with the tools' `sumProcessTimeBreakdowns`).

A cost CHIP says one thing: the charge, in dollars (`costChipLabel`) — `$0.00`
is a real value for work a subscription covered, and a spend cap reads
`$x of $cap`. When no charge is known the chip says why instead of a `$0.00`
it never was: `Charge pending` (a metered run still going — its runner prices
it with its terminal write), `No known price`, or `Not reported` (a CLI that
reported no token counts). A CLI run's recorded `costUSD` is never read: before
billing was kept it held Claude Code's list-price estimate and Cursor's "no
price found" $0; a run's cost comes from its per-model rows and billing, read
through `thefactory-tools` `cliRunSpends` so a run's chip and its process
attempt's chip agree. Everything else a cost knows lives in ONE details view,
`headless/utils/costDetails.ts` → `costDetailsView(cost)`: the tokens a plan
included, the metered tokens with no known price (unknown, never $0), the list
value, a row per model with how it was paid for, and notes on what the record
cannot say (which model Cursor's Auto used; usage beyond a plan's allowance).
Every chip opens it through `CostChip` — a hover/focus/pinned popover on web
(always a tab stop, so it is never put inside a `<button>`: a clickable row is a
stretched button with the chip beside it), a bottom sheet on native — whether the cost is a pipeline ledger cost, a CLI run
(`cliRunCost`) or a chat message's usage (`messageUsageCost`). The usage modal's
tables come from `useUsageBreakdown` on both clients, so a column, a ledger read
or a price estimate cannot exist on one and not the other. Prices are looked up
exactly as the backend charges them (`thefactory-tools` `getPrice`), never by a
near match.

Each details row names how its model was paid for (`Included in your Cursor
subscription`, `API key — billed per token`, `Free`). A count the CLI never
reported — every count of a Cursor resident turn, the output of a Claude Code
turn cut off before its `result` line — reads `Not reported by <tool>`, never 0,
and such a row has no list value. A list value that leaves some tokens out — a
row beside it without one; in the usage modal, the ledger's unlisted, unpriced or
not-reported tokens — reads `≈ $x for the tokens with a known price` in the
details and `$x (known prices only)` in the modal, so a part is never shown as
the whole.
A CLI turn's chat message carries the usage its run was stamped with — per-model
rows, billing, list value, written by the tools' CLI dispatch from the run
record — so a stored chat opens the same details as the run. The usage modal's
CURRENT table counts a CLI turn under each model its rows say ran, named as the
ledger names it (`Cursor · Composer 2.5 (subscription)`), never under the
`cli-agent/<cli>/<model>` tag its message carries. A landed review record — the
one a process step's chat opens — mirrors the run whose work it lands
(`mirrorOf`) and carries no spend of its own; its cost and duration are read off
that run (`cliRunSpendRecord`). The UI's cost math extends the tools'
(`processEntryCostFromSpends`, `sumProcessEntryCosts`) only with states the tools
never write — no billing recorded, a run still going — and the parity tests in
`costDetails.test.ts` hold the two alike on every row shape the tools do write.

Every pricing panel words a price through `priceListEntryView`
(`headless/utils/priceList.ts`): its source and all five rates, a rate the
catalogue leaves out shown as the one the ledger bills it at — a cache rate at
the input rate, a one-hour write at the cache-write rate — so no client fills a
gap its own way.

A decided sign-off keeps its record on the step (`SignoffRecord`, from
`processSignoffRecord`): each decision says who took it and where, from the
`override`'s `decidedBy` / `decidedVia` — "by you · on web" (or desktop, mobile,
"in the agent’s chat", "on the feature’s question"), or "by the run’s chat agent
· proposeRunStart, approved by you" — and nothing for decisions recorded before
they were attributed. Every app says which it is (`ApiProvider`'s `client`), and
`useProcessRun` sends it as `decidedVia` on every answer and start of changes.

The story sign-off shows exactly what the verify gate judged
(`headless/utils/verifyProof.ts`): each feature's header comes from its verify
attempt's standing — passed, unchecked ("the reviewer approved, but the proof
could not be confirmed", with every reason), failed, or **accepted by you** (a
person's `override` at a park) — never from the CLI check rows, which stay
listed as their own rows. Counted before/after pairs come first, then new
screens (each beside its entry point on the base), then what did not count and
why. A dry verification always says what the live backend must send; a proof
whose reviewer never named its data — a code read, tests, a real fixture — says
nothing about data at all (`verifyProofHeader` gives it no title, detail or chip,
and `ProofBanner` shows only which builds its pairs had to come from). Each side
of a pair is captioned from its own build record, never from the commit it was
supposed to be built from.

**A run's own chat, and "Needs you" as cards.** One chat serves a whole run tree — the top run's (`run-<id>` topic; the server refuses a nested run its own). Every page of the tree carries its icon-only button (`RunChatButton`, web + native, `RUN_CHAT_OPEN_LABEL`, a dot while the chat has news — web reads the shared `useChatsSeen` map, native takes the host's `chatsSeen`): the run header at any depth, a drilled-into nested run's, and a step's panel (web `StepSidePanel`) or screen (native `StepScreen`). `useProcessRunChat(run)` finds the tree's top run (`resolveProcessRunChatRoot` climbs `parentRunId`, reading cached runs first; no root when a parent is gone or the links loop) and opens its chat (`open`, which creates it server-side). On web the chat docks beside the run in `RunChatDock` — the story chat's own `ChatSidebarPanel`: a flex sibling flush with the run's page column (no reserved padding, no overlay, so no strip between them), dragged at its left edge between the sidebar width (`--sidebar-w`) and half the window, kept at that width while the page stays open, its collapse chevron closing it — or, on a small screen (`narrow`, from `ProcessRunsView` / `ProcessGroupRunsView`), the story chat's `BottomSheet`; its body is the host's `renderChat(context, onClose)` (`ChatPanelBody` in overseer-web and overseer-local with `dockedLabel` = `RUN_CHAT_TITLE`). Beside its run the chat's header is one slim row — collapse, "Run chat", the chat's own editable model chip, open in its own view (`ChatHeader` `dockedLabel`, web + native) — since the run's title, status and steps are on screen beside it; maximized on the Chat screen it gets its full header back. A narrow `ChatHeader` (any docked panel or sheet, the story chat's too) is two rows (`HeaderBar` `narrow` + `secondary`): collapse, the kind tile, the title — truncating but always given the room left — and the icon controls ("i", maximize, gear); then the pill, the meta line and the model chip, wrapping as needed. Untitled (the title in the app bar), the pill and meta take the title's place. Native's narrow header puts the model chip on the meta line under the title the same way. The page column is the positioning box for the step panel, so a step's panel opens beside the chat rather than under it. On native the host pushes the chat (`onOpenRunChat`). Asking an agent about a stopped step, and the sign-off's "Needs you" cards, stay on the top run's own page. The showcase records the header at each depth, the dock, the slim and narrow headers and the maximized chat (`run-header`, `run-chat-dock`, `docked-chat-header`). At the sign-off, `ProcessPipeline` provides `RunNeedsYouProvider` (headless), so the report's `NeedsYouSection` shows each item as a card (`runNeedsYouView`: title, body, how it was settled; the header says "N decisions left") with **Discuss** — the chat opened with the item quoted as its draft (`runNeedsYouDiscussDraft`, set through `useChats().setDraft` before the chat mounts, so the person edits it before sending) — and **✓**, fine as it is (`resolveNeedsYou`). Outside a sign-off the same section is the report's plain list. The chat's proposals (`proposeRunFeature`, `proposeFeatureChange`, `proposeRunStart`, `withdrawRunChange`, `proposeStepRerun`, `resolveNeedsYouItem`, and the run's own buttons — `answerRunPark` / `stopProcessRun` (answering the stop the run waits at, "Try again" among them, and the header's Stop: kind `park` / `stop`, the card titled by the step and nested run the host named — `nestedRunTitle` —, its chip and button the answer's own label, its effect the host's line, e.g. "Try again at “Checks” in “Read PDFs”: Run this step again."), `decideRunGate` (kind `gate`, green for approve, red for reject, titled by the gate, with the request's words and proof chips), `retryRunIntegration` (kind `land`), `resolveRunIntegrationConflict` (`resolve-conflict`, the files it resolves), `sendRunBackForChanges` (`send-back`, the request it goes back with) and `removeProcessRun` (`delete`, red, a danger button, the host's plain statement of what goes ending "This cannot be undone.", the branches deleted too) — the same cards whether the call came from the run's own chat or, naming the run by `runId`, from a project, group or general chat (a `Run` section then names it). **An approval that lands work shows — and lets the person change — exactly how it lands**: `RunProposalLandingEditor` (web + native) under the card's header, from the host's `landing` (`runProposalLanding`): the way (a segmented control over the ways offered), who it is committed as and the message, or the account a pull request is opened as and its title and description, starting at exactly what the card states (`runProposalLandingForm`) and, on another way, at that way's own words (`runProposalLandingWithMode` → thefactory-tools' `processIntegrationFormStart`, the function the sign-off's `IntegrationChooser` starts from too — re-exported through headless with `processIntegrationFormDecision` and `processIntegrationModesOffered`); what the sign-off's form would refuse disables approving (`runProposalLandingProblem`), and approving carries the whole landing as the person set it in the decision's `metadata.args` when they changed anything (`runProposalLandingEdits`), the generic edit path the GitHub setup card uses. A project with no git of its own shows one line, nothing to choose. A request for changes whose proof the host pre-set as the sign-off does shows it as "Proof required (as the sign-off pre-sets it)" — `requestChangesProofPreset` and `uiChangeScopeOf` now come from thefactory-tools, re-exported through headless, so the sign-off and the agent's card require the same. A group run's buttons — `answerGroupRunPark` (kind `group-park`: why it waits, the leg, how it is merged), `stopProcessGroupRun` (`group-stop`), `removeProcessGroupRun` (`group-delete`, red, danger), `markGroupLegLanded` (`group-landed`: the leg, the commit the server's landing check found with its subject, where it was found, the note) and `resumeEndedGroupRun` (`group-resume`: the legs it starts, the prerequisites built first, the agent) — and deleting a project's own process definition, `removeProcess` (`remove-process`, red, danger), use the same card.) take the composer's place as `RunProposalApprovalPanel`, kept compact because it is pinned in a ~360px drawer: one header row (kind chip, the feature's `DependencyBullet`, title, an icon to read the whole proposal in a wider `Modal` — a `BottomSheet` on native), the one-line effect, a "Show the details" toggle that opens the sections in a bounded scroll (each closed to one line — `runProposalView` sections: words as markdown, acceptance as numbered criteria via `runProposalCriteria`, proof as chips, summaries cut by `runProposalOneLine`), and a footer that always keeps the decision in reach ("Stage change" / "Add to this run (staged)" / "Stage re-run" / "Start work", "Not now", "Decide later"); the card is capped (`max-h-[min(55vh,480px)]`, and ChatBody's approval slot at 65%) so the messages above stay scrollable. A start's card lists exactly what the host stated it runs and on what (`runProposalHostDetail` → `runProposalStartDetail`). Their rows preview through the same view, one line per section. **Approving a change never starts work** — a step re-run included (its card: "Stages a re-run of <step> — nothing starts yet.", `RUN_PROPOSAL_RERUN.effect(step)`): it is staged on the run (`ProcessRun.pendingChanges`), and the pipeline shows `RunPendingChanges` above the steps (`runPendingChangesView`: "3 changes waiting to start: #14.1 reworked · #14.3 added · Re-run Code review" — a re-run has no feature number, its item's `name` says it, `RUN_PENDING_CHANGE_RERUN`; a start's card lists it as `Re-run “Code review”`; ✕ per change → `useProcessRun().withdrawChange`, and the primary "Start work on 2 changes" → `startChanges(changeIds)` — exactly the ids shown — enabled only at the sign-off, otherwise saying why). Approving the sign-off while changes wait is refused by the engine. Work a start adds shows as the pipeline's existing "Work added to this run" note and added step, and the status pill reads Running while it runs.

**A change to the person's real repository has its own card — the same for every agentic model, CLI or API.** The backend's git change tools (`commitGitChanges`, `createGitBranch`, `moveGitBranch`, `mergeGitBranch`, `applyGitMergePlan`, `recoverGitText`, `pushGitBranch`, `openGitPullRequest`, … — `GIT_CHANGE_TOOL_NAMES`) are asked under their own kind, so `ApprovalPanel` (web + native) routes them (`isGitChangeGrant`) to `GitChangeApprovalPanel`, never to an inline row with "Always allow": the host's card (`gitChangeCard`, the payload's `detail` — never the agent's arguments alone) shows the headline, the warning line "This changes your real repository at <path>" in the stuck tone, the repository's absolute path, the branch, the run working on it with its live status (`useProcessRun`), who it is committed as, the arguments the card lets the person change (`card.edits` — a commit's or squash's message, a pull request's title and description; each starts as the host read it, `gitChangeEditValues`, and only the changed ones are sent as `metadata.args`, `gitChangeDecisionMetadata`), the host's facts, the commits it brings or drops (`CommitChip`s) and the exact diff (files, coloured patch, a note when cut). Approve is disabled while the run works on the branch (`gitChangeProblem` over thefactory-tools' `processRunWorksOnBranchNow`) or a required edit is empty, and reads "Approve — cannot be undone" in danger style for a `danger` card. Once carried out, the tool row's milestone shows the SHA read back from the repository (`gitChangeMilestone`, registered in `toolRowMilestone`) — with a link to the pull request `openGitPullRequest` opened, or to the host's page to open one from —, or why nothing changed. A run's page lists changes made to its work branch from outside it (`WorkBranchChangesNote`, web + native, over `processWorkBranchChangeRows`).

**Which model does the work — and changing it.** The run header shows the model its work runs on now through `RunModelControl` (web + native) over `processRunModelChipView` (headless `runModelChange.ts`: the model, named by what its latest attempt on it reported — `claude-opus-5-5` reads `Opus 5.5` through `modelDisplayName`; whether it can still change; a change waiting; when a pick applies). While the run is live it is the host's chooser chip — `ProcessPipeline`'s `renderModelChip` slot (`RunModelChipSlot`: `useRunModelChip` → `runModelChipSlot` over the launch-pick helpers, with the run's chat context and the picker's `note`), which the apps fill with their chat chip in chooser mode (`ModelChipConnected` / mobile `ModelChip` with `overrideModel` / `overrideCli` / `overrideApi`) — and each pick goes to `useProcessRun().setModel` → `PUT /process-runs/:runId/model` for the whole run tree. The picker opens with when a pick applies: "Takes effect when the current step finishes." while a step agent is at work (`totals.workingModels`), else that it applies now. A change waiting for the agent at work reads "Opus 5.5 → [Sonnet 5.5] from the next step". An ended run shows the read-only `RunModelChip`. A step row adds its own chip only when its latest attempt ran on another model than the run's now (`processStepModelChip`, from the attempt's stamped `ProcessLedgerEntry.model`). The run's chat keeps the editable chip every chat has in its header (`ChatHeaderConnected`): it changes what the chat runs on, never the run. An agent's `setRunModel` call is asked on the shared tool-ask card (`runProposalView`, kind `model`: "Opus 5.5 → Sonnet 5.5" and the pending-or-now sentence, `RUN_PROPOSAL_MODEL`). Showcase: `run-model-chip` and `run-chat-model-chip` (`playground/scenes/processModel.tsx`).

**A chat turn's changes: one sign-off, and a way to drop them.** A turn whose captured changes a later turn of the chat captured again (`supersededBy`), or that the person discarded (`discardedAt`), renders its `CliRunArtifactPanel` (web + native) as one line (`chatChangesNotice`, `CHAT_CHANGES_COPY`) and loads no preview, evidence or plan; the backend's `reviewUpdated` on that run is what makes an open panel re-read it. A pending one in apply mode offers **Discard** beside **Apply to project** (`useCliRunArtifact().discard`): discarded changes are never applied nor carried into the chat's next session.

**The run's agent manager.** `processRunManagerView(run, now)` (headless, pure, over thefactory-tools' `processRunManagerParkState`, `processManagerHandledSummary`, `processManagerEscalationLabel`) reads the top-level run's `manager` record: the switch (`RunManagerChip` in the run head — `useProcessRun().setManager` → `PUT /process-runs/:runId/manager`; shown only while the run is live), what it is doing on the park (`RunManagerPanel`: "Manager is looking at this…", "Manager is holding this until … lands.", or its card — why it needs you, what happened, what it found, what it tried, what it recommends, and "Talk it over in the run's chat"), its pre-read at the sign-off, and "Handled for you: N" (each intervention: what, because why, → how it came out, coloured by outcome). Shown at the top level of the pipeline only (web + native). Decisions it took read "by the agent manager" in the sign-off record. The project form carries the project default (`metadata.processManager`, `projectManagerSettingsOf`, `PROCESS_MANAGER_AUTONOMY_OPTIONS`). Its run-chat messages are hand-offs (`handoffFrom: 'manager'`), rendered as such.

**A missing capability is set up through a chat draft.** A chip whose method the project does not have (`unconfigured`, asking for a set-up — never a withheld capture, which only the user can allow; `capabilitySetupOffered`) offers **Set it up with the agent** (`SetUpWithAgentButton`, web + native: a chat icon and `CAPABILITY_SETUP_LABEL`) wherever it is explained: the sign-off evidence card's missing tab, every `CheckChipRow` popover or sheet, and `ChecksTab`'s set-up line and empty state — in place of the "Ask the agent to …" hand-off. It never sends anything: it opens a chat with an editable draft built by `capabilityChatDraft(capability, context)` (`headless/utils/capabilityChatDraft.ts`, pure) from what is known — the capability, the project's checks scan (`projectChecksSummaryLines` from the tools, the same words the run chat's brief carries), the platform and the capture approach's availability for UI tests, screens and walkthroughs, the common tools of the ecosystem as suggestions only, where the checks scan would detect the new command (`CAPABILITY_DETECTED_FROM`, mirroring `detectProjectChecks`; UI tests and captures say plainly the scan will not pick them up), and the ask: propose it as a feature added to the run before sign-off or as its own story, with acceptance criteria, the command or set-up, and a proof plan. Which chat: inside a run's pipeline, the run's own chat — `ProcessPipeline` (web + native) provides `RunChatDraftProvider` with its `openRunChat(draft)`, and `capabilitySetupHandler(useRunChatDraft(), …)` reads it in `StorySignoffReview` and in a process-owned `CliRunArtifactPanel` shown in a step panel; outside a process, the chat the run panel sits in, through the host's `onDraftMessage` (each client wires it to its composer's `onInputChange`). With neither — a step's run opened on its own page — no button shows.

**How approved work lands.** `IntegrationChooser` (web + native) is the approval
dialog: first the way (merge / merge as one commit / pull request, narrowed for a
group leg by `processRunIntegrationModes`), then its details, read for the run by
`useProcessIntegrationOptions` (`GET …/integration-options`) and held by the pure
`processIntegrationForm.ts`: for a merge or squash **Commit as** — every stored
credential with a name and an email as "Name <email> · account on host", the
project's marked default (`processIntegrationIdentityLabel`) — the **commit
message**, and **Build and type-check the result before it lands** (`checkMerge`,
`PROCESS_INTEGRATION_CHECK_MERGE`; starts on, or as the person last set it); for a pull request **Open it as** (the remote host's accounts) and its
**title and description**. Each starts from the person's last decision for that
way, else the server's defaults (`processIntegrationFormStart`), and a preview
shows how it will read where people look at it — "As it will show on GitHub":
the squash commit, or the merge commit (none when the base has not moved) and the
commits it brings, or the pull request, each with who made it
(`processIntegrationFormPreview`). `processIntegrationFormDecision` builds the
`ProcessIntegrationDecision` the resume (or retry) sends, or names what is
missing. A project with no git of its own has one way and no details.
`IntegrationResult` shows what landing came to — while a checked landing runs it
says the result is being built, and a landing's `checks` show as
`MergeChecksResult` (web + native: the summary, a `CheckChip` per check that ran,
and the failed checks' output in `TerminalOutput`; `mergeChecksView`); an agent's
landing card (`RunProposalLandingEditor`) offers the same `checkMerge` toggle and
carries it in the card's edits (`runProposalLandingEdits`). When the work conflicts with its
base it offers **Resolve with an agent** (primary; `useProcessRun().resolveIntegrationConflict`),
**Try again** and **Open a pull request instead**. While the agent resolves it the
result says so, naming the files; when the run waits at its `confirm-landing`
gate it shows the commit the checks ran on — the one that lands (`checks.checkedSha`,
falling back to the merge commit before any check recorded one) — the files and the checks, and the ordinary
sign-off Approve — prefilled with the earlier decision — lands it.

**Merging in the Git view.** `MergeBranchSheet` (web + native) merges a branch into
the current one: pick it, say how, merge. **Build and type-check the result before
merging** (`checkFirst`) starts on for a merge committed right away into the
repository's default branch (`mergeChecksOnByDefault` over `GitUnifiedBranch.isDefault`),
off otherwise, and cannot be on for a merge left staged. While it runs the sheet
shows what is happening and for how long; a result that fails stays in the sheet
with `MergeChecksResult`, the branch unmoved. `MergeOutcomeNotice` adds the checks'
summary under the outcome (`GitMergeOutcomeLine.checksNote`).

**Current and History.** `isProcessRunCurrent` (`processRunCurrent.ts`) decides
the Processes list's tabs (`useProcessRuns().current` / `history`), the nav
counts (`processTallyByProject`: approved work that has not landed counts as
waiting, work landing as running) and, through `processStatusOverlay`, the story
chips ("Not merged" / "Landing"): a run is Current while it works or waits, while
its approved work is landing or has not landed, or while it can still be sent
back for changes it ended on. Only work that landed (merged, or found already on
its base — `isProcessIntegrationLanded`), was let go, or had nothing to bring in is
History.

**The story sign-off page.** At a story's sign-off the run reads top to bottom:
its header, the pipeline (the steps, where the run's history lives), then
`StorySignoffReview` (web + native) below them, in three cards (with `ProcessCleanupCard` between the decision and "What this is" — see below):

- **Decision** — the verdict badge with its tally, "Story sign-off", the
  headline, and words only on the three decisions: **Approve story** (through
  `IntegrationChooser` when a work branch must say how it lands — see "How
  approved work lands" below), **Request
  changes** (`ParkNoteComposer`) and **Reject** (with a confirm). `onChoose`
  resolves `false` when the server refused, and the refusal shows inline in this
  card (`error`, the run's `actionError`) — `useProcessRun().resume` and
  `retryIntegration` now resolve whether they were accepted instead of failing
  silently. A group leg that cannot merge yet (`mergeHold`) offers no Approve
  and says what it waits on. Under the headline sits ONE attention list
  (`signoffDecisionItems` in `signoffDecision.ts`, drawn by `SignoffDecisionList`
  web + native): each item an icon, one line and chips — never a coloured box
  and never an underlined text link. The person's own request leads when the
  newest fix pass answers it (`signoffRequestOutcome`): "Your request “…” is met —
  1 before/after pair", each counted pair a thumbnail chip that opens the pair
  viewer, and the fix pass as its step chip, which opens the pipeline's side
  panel (native: the step screen) on that pass's verify attempt through the
  `onOpenStep` prop `ProcessPipeline` wires — or its row, without one; "is not
  met: …" from the pass's `unmetRequest`. Then what to act on
  (`signoffAttentionItems`): a section accepted without its Verify passing, or
  verified dry — each named by its `DependencyBullet`, with an eye icon ("See
  what Verify said") that opens that feature's row.
- **What this is** — `StorySpecCard` (web + native): the story's
  `DependencyBullet` and title, a checklist chip that opens every feature's
  acceptance criteria under its own chip (`signoffSpecCriteria`), and the
  description as markdown, clamped at three lines with a fade and a small
  chevron pill under it only when its measured height is more (web: scroll vs
  client height under a `ResizeObserver`; native: the content's `onLayout`
  height against the clamp, since markdown is several text blocks), then one row per fix pass and feature
  (`signoffFeatureRow`): its chip, title, proof-plan chips with their marks
  (`signoffProofChips`), "N of M criteria met" — the feature's `acceptance`
  lines matched to the code review's criteria (`judgeAcceptance`; "7 of 8
  criteria judged met · 1 not judged" when the review skipped some, never the
  review's own tally; that only for a feature listing no criteria) — the fix
  pass the person's request was about with its counted before/after pairs, its
  status, time and cost chips and a chevron that
  opens its acceptance criteria, `ProofPlanMarks` and the feature's own evidence
  (`FeatureReviewSection kind="embedded"`).
- **Evidence** — the story-wide chips ARE the tabs (`signoffEvidenceChips`):
  checked methods first in tab order, each opening the tab its proof is in;
  what was not checked last, dashed, opening its own explanation. Report opens
  `SignoffReportPanel`; Tests and Build `ChecksTab`; Code review
  `CodeReviewPanel`; Walkthrough `WalkthroughTab`; Screens (`ScreensTab`) the
  before/after pairs that met the person's request. The pair viewer (`ComparisonOverlay`, web + native:
  Mirror / Diff / Slide) opens at FIT — the largest scale at which every frame
  fits its pane, upscaling up to the capture's natural size × the device pixel
  ratio within a cap (`pairViewerFit.ts`: `fitScale`, `pairFitScale`) — shows
  the effective % of the natural size, steps zoom from the current scale, and
  "Fit to screen" returns to fit; it re-fits on resize until the person zooms.
  Frames are sized from each capture's natural size, never a fixed base width. Their bytes come from `useReviewEvidence`'s `EvidenceImageLoader` (`headless/hooks/evidenceImageLoader.ts`): each id is fetched once per project and written whenever it arrives — a live re-pull of the listing in between never drops it (it once did, leaving a pair's second frame blank forever); only a change of project or a reset drops a late write, and forgets the request so it is asked again. The Tests tab states a total
  once (`testLayerLines`), and a record that kept no suites says so
  (`checkTestResults`' `unrecordedNote`) instead of listing its command as a
  one-row group.

**Code review and report as fixed sections.** A reviewer files its finding
with `reviewSections` and the report agent with `reportSections` (thefactory-tools'
`CodeReviewSections` / `ReportSections`, beside the markdown the host writes from
them). `codeReviewView` (`headless/utils/signoffCodeReview.ts`) lays a review out
as Verdict (highlighted: badge, headline, detail, severity tiles that filter the
findings and the criteria tile, "Worth a look"), Findings as one card each
(severity pill, the file as a mono chip with a file icon and its line, the symbol,
a short title, then the explanation at reading width — `codeReviewFindingPlace`,
`codeReviewFindingTitle`: the reviewer's `title`, else the first clause of an
older review's text) grouped by severity with the nits folded or by file
(`codeReviewFindingGroups`), Acceptance criteria one row each (mark, criterion,
status; "How it was shown" and where, as code, open under the row), Evidence as
one card — what it shows, then what it leaves unproven as a list, a "Nothing
left unproven" chip when the reviewer said none (a filed `''`), or a dashed chip
when an older review never said (`CodeReviewView.unproven`) — every
section collapsible under one header layout (`SignoffSection`). Its badge reads
the run's ledger verdict first (`codeReviewVerdictOf`; `OverallSignoff.codeReview`
for the story's, the step's `entry.review` in the pipeline) — a restart strips a
filing's own verdict — then the filing's, and the headline's opening word only
when neither has one. Every text field of a review or report renders through
`Markdown` (`inline` for one-line fields); a `where` that is one backticked span
or a bare token shows as code (`codeReviewWhere`), and folded summaries drop
markdown marks (`plainMarkdownLine`).
`signoffReportView` (`signoffReport.ts`) makes the report an overview, not a
second review: four tiles (Asked / Delivered / Time / Cost, from the sign-off
itself — Delivered is how many of the asked acceptance lines the review found
met, `acceptanceDeliveredLine`) over Outcome, How it was proven, Decisions made
and Needs you (`reportSectionsOf` drops a line that only restates the run's pending merge or sign-off — tools' `processNeedsYouDecisions`). Time and Cost read `StorySignoff.work` (`signoffWorkOf` in
`signoffWork.ts`, from the totals of exactly the runs the head chips add up —
each feature's latest run, each fix pass, the story run's own steps): Time says
"1h 20m of work" over a bar split into agents thinking, agents' tools, system
and checks (a `check` step's time is all checks), with "+ 17h 43m waiting for
you" — every park those runs sat in — beside it, never in it; it opens a row per
step (same-named steps added up) on the whole sign-off's scale
(`signoffTimeView`). Cost says what was billed, the billing kind and list price,
the agent runs, and the models as read-only `RunModelChip`s (`SignoffWork.models`, per role `SignoffWorkRole.models` — each attempt on the model it was launched on, named by its spend), never raw ids; it opens the list price per agent role, or a
single agent run's model and token split (`signoffCostView`, reusing
`costDetailsView`). `ReportTiles` (web + native) draws them; a sign-off without
process totals falls back to the head's time and cost labels. How it was proven is built from the run's final state
(`signoffProofRows`: the checks, the tests' count, the code review's verdict,
Verify's outcome, the walkthrough — one line each, linked to the tab that holds
it), never from the report agent's account of the attempts. A review or
report filed before the sections existed is read from its markdown by the tools'
`parseCodeReviewSections` / `parseReportSections`; only one that cannot be read
falls back to plain markdown.

**Instant re-entry.** What the Processes tab and a sign-off last read outlives
the view: `headless/hooks/processViewCache.ts` holds bounded LRU caches
(`BoundedCache`) of process-run lists by scope, single runs by id (falling back to
the row a list holds), each story sign-off's sources, evidence listings with their
note text, and project check scans. `useProcessRuns`, `useProcessRun`,
`useStorySignoff`, `useReviewEvidence` and `useProjectChecks` start from it —
loaded — and re-read behind it; only a list read whole is cached. The sign-off
joins CLI runs from `listCliAgentRunSummaries` (`GET /cli-runs/summaries`: no
transcripts, prompts or artifact contents — 385 MB → well under 1 MB for one
story); a `process:run-update` carries the whole record, so the sign-off puts a
pushed run of its story in place (`applyStorySignoffRunUpdate`) and re-reads
only the CLI summaries on a CLI run's state change. An evidence listing is one
per query for the whole app (`LiveResourceStore` in `useReviewEvidence`): the
sign-off, a step's preview and its side panel share one read and one live
subscription (a chat of another project is passed over,
`isChatUpdateForProject`), with every note's text read in one
`POST /projects/{id}/review-evidence/texts`; images and note texts read once
are shared by every panel (`EvidenceContentCache`). While its sources are on
their way the sign-off draws its frame — the story's features and what is still
being read (`signoffLoadingLabel`) — and reads what approving offers alongside
them (`useProcessIntegrationOptions`, kept in `integrationOptionsCache`).

The sign-off reads each feature's LATEST run only — its run under the story run
being signed off, else its newest run — so a relaunched story is judged on
where it stands now (`buildStorySignoff`, `signoffEvidence` in
`headless/utils/storySignoff.ts`). Attempts are numbered within that run, a
feature's time and cost are that run's own, the head adds those to the story
run's own steps, and only the latest report and that run's filings show.
Earlier runs, their attempts and reports stay in the pipeline for whoever drills
in. The Overall section is always there for a story run, even when it filed
nothing story-wide: it holds the story-wide checks ("Not checked" when none
ran, never "All green"), how the story run's capture steps ended (a skipped
walkthrough's reason is read from its ledger entry), and only that run's own
story-wide filings. No verdict is drawn until the runs, the story and the evidence
have all loaded (`signoffLoadStatus`) — only the frame: computed without the runs there is no
scope, so every earlier run's filings would show under a verdict that then
flips. The verdict badge carries the tally (`Proven · 2/2`); the verdict's line
shows only when the outcome is not a clean all-proven one, and a reviewer's
approval of a pass the section header already shows is left out of the
sign-off (it stays on the attempt's own view).

Reports are routed by the `approach` they were filed under (`reportAuthor` in
`headless/utils/reviewEvidenceView.ts`; the approaches are the tools'
`CODE_REVIEW_APPROACH`, `FINAL_REPORT_APPROACH`, `FEATURE_REPORT_APPROACH`,
`DEVELOPER_CHECKS_APPROACH`). The
story's final report leads the Overall's Report tab, which the Overall opens on;
a feature's report leads that feature's Report tab, the verifier's newest after
it. A code review has its own Code review tab (Overall, or a feature when it was
reviewed on its own), and its verdict is the `diff` method's state — the "Code
review" chip — falling back to `CliRun.diffReview` for a run with no code
review report: the reviewer agent's record, or the user's read. The user reads
a change as on GitHub — the Changes tab's "Viewed" mark per file (`setFileViewed`
→ `POST /cli-runs/:runId/viewed-files`, `viewedFilesProgress`), each at the
run's head commit, and the change is read only once every changed file is;
opening or loading the diff records nothing. The Overall's notes say how the story run's walkthrough,
code review and report steps ended, a finished code review by its verdict. None
of these reports is ever the verifier's: `reviewerVerdict`, `latestReport` and
`verifyAttemptEvidence` read only the verifier's filings (`isVerifierFiling`),
and a run's own Report tab (`runReports`) never shows a code review or the
final report. The sections are bucketed once, headlessly (`signoffSections`,
`signoffSectionProps` in `storySignoff.ts`), for both clients.

An item the running backend cannot vouch for (`ReviewEvidenceRef.unvouchedReason`)
is shown and counted as ordinary filed evidence. Seals are per backend process,
so after any restart every earlier item carries a reason — noise to a person
reading a sign-off. The protection lives where it matters: the backend's verify
gate refuses unsealed captures for new decisions, and decisions already made are
read from the process run ledger. No surface names the reason: captures, pairs,
recordings and reports render as they would without it, pairs the gate counted
render as counted, and such filings count toward their check chip
(`checkMethodRows`) like any other. One rule stays, silently: a filing that lost
its verdict and is at least as new keeps an older verdict from being read as the
conclusion (`reviewerVerdict`, `codeReviewVerdict` read `none`).

A reviewer's non-approval carries what it is about (`ReviewEvidenceRef.verdictCause`,
kept on `VerifyReviewerVerdict.cause`): one filed `proof-impossible` — the proof asked
for cannot be produced, so the backend parks the step for the person instead of sending
it back to the developer — reads "Reviewer · Could not be proven here"
(`REVIEWER_PROOF_IMPOSSIBLE_LABEL`), never "Changes requested".

**What the project can check, before anything ran.** `checkMethodRows` takes the
project's checks scan (`projectChecks`, the tools' `ProjectChecksListing`: the
story sign-off loads it with `useProjectChecks(projectId)` → `listProjectChecks`,
`CliRunArtifactPanel` reads it off the verification plan). Known, it decides a
command method's absence: detected and not run is `unchecked` carrying
`available.commands` — the chip draws ○ ("available", `checkChipFace`), never
the unknown `?`, and its callout names the command — not detected is
`unconfigured` ("This project has no lint."), and a kind the scan hides (a type
check Kotlin's or Swift's build already does) is no chip at all unless something
ran it. The scan is the backend's stored record (`ProjectChecksListing`), so it
carries `lastRuns`; an available chip's detail ends with how that kind last ran in
the project, on any branch — "Last passed 3 minutes ago in 2m 10s."
(`projectCheckLastRunSentence`, against the `now` the caller passes; both
`CliRunArtifactPanel`s and `useStorySignoff` pass `Date.now()`). An available check that never ran still demotes a verdict to partly,
exactly as an unchecked one does. Without a scan nothing changes. A check that
names its `category` — every project check does — is filed by it before any
heuristic (`checkMethodFor`). The sign-off waits for the scan
(`signoffLoadStatus`'s `checks`) but never fails for want of one.

**The checks step reaches the chips.** Each feature and fix-pass section reads
its chosen run's `verification` with its own process run's newest finished
`check` entry read over it (`latestProcessChecks`, `withProcessChecks`): per
method, a checks step that finished after the record was stamped replaces the
record's results — it ran against the landed head — while an older one only
fills the methods the record lacks; the Overall merges those per-feature
results as it always merged the records. So a Kotlin story's chips read Build ✓
/ Tests ✓ from its checks step even when no run stamped a record.

**Advisory checks flag; they never fail.** A method whose only failing results
are advisory (`optional: true` — lint and format, as the project checks scan and
the checks step mark them) is `flagged`, not `failed` (`checkMethodRows`): its
chip draws an amber `!` in the warning tone (`--status-working-soft-*` on web,
`status.working` on native), reads "flagged (advisory)" to a screen reader
(`checkChipFace`), its line says "Lint flagged issues — advisory, does not
block", and `checkCallout` says it does not block sign-off. One blocking failure
beside it keeps the method `failed`. `signoffVerdict` reads a flagged method as
passed and names it in the detail ("… Lint flagged issues (advisory)."); the
Overall's status and story-wide verdict treat it the same way, so the checks
step passing and the sign-off agree. `ProcessCheckList` flags the advisory
command the same way — `!`, "flagged", amber (`processCheckRows`). A failure
from any method that is NOT advisory — an optional UI-test method included —
still fails the verdict.

**What the developer ran.** Each feature and fix-pass section says what its
developer ran before handing over, from the runs the host recorded as they ran
(`kind: 'log'` evidence filed under `DEVELOPER_CHECKS_APPROACH`):
"Developer verified: Build ✓ (covisionTestDebug), Lint ✗" (the tools'
`developerChecksLine`), or "Developer ran no checks" for a section a developer,
fixer or developer-verifier ran (`developerChecksNote`, rendered by
`FeatureReviewSection` web + native). The developer's own account — its
`developer-checks` report — is its own `reportAuthor`: it shows in the section's
Report tab after the verifier's newest, is never read as the verifier's, and
never counts as the Report chip's proof.

A read-only record — the story sign-off, a report-only panel — passes no action
host to `CheckChipRow` or `ChecksTab`, so its chips and check blocks offer only
the proof (`checkActionOffer`), never a button that does nothing.

#### Turn limits, retries and settling an ended run

- **`TurnLimitField`** (`web|native/compound/TurnLimitField.tsx`) is the one "limit turns" switch and slider: the chat settings use it, and so do the launch docks (`ApprovalPanel`'s "How it runs", `GroupWorkLaunchPanel` — their `turnLimit` rides on the decision metadata, starting from `processGrantTurnLimitView`: what the agent asked, else the transport's default) and the run head's `RunTurnLimitChip` (the run's limit, edited while it runs through `useProcessRun().setTurnLimit`). The words — and what the limit means on an API model vs a CLI — come from `processLaunchTurnLimitView` / `processRunTurnLimitView` (headless).
- **A park's retry** shows `RetryChoiceOptions` above the buttons when its choice carries `retry` (carry on / start fresh, the default picked, why) or `turnLimit` (the raise, prefilled with the suggested number); `ParkBlock` sends the pick as `resume(..., retry)` (`ProcessRetryPick`).
- **A step going in circles** (showcase scene `going-in-circles`). thefactory-tools flags an agent attempt that ran out of turns, or nearly, and made no progress (`park.circling`, `entry.circling`; its `docs/AGENT_MANAGER_DESIGN.md` §21). `processCirclingView` ([processCirclingView.ts](../src/headless/utils/processCirclingView.ts)) reads a flag into its name, a sentence of how it ran out (tools' `processCirclingReasons`) and its evidence (tools' `processCirclingEvidenceLines`); `processParkCirclingView` reads it off the stop, its mirror on a parent included, and `processStepCirclingView` off a step's newest attempt or that mirror. `ParkBlock` (web + native) shows `CirclingNotice` under the stop's words — the "what a retry needs" line only once the manager's own retry went round too, since the retry's detail already says it — and `PipelineNode` puts `CirclingChip` on the step's row. The retry there reads "Try again with a change" with `changeRequired` and no raise: `circlingRetryTakesNote` opens `ParkNoteComposer` with `PROCESS_CIRCLING_NOTE_COPY`, required, and the note is sent with the retry; a retry the backend still refuses shows its message in the pipeline's error line. The run's card in a chat says `PROCESS_CIRCLING_CARD_LINE` (`processRunCardView`, read live), the manager's brief card leads with the notice (`managerBriefView` → `circling`), and an escalation with `why: 'circling'` reads "It keeps going in circles" (tools' `processManagerEscalationLabel`). The same on every model and transport.
- **"Settle its features"** — `RunClosurePanel` under any top-level story run that ended and was not settled (`processRunClosable`; failed, stopped, rejected, or approved but not landed — and a landed one whose features the story still has not done), `useProcessRunClosure`: the candidates from `GET /process-runs/:runId/closure` (empty — no panel — once every feature it worked is done), the person's picks, `POST …/closure`, rendered with the shared `FeatureClosureList`.
- **"Finish as already landed"** — an approved run whose work did not land but whose base already holds it (runs that ended before landing knew "already landed", e.g. one refused for "holds only test seams"). `useProcessRunAlreadyLanded` reads `GET /process-runs/:runId/landing-check` only for a run that offers it (`processRunAlreadyLandedOffered`) and builds `processAlreadyLandedOffer`: the "Nothing to merge — this work was already on <base> (since <commit>)." line, the commit (`CommitChip`), each feature it worked as a `DependencyBullet` (web) / `DependencyRef` (native) with whether it becomes done, and what finishing does. `IntegrationResult` (web + native) shows it above "Try again" (which turns ghost) with the primary **Finish as already landed** → `POST …/settle-already-landed` (`decidedVia`). Its agent card (`settleRunAlreadyLanded`, kind `already-landed`) shows the same line and the features that become done.
- **What users see, judged per change** (showcase scenes `step-ui-impact`, `signoff-screens-decision`, `capture-unservable`, in `playground/scenes/uiImpact.tsx`). Whether a change alters what users see is judged for the change, never from the project having an app: the developer, fixer and verifier report it (`reportUiImpact`), the attempt keeps it (`ProcessLedgerEntry.uiImpact`, who judged it), and the code review may file its own view (`ProcessReviewVerdict.uiImpact`), which stands over it. `headless/utils/uiImpactView.ts` reads them: `attemptUiImpactNote` ("Shows on screen" / "Nothing on screen", "Judged by the developer", why), `reviewUiImpactNote` ("Code review disagrees: …" when the newest judgement before it said the other way, else "Code review: …"), `screensDecisionNote` (the sign-off's "Screens needed" / "No screens needed" over the server's `ProcessRun.changeScreensDecision` — its reason names the files users see a not-visible judgement left unshown, all of them in `disputedUiPaths`) and `screensDecisionUiImpact` (a decision a judgement or the code review made, which the sign-off's `requestChangesProofPreset` follows beside `changeUiPaths`). The step panel (web `StepSidePanel`, native `StepScreen`) shows `UiImpactNote` above an attempt's output; `StorySignoffReview` (web + native) shows `ScreensDecisionNote` above the evidence. A capture approach whose page the browser tools cannot serve reads `unservable` in the approach menu: its chip is not set up, its callout leads with `CHECK_UNSERVABLE_LEAD` and the serve reason (`CheckMethodRow.unservable`), with no install hint, and the capability draft says "cannot be served — …".
- **Ways out of a stuck stop** (showcase scene `park-closing`). At a stop of a top-level run whose base already holds its work, `ProcessPipeline` reads `useProcessRunAlreadyLanded(run, 'stop')` (asked only where `processRunParkAlreadyLandedOffered`, `processAlreadyLandedAsked`) and hands `ParkBlock` an `alreadyMerged` action: the same `AlreadyMergedOffer` (web + native, shared with `IntegrationResult`) under the stop's choices. "Close without merging" (`close-unmerged`) never acts on a click: `ParkBlock` (and its `WaitingCard`) open `CloseUnmergedConfirm` (`PROCESS_CLOSE_UNMERGED_CONFIRM_COPY`) and only its confirm resumes the run; a closed run's ending reads "Closed without merging at <step>." (`processRunPersonEnding`) with Resume. "Have an agent resolve it", "Run the checks again" (leading once retries changed nothing, "Try again" then saying why) and "Accept and run the checks" come from thefactory-tools `processRunParkChoices` as they are.
- **Already on the base at the sign-off** — `StorySignoffReview` (web + native) reads `useProcessIntegrationOptions` up front for a work branch with git; when `options.alreadyOnBase` is set, `processAlreadyOnBaseSignOff` gives the notice above the buttons, the label **Approve — already on <base>** and the decision it sends (the first way offered — nothing is merged, so `IntegrationChooser` is skipped). A group leg's sign-off is the same component, so it says the same. An agent's `decideRunGate` card carries `landing.alreadyOnBase`: `runProposalLandingForm` is then undefined (nothing to choose) and `runProposalLandingLine` reads "Nothing to merge — …". The run's integration record `already-landed` reads "Nothing to merge — this work was already on <base> (since <commit>)." in `processIntegrationView` (shadow: "Nothing to bring in — the project folder already had this work").
- **Agent cards** for `answerRunPark`, `proposeStepRerun`, `setRunTurnLimit` and `closeRunFeatures` read what the person can change from the host's detail (`runProposalEdit`) and render it with the same controls in `RunProposalEditPanel`; the picks go back as the tool's own arguments (`runProposalEditArgs`), and `runProposalEditProblem` holds the approval while they cannot be carried out. A `change-proof` answer's card lets the person toggle the kinds and saving to the feature (`proofChange`, judged by `proofChangeView`).
- **Changing what proves the work at a stop.** Any stop that offers `change-proof` (the tools' `processProofChangeOffer` on `ProcessParkChoice.proofChange` — a feature run's or a story fix's, a failed step or an agent blocked after a proving step, wherever proof the work needs is unmet or unjudged — whether or not the run can produce it; read with the run's `proofUnavailable` the server attaches) opens `ProofChangeComposer` (web + native) in place of the choice row from its "Change what proves it" button — on the park's choices and on a waiting agent's `WaitingCard` alike: every kind as a switch with how it stood (`proofChangeView` in `headless/utils/processProofChangeView.ts`), the ones the run cannot produce held off unless the work already needed them, "Save to the feature" only on a feature's run (`canSave`; the line under the heading says "For this run only" otherwise), and why; it starts from what proves it now less what stopped it (`proofChangeDraftStart`) and sends through `useProcessRun().changeProof` (`resumeProcessRun` with `proofPlan` + `saveProofPlan`). The same reading holds off, with why, every kind a person cannot choose: a request for changes' switches (`requestProofChoices`, `RequestProofSwitches` in web's `ParkNoteComposer`, native inline) and its preset (`StorySignoffReview`'s `proofUnavailable` into `requestChangesProofPreset`, with the run's `changeUiPaths` — the server's reading of what the story's change shows on screen — so a feature's words never pre-tick screens of a change that shows nothing). Screens only words asked for, of a change that shows nothing on screen, are marked met "Not needed — the change shows nothing on screen" (`ProofPlanMarks`, from the tools' marks). Showcase: `playground/scenes/proofChange.tsx` (`proof-change-stop` — offered with screens greyed and with nothing greyed, `proof-screens-not-needed`, `request-changes-proof`, `launch-proof-dropped`).

**Warnings beside a launch and a sign-off, never blocks.** The launch card shows `LaunchOverlapNote` (web and native, beside `OpenWorkChooser` in `ApprovalPanel`) from `launchOverlapView(proposal.overlap)`: other live runs, and the base branch's new commits since the story's open run started, that touch the files the features name. The sign-off's decision card says `signoff.outsideScope` (`OutsideScopeNote` on web) — "Outside the feature’s scope: …", the files each run's newest code review was told lie outside the scope (`signoffOutsideScopeLine`, read off the judge entries' `outsideScope`). Steps the engine adds after approval — a review of a conflict's resolution, checks and a review of the manager's commits — are ordinary steps in the pipeline, and `processAmendmentView` says why they were added. Showcase: `workflowGuards.tsx` (`launch-overlap`, `signoff-outside-scope`, `added-reviews`).

### Project notes & secrets

`useProjectNotes(projectId)` + `useProjectNoteReveal` front the per-project encrypted store of standing context an agent reaches for (logins for an app under test, API keys, conventions). The list surface (`ProjectNotesSettings` / `ProjectNotesForm`, web + native) **never renders a stored value** — `GET …/notes` returns summaries only, and `…/notes/:id/reveal` is called solely from an explicit per-note Reveal, which masks itself again after `NOTE_REVEAL_TIMEOUT_MS`. `access: 'open'` means any agent on the project can read the value whenever it needs it; `access: 'ask'` means every read asks the user first. A note an agent saved for later runs (`author: 'agent'`) carries a "By an agent" pill in its row (`noteAuthorLabel`); a note the user creates or edits here is the user's — the backend records it so. A link to a note — `/projects/:id/notes?note=<id>` or `/groups/:id/notes?note=<id>` (`NOTE_LINK_PARAM`), which is where `resolveResourceNav` sends a note's `ReferenceChip` — opens the notes screen on it: `selectedNoteId` on `ProjectNotesSettings` / `GroupNotesSettings` / `NotesSettings` marks its row and scrolls to it (web `scrollIntoView`; native reports the row's offset through `onSelectedNoteLayout` for the host's scroll view), and `linkedNoteState` says when the note is gone (`NOTE_LINK_MISSING`). Mobile's notes screens sit in a `ScreenShell`, with Back when a link pushed them.

**Story and feature notes** are the hand-over about one piece of work, kept in the story's file (`Story.notes` / `Feature.notes`) — project notes stay for lasting, project-wide facts. `StoriesContext` adds `addStoryNote(storyId, { label, value, featureId? })`, `updateStoryNote` and `removeStoryNote` (the person is always the author). `StoryNotesSection` (web + native, `storyId`, optional `featureId`, `notes`, `compact`) lists them with who wrote each (`storyNoteAuthorLabel`), and adds, edits (an icon Save; only what changed is sent, `storyNotePatch`) and deletes behind a confirm. The form's checks and words are shared (`headless/utils/storyNotes.ts`, `storyNotesConstants.ts`: `storyNotesOf`, `storyNoteFormError` against the store's `STORY_NOTE_MAX_VALUE_CHARS`). Every client shows the story's notes in its story overview and a feature's under its edit form (`StoriesModalHost`).

A capture the project withholds — device automation is a per-project backend setting, on by default and switched off only by the project's own record; no client exposes it — reaches the sign-off as the approach status `not-allowed` (or `unavailable` carrying `withheld`, when the host also lacks its toolchain — the chip names both); `checkMethodRows` gives its chip the `allow` action — the backend's reason — instead of offering the agent a set-up it cannot do (`checkCallout` words every chip's callout on both clients).


### Search

Every project has a **Search** tab (`SHELL_TAB_DEFS` key `search`, right after Home; web/desktop `ProjectSearchView` from `web/compound/search/`, mobile the native peer in a pushed-navigation screen). One box searches the project through the person's search, `POST /projects/:projectId/files/search` (the Files-view `FileTools`, so notes are searched whole — an agent's search never sees an `'ask'` note's text). `useProjectSearch(projectId, initialQuery)` runs it once typing pauses (`PROJECT_SEARCH_DEBOUNCE_MS`, at least `PROJECT_SEARCH_MIN_QUERY_CHARS`), drops an answer that no longer matches what is typed, and keeps the last results (dimmed) while the next search is out. Pure helpers in `utils/projectSearch.ts`: `projectSearchStatus` (`idle` / `short` / `searching` / `done` / `error`), `projectSearchGroups` (a heading per kind in `PROJECT_SEARCH_GROUP_LABELS` order — Files, Stories, Features, Notes, Group notes — each with its count, in the order the search ranked them), `projectSearchRows` + `stepSearchCursor` (the keyboard's path through them), `searchRecordLink` / `searchRecordChip` (a story, feature or note shows as its `ReferenceChip`, described by the project's references, or by the title the search found it with while they cannot describe it), `fileHitLines`, `searchExcerpt`, `searchMatchSegments` (the query's words highlighted) and `projectSearchSummary`; copy in `projectSearchConstants.ts`. A file row shows its path (`PathDisplay`), where it matched and — the backend's `FileSearchHit.snippet`, only ever in the person's search — the lines that matched; it opens at the matched line. A record row opens where it lives (`onOpenResource` → `resolveResourceNav`). On web the query lives in `?q=` so Back returns to the results; arrows move through the results, Enter opens one, Escape clears the box.

**Opening a file at a line.** `fileLocationPath(projectId, path, line?)` (`utils/fileLocation.ts`) is a file's route on every client, `?line=N` naming the line; `resolveResourceNav` uses it for a `file` link. Web and desktop pass `fileLineParam(?line)` to `FilePane`'s `focusLine`, which scrolls the editor's textarea (text, markdown or HTML — `MarkdownEditor` / `HtmlEditor` take a `textareaRef`) a third of the way down to that line and selects it (`revealTextLine`, `web/utils/`, measuring wrapped text as drawn); mobile hands its editor the line's `textLineRange` as a one-off selection.

### Design

`useDesign(projectId)` (`hooks/useDesign.ts`, over the module store `hooks/designStore.ts`) fronts a project's Design: `index` (the store as kept — apps; screens and components with `variants`, `uses`, `aliases`; states; versions per state and variant, the highest number current; proposals; tidy-up plans), `isLoaded` / `loadError`, `usage` (the project's design/evidence/ui-test/mobile-test bytes plus `standing` of every project's total against the lower of 1 GiB and 1% of the disk), and the person's actions — apps, screens and states (create/update/delete); `propose` (images, project files or links; uploads base64) and `proposeDraft` (an HTML draft whose `design-cases` become one proposal per choice); `fileEntry`, `acceptProposal` (whole or the cells named), `keepProposal`, `chooseProposal` (one answer to a question, the others kept as alternatives), `sendBackProposal` (the note goes to the author's chat), `renameProposal`, `deleteProposal`; `restoreVersions`; tidy-up `decideTidyMove` / `previewTidy` / `applyTidy` / `dismissTidy` — each reloading the design (and usage) and the reference cache. Content: `fetchContent(ref, 'arraybuffer' | 'text')` with the bearer (`ref` is `{ versionId }` or `{ proposalId, entryId }`), or `contentUrl(ref, { viewToken, caseQuery })` for an `<img>`/`<iframe>` (HTML and SVG are served sandboxed — embed with `sandbox="allow-scripts"`; a draft case renders from its `caseQuery`). Kept current by `design:updated` and `storage:usage-warning`, and on socket reopen. Grids, compare rows and tidy previews come from thefactory-tools' pure `designScreenGrid` / `designCompareRows` / `designTidyPreview`; helpers in `utils/design.ts` (`findDesignScreen`, `findDesignState`, `designShownOfVersion` / `designShownOfEntry` → a `DesignShown` a viewer takes, `designViewKind`, `designContentUrl`, `storageUsageFraction`, `referenceDesignOf`). References: `useReferences` loads each project's design into its index, so `&design/<screenId>[/<stateId>]` (`&<projectId>/design/…` across projects) chips read `App › Screen › State` and the `&` dropdown offers screens and states; `resolveResourceNav` opens a `design` link at `/projects/:projectId/design?screen=<id>&state=<id>` or `?proposal=<id>`. Notification category `storage` (account-global) is for the usage warning.

The tab itself is shared: web/desktop mount `DesignView` (`web/compound/design/`) after Files (`SHELL_TAB_DEFS` key `design`), mobile its native peers. `DesignView` wires the data, the address (`?app=&tab=&screen=&state=&variant=&proposal=`), the viewer and compare, and proposing (drops, uploads, project files, links — for the selected cell, screen, or unfiled); `DesignPage` draws only what it is given (sidebar `DesignSidebar` — app, screens with waiting counts, components by group; tabs Current design · Proposals · History · Tidy up · Playground (when the web app declares one); `DesignScreenGrid` states × variants with a selected cell's approve / compare / history; `DesignCurrentOverview`; `DesignProposals` with compare rows, click-through over its links, shared-piece marks, the file form for unfiled images, a draft's cases as choices × variants, accept / keep / choose / send back; `DesignHistory`; `DesignTidy`), so the showcase renders every state (`playground/scenes/design.tsx`). Layouts use container queries, so the page fits the space it is given. View helpers in `utils/designView.ts` — `designSelection`, `designAppNav`, `designProposalGroups`, `designFirstProposal`, `designCaseMatrix`, `designHistory`, `designTidyMoveView`, `designFileTargets`, `designComponentUsers`, `designPreviewShown` / `designReferencePreview`, `designAskSummary` (an agent's `proposeDesign` / `proposeDesignDraft` / `addDesignScreen` ask, read against the design for its card — `DesignAskBox` on both platforms), `designDeleteSummary`, `designDiscussDraft` (Discuss appends `&design/…` to the project chat's draft via `updateDraftState`), `storageUsageSummary` / `storageUsageBreakdown` / `storageWarningNotification`; copy in `designViewConstants.ts`. Surfaces that only show a design (a reference chip's hover miniature, its expand viewer) use `useDesignPreview` — one shared load per project (`ensureDesign`) and one cached view token (`designViewTokenFor`, `useDesignViewToken`). `useStorageUsage` reads every project's usage for Settings. On web, images load as `blob:` URLs and PDF/video in a frame, because the desktop renderer's CSP allows images only from itself, `data:` and `blob:`. The Design tab marks itself `data-file-drop-zone` so the chat drop controller leaves its drops to it.

**Playground.** `useDesignPlayground(projectId, { open })` reads whether the project's web app declares a design playground (without starting it) and, while the Playground tab is open, serves it and asks again until its build is ready; `frameUrl(address, theme)` frames it under the project's App view with the view token. `DesignPlayground` (web; mobile its native peer over a WebView) lists the scenes the framed page posts, frames the picked one — opened once per build, every later move posted (`DESIGN_PLAYGROUND_SHOW_MESSAGE`) so it never reloads — at a desktop's width or a phone's, light or dark, beside the controls the scene declares (named presets, choices, switches) and its address (kept in the page's `?at=&theme=&device=`). **Save as a state** names the state (a preset's name suggested) and where it goes (`designPlaygroundSaveTargets`: the scene's own component or screen first); controls that are a saved state already (`designPlaygroundSavedAt`) save a new version of it. `savePlaygroundState` captures it in four variants and proposes it; every later approved sign-off captures it again.

### Backend startup loading screen

While the backend starts, every app holds its data providers behind "Loading…": web and desktop mount `BackendStartupGate` (`web/compound/shell/`) above them, mobile its own gate in `app/_layout.tsx` over its `LoadingScreen`. `ApiProvider` asks `GET /health/startup` every second (`createBackendStartupProbe`, `api/backendStartup.ts`) until the backend says `ready` — its search-index pass (it answers 503 until then; a 503 "starting" re-closes the gate) and its knowledge maps' startup pass, which runs alongside, have both settled — and exposes `backendReady` / `backendStartup`. `describeBackendStartup` turns the progress into one row per pass, drawn with the shared `TestsProgressBar`: "Indexing projects 12 / 20", "Knowledge maps 7 / 20 · building thefactory-tools 35% · 1 failed: x". A map that fails never holds the screen; when a startup the app watched ends with failed maps, the probe keeps it up `BACKEND_STARTUP_FAILURE_NOTICE_MS` (5 s) longer so they are seen. An app opened after startup goes straight through.

### Sidebar badges — the ink badge

Every nav row's trailing indicator is one `NavRowIndicator` (`headless/utils/navIndicator.ts`): `ink` (what waits and what runs), `paused`, `dot` (news to read, nothing else) or `none`, each with a `title` in words — the row's native tooltip on web (`navRowTitle(label, indicator)`) and its accessibility label on mobile. A project or group row (`scopeRowIndicator`) adds up ONE total of everything waiting on the person — merges that failed (`failed`, always red, `ProcessTally.failed`), runs that need them, chats with an ask (`chat_messages.waiting`), git changes — and moves while a run works (processes channel) or an agent replies (chat channel); unread replies and new results alone are a blue dot; failing tests stay on the Tests tab. A folded group sums its members and its own chats, an open one shows its own chats. Tabs (`shellTabIndicator`, `groupTabIndicator`) keep their one channel with the number shown together with what runs; a failed merge turns the Processes count red. An expired CLI sign-in is the other thing that broke (`NavRowSignals.broke`, said first in the title — "Claude sign-in expired"): each one is one more red in a row's total, and on a tab the whole count turns red. Its scope is the live agent work that signs in with it (`headless/utils/signInExpiry.ts`): a login's status is global (`CliConfigsContext.caches[].authStatus`, refreshed on `cli:auth-status-changed`), so `expiredSignInsByScope` (through `useExpiredSignIns` in each app's `useBadgeCounts`) puts it on a project whose chats have an agent replying or an ask waiting, or whose current root runs (pending, running, parked) sign in with it — the login being the one the host would pick (`cliLoginOf`: the bound one while it is that CLI's, else the CLI's active login, else its first; a host-path login is never known). Its chats turn the Chat tab red, its runs the Processes tab, a group's own chats its Chat tab and row, and the Assistant's live conversations its nav item (`assistantExpiredSignIns`). A chat waiting on an open sign-in card (a `cli-login` credential capture that signs a stored login in again — `useSignInCardsByChat`, one shared read of `GET /credential-captures` with no chat, refreshed on `credentialCapture:updated`, through `signInCardsByChat`) counts for that login even with no agent replying; each login is named once per scope, so a chat's card and the work on it make one red, not two. Only a login checked and found signed out counts. Whatever uses it, the Settings nav item shows every such stored login (`storedSignInsExpired` → `settingsNavIndicator`, red one per login, titled "Claude and Codex sign-ins expired"; a host-path login is never stored, so never counted), and opens Settings on its LLMs section — where the model chip's re-auth link goes — while one has expired.

`inkBadgeLayout(state, look)` (`headless/utils/inkBadge.ts`) lays a badge out in the person's look — `userPreferences.badgeMode` (`total` / `stacked` / `top` / `dots`, rows only), `badgeStyle` (`splatter` / `watercolour` / `ring` / `stripes` / `pie`, mixed one-total only) and `badgeMotion` (`orbit` / `splash` / `float` / `comet` / `pulse` / `spinner`); defaults total, splatter, orbit. Shares put what broke first at no less than two fifths. Colours come from `notifications.badgeColors` through `inkChannelColors` (processes green, chat blue, git orange, app activity purple; red is kept for what broke). The web `InkBadge` (`web/compound/shell/`, CSS from `inkBadgeStyle.ts`, keyframes `tf-ink-*` in `badges.css`) and the native `InkBadge` (SVG fills, Animated droplets sampled by `inkDropFrames`) draw the same layout; with reduced motion on, moving droplets fade in place. Settings › Visual › Badges is `BadgeSettings` on both (live option cards, channel colours with a link to Notifications, "Back to the default", a preview of every row state from `BADGE_PREVIEW_ROWS`).

### Notification levels and the agents' own exchange

How much of a chat reaches the person is its level (`ChatNotifyLevel`: `everything` / `needs-me` / `nothing`): the chat's own (`Chat.notifyLevel`, set from its settings menu through `useChatNotifyLevel` + `ChatNotifyLevelPicker`, stored by `POST /chats/notify-level` — a UI preference, no agent tool) or else the person's level for its kind (`notifications.chatNotifyLevels` — run chats and incoming requests `needs-me`, story/feature, project and group chats `everything`; the assistant's chats `everything`), chosen in Settings › Notifications › Notify me (`ChatNotifySettings`). "Needs me" is an ask (question, approval) or a message that needs the person — the manager's escalation, a pre-read leaving items (`isNeedsYouMessage`, `ChatSummary.needsYouTimes`); a stopped run counts through its Processes channel. One chokepoint, `chatNotifyNews(chatNotifyCountsOf(chat, seenAt, asks), level)`, feeds every count: the apps' badge tallies, `computeChatRowStatus` (row badge, unread dot, `needsYou`, `muted` — a muted row shows the bell-off and no number), the run chat's dot on the pipeline, and OS notifications (`useChatNewsNotifier`: news at the chat's level, and asks coming to wait).

The agents' own exchange — a process agent's hand-off and the turn that answers it, and the host's handled cards (`isAgentExchangeMessage`) — is never unread, and is drawn as `notifications.agentMessages` says: `collapsed` (default) folds each run of it into one block at its first message (`agentExchangeLayout` → `AgentExchangeBlock`): the manager's brief card (`managerCard.kind === 'brief'`, with the line where the run stopped) or one grey "Handled" line for any other hand-off, then the outcome and escalation cards the host wrote of it; `full` draws every message, card messages as cards; `hidden` draws none of it but the cards that need the person. A last exchange still under way, or with asks waiting, is always drawn in full.

### Who has a run's stop, and the channel a chat counts on

**The stop holder.** One pure answer, thefactory-tools `processRunStopHolder(root, now)`, says who has the stop a top-level run waits at: `manager` while its agent manager looks at it (a live turn, or its `claim` on the park before the turn starts) or holds it; `person` once the manager hands it on (`escalated`), waits on a card only the person can answer (`waiting`), filed its sign-off pre-read, is off, never engaged, or its turn or claim went stale. Every surface reads it, so none can disagree: `processRunBadge` ("Manager on it" in `PROCESS_LIVE_TONE` — the chip, the run header, the chat card through `processRunCardView`, the chat list and header pills, run references), `processRunAttentionSection` (the run sits under Running, its line `processRunManagerLine`: "Manager: looking at “…”" / "Manager: holding until … is brought in"), `processRunWaitingCount` and `processTallyByProject` (counted running, never waiting — no Processes count, no share of a project or group total), `processStatusOverlay` (the story chip reads Working), `processStepRowView` / `processStageChips` (the stopped step reads "Manager on it", drawn as work going on) and the park box on the pipeline (`ParkBlock` / `WaitingCard` say the manager's line in the live tone; a mirrored park keeps a quiet "Open the nested run →"). A nested run's page, at any depth, reads its top-level run's record (thefactory-tools `processRunStopHolderOf`). A group run's leg whose stop the manager has reads "Manager on it" (`manager-on-it` leg status, `PROCESS_GROUP_LEG_STATUS_VIEW`) and never makes the group badge "Needs you". Surfaces read it against `useProcessStopClock()` (30 s), so a stale claim or turn hands the stop back without waiting for news. Runs raise no OS notifications: what waits on the person shows on the badges only, and `useChatNewsNotifier` never tells a process run's chats.

**The channel a chat counts on.** `chatChannelOf(context)` (`headless/utils/chatChannel.ts`): a chat that belongs to a process run — the run's own chat (`run-<id>` topic; nested runs share it) or a step agent's chat — counts on Processes, every other on Chat. `chatBadgeInputOf` gives such a chat nothing toward the Chat tab, the chat share of a project or group total or chat thinking; `useProcessRunChatNews(seen)` → `processRunChatNewsByRun` reads each run's own chat at its notification level (run chats default to "When it needs me") as `{ unread, asks }` by run id, which feeds `processTallyByProject` (an ask makes the run wait on the person; an unread reply is `ProcessTally.unread` — a dot on the Processes tab and on project/group rows, "N runs have news"), the Processes list (`processRunAttentionSection` puts a run whose chat asks something under Needs you — "Answer: a card in its chat" — and `processRunListRow.fresh` draws a dot) and the run header's chat dot. The chat list shows run chats only under Runs, with no badge (`chatListRow`, `matchesChatListFilter`); a group's list draws its projects' run chats too, under "Runs in this group" (`chatListPool`, `chatListSections`). An expired sign-in a run chat's agent uses counts on the project's runs — the Processes tab — never the Chat tab (`SignInChat.channel`, filled by `useExpiredSignIns` from the chat's key). `chatNewsSince` / `chatAsksNewsSince` never tell a process run's chats, so `useChatNewsNotifier` raises no OS notification for them: runs show on the badges only.


### In-chat run state is read live, never from the message

A message the host writes about a run is a pointer, not a record: the card draws what the run says **now**, read by id off the live run (`useProcessRun`, kept current by `process:run-update` — every write of a run, its ancestors re-pushed, a delete included). What the message stored is shown only while the run is not read, or once it is gone. Every chat kind and client draws these through the shared compounds, on every model and transport alike.

- **Manager cards** (`ManagerCardView`, web and native) take the message's `processRunId` (the top-level run, which keeps the manager's record) and read `useManagerCardStanding(card, processRunId)`, which also reads the nested run that stopped when the card is about one:
  - *Escalation* — `managerEscalationStanding`: open while that run still waits at the park the card was raised on (`processRunWaitsAt`) and no newer card replaced it on the same park; else closed, and the card becomes history: headed by `ParkClosureLine` ("Handled — you allowed it on web · 19:20", "Handled — the run’s chat agent had it tried again", "Superseded — the run moved on / finished / stopped", "Superseded — the manager raised a newer card"), what the manager found folded behind "What the manager found", and no run chip to answer it from. Who and how come from the answer the run recorded on its ledger (`override`: choice, `decidedBy`, `decidedVia`, `chatContextId`, at) — the first at or after the park and before the park the run waits at now (`processParkClosure`, thefactory-ui `headless/utils/processParkStanding.ts`).
  - *Intervention* — `managerInterventionStanding`: the intervention as `run.manager.interventions` has it now; the pill says how it came out (Handled → Settled / Did not help / You undid it) with its result.
  - *Pre-read* — `managerPreReadStanding`: each "Needs you" item settled since says how (`runNeedsYouOutcome`, the run page's words), the count and tone follow the items still open, and once the sign-off is decided the card says how ("Decided — you approved it on mobile · …").
- **One change card** (`CliRunArtifactPanel`, web and native) holds a chat's own changes. Its head (`RunChangesHead`; words from `chatChangesHeader`) says what it is — "Changes this chat’s agent made · 1 file · on its own branch" with the branch chip — so it is never taken for a process run's sign-off (a process step's run says "Stage output"). Once the chat's open changes need the person, the same card says so (`OpenChangesNotice`; `openChangesNoticeView` from `useChatOpenChanges({ projectId, chatContextId })`, read on mount and on every `cli:run-update` state change, `git:status-changed`, `files:changed` of the project and reconnect, shown only on the card of the run holding them): "Waiting for you · 12 h" past the limit, "No longer fits your checkout — N of M files changed since" (counted live) with Rebuild on current (`POST /chat-open-changes/rebuild`, conflicting files named), and Discard (confirmed inline; `POST /chat-open-changes/discard`). The host never posts a separate card: it raises `openChangesCard` on the turn itself for the badges, and a message that only carries one (posted before) is drawn as nothing (`isOpenChangesCardOnlyMessage`). A turn kept apart from the open review shows `heldChatChangesNote` on its own card. A process run's own chat never has such a card for new turns: its agent only reads and proposes changes on the run. An open review whose base already has it offers to close it (`ReviewOnBaseOffer`, web + native, under the decision; `reviewOnBaseOfferView` over `useReviewOnBase({ runId, projectId })`, which reads `GET /cli-runs/:runId/resolve-review-to-base/preview` on mount and on the run's updates, the project's git changes and reconnect): "Already on dev — close it" when the base holds it or a later commit replaced it; when the base lacks some of it, a quieter "Close as already on dev…" naming the files, which asks first (nothing on disk is discarded; the review closes and its branch is removed, recorded for restore) and sends `force`. A close the server leaves open shows its reason. Copy in `REVIEW_ON_BASE_COPY`. Showcase: `chat-change-card` (`fresh`, `waiting-12h`, `no-longer-fits`, `already-on-base`, `replaced-on-base`, `close-anyway`, `close-anyway-confirm`, `close-refused`) and `run-chat-proposal` (`playground/scenes/chatChanges.tsx`).
- **A notice that a run waits on the person** carries `processRunParkedAt` (the group run's leg notice, backend `processGroupNotices.ts`): `RunParkClosure` under it says the park was answered — by whom and when — once the run no longer waits there (`useProcessParkStanding`).
- **Run and group-run chips** (`ProcessRunChip`, `ProcessGroupRunChip`) are live as before; a run that is gone says so instead of loading forever, and the chip opens the run in its **own** project (`onOpen(id, projectId)`), so every chat — project, group, global, the assistant's — gets the chip.
- **Asks** (approvals, questions, run proposals, credential forms, remedies) already follow the broker: a decision anywhere relays `cli:run-update` `actionDecided`, the pending list re-reads and the row folds to its decided note; a proposal whose run moved on is withdrawn host-side ("Settled elsewhere …"). Held agent messages follow `chats:updated`.
- **Needs-you badges** (the chat list's "Needs you" count and filter, `chatNotifyCountsOf` → `unreadNeedsYou`, a run's chat news at "When it needs me", `chatNewsSince`) count a manager escalation or pre-read only while it still needs the person: the host closes it on the message (`needsYouClosedAt`, backend `RunChatNeedsYouWatch`) the moment the run moves past it — answered on the run page, another client or chat, or by the run chat's agent — and broadcasts `chats:updated`, so `chatNeedsYouTimesOf` (the summary's `needsYouTimes`, or `chatNeedsYouTimes` over a loaded chat's messages) stops counting it on every client without the person opening the chat. Asks count from the broker (`usePendingAsksByChat`), re-read on every `cli:run-update` action event.
- **Reconnects.** `useProcessRun`, `useProcessRuns`, `useProcessGroupRun`, `useCredentialCaptures`, `usePendingAsksByChat` and the chats list (`createChatsContext`, every summary) read again on `ws.onReconnect`, so nothing missed while the socket was down stays stale. `useProcessRun` shares one request per run among every card and chip showing it.

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
| Verification   | `tsc --noEmit` + `tsup` build + `playground/` showcase                                                | The `playground/` runs Tailwind v4 against the source, with a fixed URL per component state for before/after screenshots.      |

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

## Component showcase (`playground/`)

The library has no screen of its own, so the playground is its web app: `factory.webApp` in `package.json` builds it with `playground:build` and serves it with `playground:serve`, rendering the library from `src/` (see `playground/vite.config.ts`). It is a **showcase where every component state has its own fixed URL**:

- **`/`** — the index: every scene and every state, as links.
- **`/?scene=<id>`** — one scene, all its states stacked, each under its own URL.
- **`/?scene=<id>&state=<state>`** — exactly that state, alone on the page, ready to screenshot. Animations, transitions and the caret are stilled on it.

A **scene** ([playground/showcase/types.ts](../playground/showcase/types.ts)) names a component, its group and its states; each **state** renders from fixed sample data — no network, no timers that change what is shown, no `Date.now()` or relative timestamps, no randomness — so the same URL shows the same pixels on every load of one build. A state that draws over the whole page (an open modal, a toast) is marked `overlay` and is only shown at its own URL. Scenes live in `playground/scenes/` and are listed in [playground/showcase/registry.ts](../playground/showcase/registry.ts); `playground/showcase/registry.test.tsx` checks the ids are unique kebab-case and renders every inline state twice to the same markup. Ids are part of the URL: renaming one breaks every link and every earlier capture of it.

**The rule: every visible change adds or updates its scene.** A change to what a component shows — a new component, a new state, a layout, style, icon or copy change — adds the scene or the state that shows it, in the same change. Its proof is a **before/after screenshot of that state's URL**: the before built from the base, the after from the change. A state the change adds has no before; its after alone is the proof. A component the playground cannot render without its backend gets fixed sample data passed through its props (or a grant/callback that goes nowhere), never a fetch.

**The design playground.** The showcase is also this repository's design playground (`factory.designPlayground: "/"`): a scene may declare `controls` (choices and switches), named `presets` and `play(values)`, and `/?scene=<id>&play=1&<control>=<value>` draws it set that way, stilled like a state; `&theme=dark` sets the dark tokens (`.dark`, `data-theme`, `color-scheme`). Shown by the Overseer's Design view it posts its scenes and controls to the page framing it (or the app's WebView) and shows the address it is sent without reloading. A state saved there is captured light and dark, desktop and phone, and again at every sign-off — so `play` follows the same fixed-data rule as `render`. The build uses relative asset URLs (`base: './'`), since the Overseer serves it under a path of its own. A scene that is a whole page sets `wide` to be shown at a desktop's width.

Components the package does not export (e.g. `ApprovalPanel`, `ToolAskCard`) are imported from `src/` directly; everything else comes from `thefactory-ui/web` / `thefactory-ui/headless`, aliased to `src/` for the playground's build, type check (`playground/tsconfig.json`) and tests.

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
- **Showcase** — a visible change adds or updates its scene in `playground/`, and is proven by a before/after of that state's URL (see [Component showcase](#component-showcase-playground)).

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
│       ├── screens/                    #   shared screens (ProcessesView, ProjectTimelineView, …)
│       ├── compound/                   #   CommandPalette, BranchChip, JsonView, diff, files, chips, process, projectIcons
│       ├── icons/                      #   ~155 SVG icons (action + navigation + projects + decoration sets)
│       ├── utils/cn.ts                 #   clsx + tailwind-merge
│       └── index.ts
│
├── playground/                         # component showcase — the project's web app (Vite + Tailwind v4)
│   ├── index.html · main.tsx · main.css · vite.config.ts · tsconfig.json
│   ├── showcase/                       #   scene types, registry + URL routing, index / scene / state pages
│   └── scenes/                         #   the scenes: chat surfaces, primitives
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


### Run cleanup at sign-off

`ProcessCleanupCard` (web + native, `runId`) is the sign-off's view of a run's cleanup list — what its host-run cleanup step removes once the person approves that sign-off. Any process can carry the step (every seeded one does), so `StorySignoffReview` shows the card at every sign-off: a top-level run's (its work lands after the cleanup) and a nested run's own, drilled into from its parent's pipeline (it cleans its own items and captures right after that approval). A nested run with no sign-off of its own shows the step in its pipeline as skipped, its list carried out by the story's cleanup. `useProcessCleanup(runId)` reads `GET /process-runs/:runId/cleanup`, re-reads on every `process:run-update` for the run, and records the person's choices (`setItemSelected` → `POST …/cleanup/items`, `setOff` → `POST …/cleanup/off`). Each row (`processCleanupRows`, `headless/utils/processCleanupView.ts`) says what the item is, why it stops mattering after the merge and who registered it, with a switch to keep it; a card switch turns the cleanup off for the run. The headline (`processCleanupHeadline`) counts what will go, or says it is off, empty or has no step; once the step ran, the card is read-only (`processCleanupEditable`) and each row carries what happened to it (`PROCESS_CLEANUP_OUTCOME_LABELS`), including what was removed and is no longer listed. Hidden while there is nothing to show. The step itself appears in the pipeline like any host step (`PROCESS_KIND_BLURB.cleanup`), its summary line saying what it removed.
