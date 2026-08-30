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
   variant** — same `document.write` cache-bust but _without_ `defer` — because its inline bootstrap consumes
   the bridge globals during parse, so the busted scripts must execute before it (defer would leave them
   undefined). Without one of these, a developer editing the app sees no change on reload and wrongly
   concludes the host didn't rebuild — it did; the iframe served a stale asset.

## CLI agents: runner-aware chat dispatch

A chat is **API-backed** by default and **CLI-backed** when it carries a `cliRunner` binding. The binding is persisted on the chat (`Chat.cliRunner = { tool, credentialId?, apiKeyCredentialId? }`) via `useChatCliRunner(ctx).attach/detach` → `attachChatCliRunner` / `detachChatCliRunner`.

`createChatsContext.sendMessage` forks on that binding:

- **API** (no `cliRunner`): append the user message via `addChatMessages`, then `sendCompletionWithTools` with an explicit `messages` array. The CLIENT owns the append; neither the route nor the SDK adds one.
- **CLI** (`cliRunner` set): `sendChatWithCli` with `runner: 'cli'` (the route STARTS the sandboxed run, answers `202 { runId }`, and detaches; the SDK appends the message and persists the reply back into the chat; progress streams on the `cli:run-update` WS topic). The composer does **not** pre-persist — the route owns it.

**Restarting a turn.** When a turn ends without a reply, the conversation's last message is the user's own, and `createChatsContext.restartLastTurn` re-triggers the agent on it — appending no second copy. Because the two transports append at opposite ends, the restart forks the same way, and neither fork can be replaced by simply re-issuing the send:

- **API**: the same `sendCompletionWithTools` call as a send, with `messages` read from the chat and the `addChatMessages` step skipped. No new route.
- **CLI**: `restartChatWithCli` → `AgentRunnerTools.restartChatCompletionWithToolsCli`. Re-posting to `sendChatWithCli` would duplicate the message, and `retryChatCompletionWithTools` would delete the very message being re-run. The restart also always seeds the transcript and prompts a session the CLI still holds with a directive rather than the message text, since that session was already handed it by the attempt that failed.

The affordance is `describeLastUserMessageRestart` (`headless/utils/chatMessageRestart.ts`) — the same pure-describe shape as the delete control, rendered by `MessageRow` on web and native.

Two distinct runner shapes exist and must be mapped at the dispatch boundary: the chat-persisted `ChatCliRunner { tool, credentialId }` vs the dispatch `CliRunnerDispatchOptions { cli, authCredentialId }` (`tool → cli`, `credentialId → authCredentialId`) — see `headless/utils/cliRunner.ts`.

The unified `usePendingToolGrants(ctx, runId?)` merges API `require_confirmation` tool-calls (resolved as a batch via `confirmTools`) and CLI gated `PendingAction`s (resolved individually via `decideCliAgentAction`) into one `PendingToolGrant[]`; only CLI grants expose `decide('permanent')` (→ `approved-permanent`).

**CLI grants are read per CHAT, not per run** — `listPendingCliAgentActions({ chatContextId })`. A gated tool call no longer holds its run open while it waits: the SDK raises the approval, waits ~20 s, and returns "still pending, call the same tool again", so the agent routinely finishes its turn with the prompt still waiting and retries on a LATER run. Reading approvals from one runId would make the prompt vanish the moment its run went terminal — i.e. hide exactly the thing the agent just told the user about. `runId` is still resolved (`listCliAgentRuns({ chatContextId, status: 'running' })`) and returned as `cliRunId`, but only to say which run is currently EXECUTING; **consumers gate the run view on the returned id, never on their own live state**, which a reload loses. CLI configs (auth-cache CRUD, default CLI, enabled set, login streaming, probes) live in `CliConfigsContext`/`useCliConfigs`, mirroring `LLMConfigsContext`.

### Which tools a chat's agent may use

The chat settings **Tools** section is the per-conversation tool allowlist, and it means something on both transports.

Its rows come from `useChatToolCatalog(runner)` → `GET /tools/chat-catalog`, which the backend assembles from the arrays the runtime actually registers from (`ALL_CHAT_AGENT_TOOLS` for an API chat, the `CLI_AGENT_*_MCP_TOOL_NAMES` groups for a CLI chat). They are NOT derived from the chat's own stored settings — that was the old shape, and it made a tool the chat did not already carry impossible to switch on, showed every description as an empty string, and hid every backend-injected tool. `headless/utils/chatToolToggles.ts` owns the pure half (`buildChatToolToggles` / `applyChatToolToggle` / `resetChatToolToggles` / filter + group); the three client wrappers are prop passers.

The two transports keep **separate** allowlists on `CompletionSettings`, because their tool universes differ: `availableTools` / `autoCallTools` for API, `cliAvailableTools` for CLI. Reusing `availableTools` for a CLI run would strip most of its built-ins — including tools no chat setting ever listed.

**A chat asks before it acts.** The allowlist says which tools EXIST; a second, independent axis says which of them stop for a human. `CompletionSettings.toolApprovalMode` (`'ask'` by default, and for every chat that never chose) is the **Run tools without asking** switch in the Tools section — `buildChatToolApprovalToggle` / `applyChatToolApprovalMode` in `chatToolToggles.ts`, rendered by both `ChatSettingsDropdown` peers. Off, the CLI agent stops for approval before anything that acts — a story write, `spawnAgent`, any backend-supplied tool — while reads and artifact proposals run straight through. On, it runs everything it is permitted to call. It is CLI-only because an API chat already expresses the same idea per tool via `autoCallTools`.

The switch **cannot widen the allowlist**: `applyChatToolApprovalMode` writes only the mode, and a tool outside `cliAvailableTools` is never registered on the run's MCP server, so nothing downstream can make it callable. An unattended run (`startFeatureWork`) inverts the default — it does not ask for ordinary work, only for the small host-named critical set. See `SANDBOX_AND_CLI_AGENTS.md` §5b.

**Absence means unset, never deny-everything.** A missing or empty `cliAvailableTools` leaves the run with today's full built-in set, so every chat written before the field existed is unaffected. Enforcement happens at MCP **registration** (`createCliToolNameFilter` → `registerMcpToolsFromSchemas`), not at Claude Code's advisory `--allowedTools`: `McpServer` answers `tools/list` and `tools/call` from the same registry, so an unregistered name is genuinely undispatchable, and the boundary holds for codex and cursor too (neither reads an allowlist flag). The approval family (`askUser`, the `request*` tools) and the artifact family (`proposePr`, `proposeCommitToRealRepo`) are never filterable — a run that cannot ask a human fabricates instead, and one that cannot land its work cannot deliver. The resident session-pool key includes the allowlist, or a switched-off tool would keep being served by the session that still has it.

Scope caveat worth repeating to users: this bounds the **factory** tools an agent can reach. A CLI's own Read/Write/Edit/Bash are not MCP tools; the sandbox and the review gate are what bound those.

### Watching a CLI turn while it runs

A CLI turn takes minutes. It renders through the SAME vocabulary as an API turn — `cliTranscriptToMessages` maps the run's transcript onto `assistant` + `tool` `ChatMessageLike`s and `CliRunMessages` (web + native) renders them through the standard `MessageRow` / `ToolCallCard`. So the user sees each tool NAMED as it is called (running spinner → elapsed time on completion) and the reply filling in as it streams, not a bare spinner.

Under it sits one **activity line** — `describeCliRunActivity` in `headless/utils/cliRunActivity.ts`, rendered by `ThinkingRow`. It answers "what is it doing right now" in strict priority: **blocked on you** > booting the sandbox > running `<tool>` > working, with the elapsed / approximate-output-token readout appended. Blocked outranks everything on purpose: a run parked at the broker emits nothing, so without it a waiting run and a busy run were the same spinner. A blocked line names the tool and swaps the spinner for the teal hourglass the tool cards already use for `require_confirmation`; the row for the call itself is re-typed to `require_confirmation` too (`cliTranscriptToMessages`'s `awaitingApprovalToolNames`), so the badge lands on the exact operation.

What is blocking comes from the SAME feed as the approval surface — `ChatBody` projects `usePendingToolGrants`' grants through `blockedOnFromGrants`. There is no second channel, so the line and the prompt cannot disagree. The tool's name comes from the broker action's `{ tool, args }` payload (`pendingActionToolName`), which is also what the grant is now labelled with — the action `kind` (`inspect-host-path`) groups permanent grants and does not identify the call.

**Three things keep the live view from going blank**, all in `useCliRunArtifact`:

- The run record is **never allowed to shrink** the transcript (`mergeCliRunTranscript`). Mid-run, the resident runner has not persisted its transcript yet, so `getCliAgentRun` answers with an empty one — taking it verbatim erased everything the user had watched.
- A **remount rehydrates** from `cliRunTranscripts`, a bounded in-memory per-run cache. The live trailing block hands over to the persisted inline row the moment the run's placeholder message lands, and navigating away tears the view down; neither can be recovered from the record.
- The not-ready retry (a just-started run whose record is not on disk) resets **only on a change of run**, never on a refetch. Resetting per retry both wiped the streamed entries and made the retry cap unreachable, so it polled forever.

Live entries are buffered and committed on one `CLI_TRANSCRIPT_FLUSH_MS` tick rather than per entry, and `applyChatLiveStatePatch` keeps the chats-context live-state map identity when a patch changes nothing — a streaming turn re-asserts the same `cliRunId` hundreds of times, and each one used to re-render every chat surface in the app.

`ChatBody.activeCliRunId` is the reload fallback: `liveState.cliRunId` only knows about a send this session made, so hosts pass the run `usePendingToolGrants` resolved from the backend. Clients wire that one prop; everything else is in the package.

**Known gap:** `ResidentCliSessionManager` (thefactory-tools) writes its transcript to the run record only at the terminal write — the per-turn runners flush as they stream (`createTranscriptFlusher`). Until it does the same, a genuine page RELOAD mid-run shows the run's activity from the reload onward, not the steps that preceded it.

### Diagnosing what a chat renders

The chat header carries a **Debug** button (`ChatHeader.onOpenDebug`, next to the dynamic-context one, hidden unless the host wires it) that opens `ChatDebugModal` — one copyable JSON document answering "why does this chat look like this". `useChatDebugDump(ctx, isOpen)` gathers it: the chat record from `useChats`, every CLI run for `getChatContextKey(ctx)` from `listCliAgentRuns`, and the `cliShowThinking` preference the chat actually renders under. `buildChatDebugDump` (`headless/utils/chatDebugDump.ts`, pure) assembles four sections — a header (context key, the attached `cliRunner`, counts, the caps), the stored messages, and per run the **raw `transcript` entries verbatim** beside the `normalizeCliTranscript` steps and `cliTranscriptToMessages` messages those same entries produce.

Raw and interpreted sit side by side on purpose: a rendering bug is almost always a disagreement between what the CLI emitted and how the normalizer read it, and summarising the payloads away destroys the evidence. So payloads are **never rewritten** — they are embedded by reference. Bounding happens two ways instead: individual texts and serialized values are cut to `CHAT_DEBUG_TEXT_PREFIX_CHARS` (keeping their true `length`), and three shared character budgets (stored messages / raw transcript / interpreted views) admit each section whole or not at all, counting what did not fit rather than dropping it silently. Nothing is redacted for content — tool arguments and results are exactly what the agent saw.

The snapshot is deliberately not live: it is gathered when the modal opens and re-gathered only on Reload, so what the user copies is what they were looking at.

### Deleting a turn

`deleteLastChatMessage` is the only delete the backend offers, so the control is **last-message-only** on every runner. A CLI turn is ONE stored assistant message — the placeholder carrying `cliRunId` — plus rows derived from the run record: the tool calls and interim replies `CliRunMessages` renders have no chat message behind them and nothing to delete. So the control sits on the turn's block rather than on a derived row, and its label admits what it does (`Delete this agent turn — its whole run goes with it`). Deleting it takes the turn's whole visible detail with it and leaves the user's message deletable next, exactly as in an API chat. Without this the affordance rendered nowhere in a CLI chat: `MessageList` swaps `MessageRow` for `CliRunMessages` on any message with a `cliRunId`, so the agent's turn had no control — and since that turn is always the last message, neither did the user's.

`describeLastMessageDelete` + `refuseWhileRunActive` (`headless/utils/chatMessageDelete.ts`) own the rules. Deletion is **refused while the turn is in flight**, matching the API path (whose control is already disabled while a completion streams): the composer's Stop is how a run is ended, and removing the message a live runner is about to write back into would race it. The refusal reads from two independent sources — the list's session state (`isSending` / a pending bubble) and, inside `CliRunMessages`, the RUN RECORD's own status, so a turn started before a reload still refuses. `pendingCliRunId` is deliberately NOT one of them: it stays set after a run terminates so the run view keeps its mounted instance, and gating on it would make every finished turn permanently undeletable. The delete also clears the chat's live `cliRunId`, or the trailing live block would remount the very turn just deleted.

Should a run outlive its message anyway, `finalizeRunMessage` (thefactory-tools) writes nothing instead of re-appending: a missing placeholder means the user removed the turn (or cleared the chat), and resurrecting it there is precisely what they asked not to happen.

### Mid-run questions (`askUser`)

A sandboxed agent can park its run and ask the human a question. Mechanically it is the same broker round-trip — a `PendingAction` with `kind: 'question'` — but it is **answered with text, not approved**: the answer rides back as `decideCliAgentAction`'s `metadata: { answer }`. `headless/utils/agentQuestions.ts` owns the split (`isQuestionAction`, `parseQuestionPayload`, `answerDecision`, `declineDecision`, `partitionGrants`), the grant gains `question` + `answer(text)`, and `ChatBody` renders those grants inline as an `AgentQuestionCard` (web + native peers, same props) while `ToolConfirmationModal` filters them out — a question must never surface as an Allow/Deny prompt. Declining decides the action `denied` with an answer telling the agent to proceed on its own judgement. A malformed payload falls back to a generic prompt plus the raw payload rather than crashing. No client uses `window.prompt`.

### In-chat credential capture

An agent that needs credentials never asks for them in the conversation — the secret must not enter the transcript. It opens a **capture** (`credentialCaptureTools`, in process), the backend broadcasts the record on `credentialCapture:updated` (both on open, so the form appears, and on every resolution), and the chat renders a form for it. The user's fields go **from that form straight to `POST …/credential-captures/:id/submit`**, which stores them the same way the Settings flow does. The agent only ever learns that the capture resolved and which credential (`credentialId` / `credentialName`) it produced.

**`requestGitCredentials` blocks.** The tool call does not return when the form opens — it awaits `CredentialCaptureStore.waitFor(id, ttl)` and resolves on submit / cancel / expiry, so the agent's turn is parked on the human and continues by itself the moment they answer. Returning `awaiting-user` instantly is what made the flow read as "a form is open somewhere, goodbye": the turn ended and the submit had nothing to wake. The window is one hour, matching `askUser` — the user is being sent to another site to mint a PAT.

`useCredentialCaptures(ctx)` tracks the captures for one chat — rehydrated on mount from `listCredentialCaptures({ chatContextKey })`, then kept live over the websocket — and exposes `submit(id, fields)` / `cancel(id)` / `refresh(id)`. The mount fetch is what makes a reload survivable: a capture outlives the page, so without it a refresh would hide a form the agent is still waiting on. The listing serves **only still-requested** captures, so a reload cannot re-pin a form the user already answered. A refused submit or cancel re-reads the record before rethrowing, because the store ages an unfilled capture out to `expired` **on read**, not on a timer.

Every client feeds this into `ChatBody` next to `grants` — `credentialCaptures` + `onSubmitCredentialCapture` + `onCancelCredentialCapture`. The card is gated on both resolutions being wired, so a client that passes none of the three renders no form at all and the agent waits on a capture the user can never see.

The pure half lives in `headless/utils/credentialCaptures.ts`: the WS-payload guard, the awaiting/chat predicates, the feed upsert, form validation, the status → display mapping, and `bindCapturesToToolCalls`. **`captureSubmitBody` is the only function anywhere in the package that touches the secret**, and only to build the request body; `credentialCaptures.test.ts` pins that with a sentinel token asserted absent from every other helper's output. The capture record itself has no field a secret could serialize into — confirm against the generated type before adding to this flow.

**The card is the tool row.** `CredentialCaptureCard` (web + native peers, same props) matches `ToolCallCard`'s vocabulary — same container, border and ~38px header row, with the form as the expandable section a tool card would put its arguments in — and mounts **in the transcript, replacing the row for the call that opened it**, so one request reads as one event instead of a tool row plus an unrelated full-width panel. `ChatBody` computes the placement with `bindCapturesToToolCalls(messages, captures)`, joining a capture to the last row whose `purpose` argument matches it (while the call is blocked there is no result to read a `captureId` out of), and threads a `renderToolRowOverride` down through `MessageList` to `MessageRow`'s tool branch. It is a **row-level** override on purpose: web's `renderResult` seam only reaches the hover card / bottom sheet, which can never host an input.

Anything `bindCapturesToToolCalls` cannot place — most often a capture opened by a CLI run, whose transcript `CliRunMessages` fetches and renders itself — comes back as `unbound` and renders above the composer instead. A form with nowhere to appear is a hung agent, so the fallback is not optional; `renderToolRowOverride` is deliberately NOT forwarded into `CliRunMessages`, because the host cannot see those rows and would then render the card twice.

Only captures still awaiting the user render at all. A resolved one is dropped: the tool call it belongs to now has a real result in the transcript, which says what happened better than a spent form would.

Both peers map over the single `CREDENTIAL_CAPTURE_FIELDS` spec rather than hard-coding inputs, so they cannot drift on which fields exist, which are optional, or which one is masked (`type="password"` on web via `SecretInput`, `secureTextEntry` on native). `host` is the one optional field — it scopes the stored credential to a git host (`dev.azure.com`) and is omitted from the submit body when blank.

### Git credentials — one surface, every host

Settings → **Git Credentials** (`GitCredentialsSettings` on web/desktop, `GitCredentialsSettingsView` on mobile) is host-agnostic: GitHub OAuth is one method inside it, and a PAT for Azure DevOps, GitLab or Bitbucket is a first-class citizen. It was previously framed as "GitHub Credentials" throughout, which made a stored Azure DevOps credential invisible-by-labelling even when listed. Each row shows the credential's `host` via `formatGitCredentialHost`, which reduces a pasted remote URL to a bare host (stripping any `user:token@` userinfo, so a token in that field never reaches the page) and falls back to a sentence for records written before `host` existed — never `undefined`. `normalizeGitCredentialHost` runs the same reduction on the form's input, so what is stored matches what is displayed.

`GitCredentialsProvider` subscribes to the `gitCredentials:updated` ws topic and refetches on it, exactly as `OverseerGitProvider` does with `overseer:git-status-changed`. Without that the list was a snapshot taken at login, and a credential written by any route other than the Settings form — an in-chat capture, a GitHub OAuth device/redirect flow, another window — stayed invisible until a full reload. The event carries `{ action, credentialId }` only: the record holds a decrypted token, so the refetch (authenticated) is the read, never the broadcast. The backend emits it from every git-credential write path — POST/PATCH/DELETE, both OAuth landings, and the capture submit handler.

### Project notes & secrets

`useProjectNotes(projectId)` + `useProjectNoteReveal` front the per-project encrypted store of standing context an agent reaches for (logins for an app under test, API keys, conventions). The list surface (`ProjectNotesSettings` / `ProjectNotesForm`, web + native) **never renders a stored value** — `GET …/notes` returns summaries only, and `…/notes/:id/reveal` is called solely from an explicit per-note Reveal, which masks itself again after `NOTE_REVEAL_TIMEOUT_MS`. `access: 'open'` means any agent on the project can read the value whenever it needs it; `access: 'ask'` means every read asks the user first.

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
