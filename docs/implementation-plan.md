# Implementation plan

Open-work backlog: real tasks plus their blockers. Done tasks are removed — git history keeps the record. For layer rules and conventions see [ARCHITECTURE.md](./ARCHITECTURE.md); for setup see [README.md](../README.md).

---

## ⭐ TOP PRIORITY — North-star plan: run every project through the Overseer

Cross-repo mission plan (tools → backend → ui → three clients). It lives here because the Overseer surface is where all of it lands; per-repo plans carry the repo-local slices as they start.

### North stars

1. **Group oversight** — a group of projects (e.g. the thefactory family) is overseeable as one unit: work, status, and cross-project dependencies.
2. **Cross-project exchange is clear, secure, and user-controlled** — every flow of data/info between projects is visible and consented.
3. **Ultimate user control** — nothing agentic happens that the user didn't allow; bad behaviour is only possible if the user explicitly enabled it.
4. **All project work happens in-app** — other than tasks the Overseer truly wasn't made for, the user never _wants_ to leave it.
5. **The factory improves the factory** — while developing real projects, capability gaps in the thefactory tooling are noticed, filed, and closed through the same rigorous process.

### The spine: every task ends in a verified, inspectable evidence bundle

Every task ends in a bundle the user signs off, not a transcript they read:

> **Evidence bundle** = the diff + the verification results (compile/tests per tier) + runtime proof (video, screenshots, traces) + the AI reviewer's verdict + cost/time.

Bundle depth deepens level by level — **L1** = diff + verification results + cost/time (in place) · **L2** = + reviewer verdict with loop-back (M3) · **L3** = + video artifact, vision-verified (M4). Delivery is an **ASAP track** (M3–M4 plus the residue below) followed by the **long arc** (phases 1–7). Each milestone carries binary **Done when** criteria — define the measure before the implementation.

---

### The ASAP track — driving scenario: the android project

The target interaction:

> 1. Drop an unstructured task into the project chat. 2. The agent recognises a task and offers to formalise it. 3. Yes. 4. The agent produces a feature proposal. 5. Approve. 6. The agent asks whether to start the work. 7. Approve/launch. 8. Isolated run → understand the codebase (knowledge map) → change code → verify via adb → critical review, looping back to code as needed. 9. A review bundle to sign off.

Steps 1–7 and 9 run end to end today; the run in step 8 verifies and reports, but nobody re-reads its diff yet. What remains of the track:

**Runbook before the first task on a project** (config, no code):

1. **Declare its verification** in `package.json → factory.verification` — the checks a run must pass and whether they gate sign-off. Contract + examples in [thefactory-tools/docs/TESTING.md](../../thefactory-tools/docs/TESTING.md#run-verification--what-a-project-must-pass-before-sign-off). This is required for automatic verification: checks run agent-authored code on the host, outside the sandbox, so a project that declares nothing is never auto-verified (you can still verify it on demand from the review panel). Add `policy: 'require'` once a project's checks are trustworthy enough to block a merge.
2. **For the android project**: run `knowledge-analyze` on it so the map exists, and enable its `mobile` + `knowledge` tool sets so runs get device automation and the map. Boot the emulator before a run (lifecycle automation is M4.5).

#### M-residue — carried over from the sign-off backbone

- **One logical run = one record.** A story run started with `runner:'cli'` still produces two run records — the CLI run (no `review`, offering "Apply to project") plus the orchestrator's separate landing. Unify them so one logical run has one review surface.
- **Feature status must follow review state.** `featureStatusOnCompletion` flips a developer feature to `+` when the loop returns success, before and independent of whether the diff was landed, verified, or merged. A feature should not read as done while its diff sits unmerged.
- **`startFeatureWork` on the CLI transport.** It launches the API runner today (isolated workspace, lands + verifies). Driving the same flow through the sandboxed CLI runner is blocked behind the dual-record fix above.
- **Device evidence in the report** — `mobileTest` screenshots are captured to `.factory/mobile-test/<sessionId>/` but are not yet reachable from the run report. Needs the artifact store (M4.1).
- **Emulator lifecycle + build wrappers** — a run still needs a pre-booted device and a pre-built APK. See M4.5.
- **Secret disclosure in transcripts.** A note an agent reads is returned as a tool result and persisted verbatim in the chat/run transcript. The store's guarantee stops at "encrypted at rest, never listed, per-use grant" — redaction at persistence time is unimplemented, and the docs say so. Build it by teaching the transcript writer which values to mask (it needs the project's secrets, which today it has no access to).
- **`POST /git/merge-apply` bypasses the sign-off gate.** The `require` policy is enforced in `mergeCliRunReview`; merging the review branch directly from the Git panel performs the same merge with no check. Defensible (it is a deliberate user action outside the flow), but if the gate is meant to be absolute, that route needs the same check.
- **Auto-verification is opt-in by declaration**, because it runs agent-authored code on the host outside the sandbox. A project that declares nothing gets no automatic evidence — only an on-demand verify. Revisit if the default should instead be a _sandboxed_ verification run.

#### G — Global assistant chat + project onboarding

The app-level assistant and the tools that take a project from "it's on disk" to "set up in the
Overseer". What remains:

- **Conversation history.** `globalChatHistory` and `Chat.archivedAt` are in place and reset already
  archives, so past conversations are kept — but nothing renders them. Add a history list to the
  overlay when the user wants to find an earlier conversation.
- **Group membership is recorded on both sides by hand.** `importProjectFromPath` reconciles the
  project spec AND the group's `projects[]` itself, because it calls `createProject` directly rather
  than going through `POST /projects`, which owns the reconciliation. Two implementations of one
  invariant will drift; lift the reconciliation into `ProjectTools` (or a shared helper both callers
  use) so a group link cannot be half-written.
- **Mobile shows two headers in the global chat.** `ChatSessionScreen` hard-wires `ScreenShell`, so
  the overlay's header and the screen's header both render. Web and desktop suppress theirs via
  `ChatPanelBody`'s `embedded` prop; mobile needs the equivalent knob on `ChatSessionScreen`, which
  three routes share. The same duplication already ships in mobile's `ChatBottomSheet`.
- **Credential captures do not survive a backend restart.** The store is in-process by design (a
  capture is one half of a live handshake, and `requestGitCredentials` now blocks on it). A client
  reload is covered by the listing route, but a server restart drops open captures — and takes the
  blocked tool call with it, so the turn is lost rather than merely delayed. Persist them only if
  that proves annoying in practice.
- **`GET /tools` and the execute route now share one allow-list**, so the Tools view no longer offers
  runs that 403. Two things surfaced while closing that hole and are still true: every git tool is
  unreachable through `executeTool` (the route passes no `ToolCallContext.git`, so they throw), and
  `getStoryReference` only works via a `callTool` override. Neither is new; both are worth a pass if
  the Tools view is meant to be trustworthy.
- **A CLI-backed story run still produces two run records** — the `CliRun` (transcript, "Apply to
  project") plus the orchestrator's own landing. `startFeatureWork` now inherits the chat's CLI agent,
  so this path is reachable from the intake loop; unifying the records is what makes its review
  surface as good as the API runner's.
- **The allowlist and the permission context are not applied on every dispatch path.**
  `resumeCliAgentRun` / `forkCliAgentRun` rebuild options from the persisted `CliRun`, which stores
  neither `allowedToolNames` nor `runContext` / `toolApprovalMode`, and `POST /cli-runs/start`
  resolves none of them. Both are HTTP-reachable; they hand the run the full built-in set, and they
  fall back to `runContext: 'unattended'` — so a chat's turn resumed through them would not ask.
- **The chat tool catalogue is transport-wide, not context-aware** (`?runner=` only), so a global CLI
  chat's real tools (onboarding, credential capture, discovery) are missing from the list while
  irrelevant rows appear; and the API catalogue omits backend-injected families that remain active.
  Toggling what is shown is therefore not yet the whole truth.
- **A failed catalogue fetch renders "No tools available for this context."** — the opposite of the
  truth, since an unset allowlist means the agent has every built-in. Surface the load error instead.
- **Changing a CLI chat's allowlist orphans its resident container** rather than replacing it: the
  allowlist fingerprint is part of the session key and `_getOrCreate` only evicts on an exact match.
- **No UI chip for choosing the implementing agent.** `startFeatureWork` takes an optional `runner`
  and otherwise inherits the chat's, which covers "use the agent I'm talking to" and "use the API one
  instead" conversationally. A picker on the proposal card would make the choice visible rather than
  something the user has to know to ask for.
- **`startFeatureWork` is absent from the toggle catalogue**, so the tool that launches an autonomous
  run cannot be switched OFF in advance. It now asks before every call in a chat, and is on the
  critical list an unattended run still stops for — but the catalogue is built from the built-in MCP
  groups only, so no backend-injected tool appears as a row.
- **Same-origin link interception is web-only.** The web `Markdown` reads `window.location.origin`;
  mobile has no origin and native links still route only via `overseer://`. Harmless while the model
  is told to emit the scheme, but it means the safety net has a hole on one client.
- **An aborted resident turn loses that turn's workspace edits.** Abort tears the session down, and
  `_captureTurnEdits` never runs before the session workspace is removed. Acceptable while abort is
  the escape hatch; revisit if users start stopping runs mid-edit routinely.
- **A resident session freezes its model and effort at creation**, and the session key ignores
  `modelId` — so switching model mid-chat keeps talking to the old one. Include `modelId`/`effort` in
  `residentSessionKey`; safe now that a cold session is seeded with the chat history.
- **A failed resident turn persists an empty transcript**, discarding partial assistant output, so a
  timed-out turn leaves a blank bubble. Accumulate transcript entries into the rotating record as
  they stream, rather than only on success.
- **`FileStorage.read` may swallow a decrypt failure** and present an EMPTY credential store, which a
  later write would then overwrite. Distinguish "absent" from "present but undecryptable" and fail
  loudly. Not the cause of any observed bug — the live store decrypts fine — but it is a way for
  "my credentials vanished" to become literally true.
- **`AgentQuestionCard` is still pinned above the composer** in the oversized vocabulary the
  credential card is being moved out of. Shrink it to the tool-row family so the two "agent needs
  you" surfaces read as one.

#### M3 — Agentic review with loop-back (bundle L2)

- **M3.1 Reviewer persona** — a `reviewer` agent definition whose input is the L1 bundle (diff, feature acceptance text, verification results, screenshots) and whose output is the verdict + highlights; runs post-verification via the existing in-run `spawnAgent` seam (host-side, budget-capped) or as an orchestrator step after landing.
- **M3.2 Bounded loop-back** — on `changes-requested`, the reasons feed a follow-up turn into the same session (resident/persistent sessions carry context); bounded (default 2 iterations) then the bundle ships with the open findings attached. The user's sign-off remains terminal — reviewer output is advisory (north star 3).
- **M3.3 Knowledge in review** — the reviewer calls `getIssuesForChange`/`getChangeImpact` on the diff; blast-radius and convention drift become verdict inputs. For LLM-touching changes the verdict includes a cost/usage-impact note.

**Done when:** an android or backend run's bundle carries a reviewer verdict that cites verification results and knowledge findings; a deliberately-planted flaw triggers changes-requested → fix → green within the loop bound.

#### M4 — Video proof, agent-verified (bundle L3)

- **M4.1 Artifact entity + store** — first-class artifact records `{ id, runId, kind: 'video'|'screenshot'|'trace'|'report'|'file', path, label, meta }` with a manifest + retention/GC; uiTest/mobileTest register outputs instead of dropping loose files; backend list-per-run route + **signed media URLs** (short-lived token, HTTP Range) so `<img>`/`<video>` render without bearer headers.
- **M4.2 Media rendering** — `video` kind in the file-pane classifier, `<video>` (web) / `expo-video` (native), thumbnails in chat + run report. Fix the binary-attachment corruption: all three clients `readAsText` chat attachments, garbling PNGs — route through the existing base64 upload-encoding helpers.
- **M4.3 Screen recording** — start/stop `adb shell screenrecord` (and `simctl io recordVideo` for iOS later) via the existing `spawnStreaming` handle; the `.mp4` registers as a run artifact — video proof as a standing deliverable.
- **M4.4 Vision verification** — the reviewer consumes the recording (keyframes to a vision model): assert the flow completed, flag anomalies — removing the "user must eyeball every runthrough" step for simple bugs.
- **M4.5 Remove the manual pre-steps** — emulator lifecycle (`emulator -avd`/`avdmanager` boot/shutdown) + `gradlew` build/install wrappers, so a run needs no pre-booted device or pre-built APK.

**Done when:** an android task's bundle plays its screen recording in-app on all three clients, and the reviewer verdict explicitly cites what the video shows.

---

### The long arc

Sequenced after the ASAP track; phase numbering unchanged from here down.

### Phase 1 — Verifier depth for the remaining project types

- **1.1 Web apps — Playwright first-class**: a real `@playwright/test` branch in the test runner (`runTest` currently shells everything to vitest): detect playwright configs, JSON reporter → `TestsResult`, per-suite timeouts (e2e must exceed the 30s per-file default). Traces + video as standard evidence (`context.tracing`, `recordVideo`, artifacts per M4.1); reviewer consumes the trace/screencast.
- **1.2 Backends — full tier model**: named tiers (`compile`/`unit`/`integration`/`live`/`e2e`) in the verification config — makes `*.integration.test.ts`/`*.live.test.ts` runnable through the runner (the default vitest config excludes them today); live-tier env resolves from the credential vault, never typed by hand; per-feature required-checks pinning (a feature gains an optional `verification` field).
- **1.3 iOS — mirror android**: doctor check for `idb`, `xcodebuild` wrapper, simulator lifecycle + recording; Mac-host-only by construction — always the host-dispatch path. The android→ios parity scenario (2.5) is the acceptance case.
- **1.4 Factory apps**: productize `capture-app-view.mjs` into a backend tool/route (`captureCurrentAppHtml(projectId)`) reusing the backend's Playwright (absorbs §B.4 below); an in-app-launch verification tier that boots the project's own app/activity and asserts liveness + captures the view.

---

### Phase 2 — Oversight UX: condensed chats, status on demand, the group cockpit

**2.1 Condensed task chat**
Collapse agent-generated noise by default: the chat shows the summary card (M0.4) + milestones; raw transcript/tool calls behind a drill-in. One chat per task from intake to sign-off.

**2.2 Status on demand**
"What's the plan / progress / current verification rate?" answered in-chat at any time: a status tool over the run record + story/feature state + verification results (the agent answers from data, not vibes).

**2.3 Runs history view**
A runs surface keyed on the run record (not reachable only through chats): filter by project/story/status/verdict; unmerged or abandoned review branches become visible and actionable.

**2.4 Group cockpit** (`thefactory-ui` `GroupHome` + backend roll-up)
A group status roll-up endpoint (per-project: running/queued runs, story progress, failing verification, git divergence, open feature requests, last activity) + `GroupHome` becomes a live dashboard, not a card grid. Badge aggregation already exists headless — give it the data and the renderer.

**2.5 Cross-project chaining**
The "android done → ios follows" primitive: a **follow-up** link on stories/feature requests (`{ dependsOn: requestId|storyId, project }`). Set `parentRequestId` (typed, never populated today) when a run emits a request; on terminal success of the parent, the follow-up is offered for auto-start per policy (default: ask — north star 3). Auto-resume of the sender's chat after a request completes (today: notification only).

**2.6 Group chats can delegate**
`requestProjectFeature` becomes advertisable in group chats (target project explicit), so "change all four repos" orchestrates from one conversation — each write still lands as a feature request in its target project under that project's own review. Fix group-chat membership enforcement on the backend path (only the tools path checks membership today).

**Done when:** the android→ios scenario runs end-to-end in-app: task intake → android run + verified + signed off → ios follow-up offered → ios run + verified → both visible in the group cockpit; at any point mid-run, a status question in the chat answers with plan/progress/verification state.

---

### Phase 3 — Knowledge to the max

The map's biggest unexploited lever: code-writing agent **runs** have zero knowledge access today (only chats do), and the change-aware tools have zero callers.

**3.1 Knowledge in agent runs, everywhere** — extend M1.3 from the android case to every project's runs, and surface the deeper zero-caller tools where they belong: `compileTicketPlan` at task intake, `getMapDelta`/`getItemHistory` in status answers.
**3.2 Knowledge in the review path** — extends M3.3 beyond the android/backend cases: every reviewer run cites impact findings as verdict inputs.
**3.3 Freshness loop** — after a merged run, queue `knowledge-analyze` (policy: auto for factory repos); `getMapFreshness` warnings surface in the run report. Maps exist for every factory repo (backend, ui, web, local, mobile currently have none or stale ones).
**3.4 Ticket/spec ingestion** — connectors (phase 4) and pasted tickets flow into knowledge attachments (`ticketToAttachment` exists, has no app path), giving `compileTicketPlan`/`recallKnowledge` a corpus: intake → cited plan becomes the standard task-start.
**3.5 Constellation ↔ groups** — join the two grouping systems: the group cockpit renders the cross-repo dependency constellation; `ConstellationView.groupId` gets populated from `ProjectsGroup`.

**Done when:** a run in a factory repo consults the map before editing (visible in transcript), the reviewer verdict cites impact findings, and a merged run refreshes the map without manual action.

---

### Phase 4 — External intake: tickets and comms

Read-mostly first; write-back after. All connector credentials via the provider-connection vault; per-connection health probes; no webhook receivers until hosting (phase 5) provides a public URL.

**4.1 Azure DevOps connector** — third implementation of the existing `Connector` interface (GitHub Issues + Jira exist); work-items → `ExternalItem` → import-as-story with `externalIds` back-link + dedupe-on-import.
**4.2 Generic provider OAuth** — promote the GitHub-only OAuth service into a provider registry (authorize/token URLs, scopes, client creds per provider) with refresh-before-expiry rotation for provider connections (today only git credentials rotate).
**4.3 Write-back** — extend `Connector` with comment/status ops: on sign-off, post the evidence summary (+ artifact links once hosted) back to the ticket; ticket status transitions per policy.
**4.4 Slack / Teams ingest** — greenfield: a comms connector shape (channel/thread/message, not ticket-shaped), watch-list subscriptions, thread → knowledge attachment + optional task intake. Polling first; events API when hosted.
**4.5 Sync scheduler** — background refresh of assigned items with badge on new intake (today: fetch only when a modal opens).
**4.6 Agent access** — register `ConnectorTools` in the agent tool registry (schemas exist, wiring doesn't) so a task chat can pull its own ticket context — read-only, per-project opt-in.

**Done when:** a Jira/ADO ticket lands as a task with context ingested into knowledge, and on sign-off the ticket carries the evidence summary — without leaving the app.

---

### Phase 5 — Hosted + distributed (backend, web, desktop, mobile)

Prerequisite for everything below: **publish the sibling packages** — `file:../` links (tools, db, knowledge, ui…) block EAS builds and any server image. Private registry or workspace-publish pipeline; versioned releases; clients consume versions, not paths.

**5.1 Backend image + host** — Dockerfile (vendoring resolved by 5.0), decide host (must run Docker for CLI sandboxes → VM-class host, e.g. EC2 — which is also the self-improvement scenario: the AWS capability gets built _through_ the factory process), push sandbox images to a registry, health/readiness split, backup procedure.
**5.2 Auth hardening before exposure** — the current single static bearer + public `/ws` (receives all broadcasts) + reflect-any-origin CORS is localhost-grade; minimum for hosting: authenticated WS, locked CORS, token rotation, rate limiting. Full multi-user waits for phase 7; an OAuth proxy fronts single-user hosting.
**5.3 Secrets** — runtime secrets out of the git-tracked overseer repo into a host secret store; key-rotation procedure; the plaintext `.env` key sprawl in checkouts gets cleaned up.
**5.4 Web hosting** — static host + SPA fallback + env matrix for backend URL; TLS.
**5.5 Desktop** — real app identity (still `com.electron.app`/`my-app`), signing + notarization, `electron-updater` + publish config, release workflow.
**5.6 Mobile** — `eas init`, store accounts, `expo-updates` OTA channel (fixes-without-store-review), submit workflows.
**5.7 Version negotiation** — `/health` version becomes real; clients send `X-Client-Version`; minimum-version gate + in-app "update available" surface. Backend/app updates are a recurring flow — they must be boring.

**Done when:** the daily driver is the hosted stack — desktop app on the Mac + mobile app on the phone doing every phase 0–4 flow against the hosted backend, and an update of any of the four ships without manual surgery.

---

### Phase 6 — Templates as products

- **Provenance**: keep the template as `upstream` remote (or record template id + commit) at fork time instead of severing history; template versioning (tag/ref pinning) so forks are reproducible.
- **Update propagation**: a "template updates available" check + guided merge/re-seed path for shared runtime pieces; stop copy-pasting `bridge.js`/`locale.js` per repo (already diverged 5 ways) — one canonical, host-served or generated asset.
- **Catalog as data**: templates table + register/publish routes (catalog is a compile-time const today); template contract validation (a catalog entry must actually be template-shaped — one current entry would 422 at fork); `metadata.appDir` in the contract.
- **Publish-my-project-as-template**: the reverse path, turning a project into a seed.
- Composes with §B.3 (the create-from-template UX journey below).

### Phase 7 — Multi-user distribution

Design-first, last in line: user/tenant model over the ~70 routes, per-user credential vaults, sharing semantics for projects/groups/templates, role of the OAuth proxy vs native auth. Do not start before phases 0–6 are the daily driver.

---

### Cross-cutting — the control & security model (north stars 2 + 3)

Applies to every phase; any new capability ships with its control surface:

- **Capability opt-in per project**: host-side powers (device automation, connector write-back, auto-merge, auto-follow-up, cross-project access) are off by default, enabled per project/group in settings, visible at a glance.
- **Approval gates that execute**: the gated-MCP-tool path can only broker+echo today (no post-approval handler) — build `registerGatedExecutableMcpTool` so "ask, then do" is real, and route risky tools through it.
- **Audit trail**: every cross-project read/write, sign-off, auto-action records who/what/why on the run or request record.
- **Fail-closed stays the rule**: the cross-project read allow-list pattern extends to every new tool family; write = feature request, always.
- **Parity**: every surface lands headless-first in this package, web + native peers, per the parity mandate below.
- **Self-improvement loop (north star 5)**: capability gaps found during real work are filed as feature requests against the factory repos (create the missing `thefactory-tools/docs/BACKEND_FEATURE_REQUESTS.md` home), built through the same phase-0 process, and the factory repos themselves run with maps + verification on.

### Scenario ladder — acceptance tests for the whole plan

1. **Backend task**: ticket → run → tiered tests incl. live → reviewer verdict + cost/impact → sign-off from the run report. _(M0, M3, 1.2)_
2. **Web task with backend follow-up**: both diffs condensed, playwright trace + video inspectable in-app. _(M0, 1.1, 2.1)_
3. **Android task, then iOS parity follow-up**: adb/simctl runs with screen recordings, chained via follow-up, group cockpit shows both. _(M1–M4, 1.3, 2.4–2.5)_
4. **LLM-heavy change**: verdict includes usage/cost impact. _(M3)_
5. **AWS/EC2 capability gap**: agents identify the missing factory capability, file + build it through the standard process, then the original task proceeds. _(cross-cutting loop; exercised for real by 5.1)_
6. **Daily driver hosted**: all of the above from the desktop + mobile apps against the hosted backend. _(5)_
7. **Template forked by an outsider, updated upstream, seamlessly pulled.** _(6)_
8. **A second human does scenario 1 on their own account.** _(7)_

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
- **Native `ModelChipConnected` CLI wiring (Feature 4 follow-up)** — the native `ModelChip` presentational peer has the CLI props, but there is no native `ModelChipConnected` in this package (native apps wire their own). The mobile app must wire the CLI props via `useCliConfigs` + `useChatCliRunner`, mirroring web's `ModelChipConnected` (which now persists the picked model + effort into `ChatCliRunner`).
- **Per-message `CostChip` source pill (Feature 4 follow-up)** — the aggregate `bySource` split ships in `UsageModal` ("By executor"); a per-message API/CLI pill on `CostChip` needs `source` threaded onto the per-message usage shape. Add when a consumer wants per-message source attribution.

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

### B.3 Template-creation UI journey (major)

The template platform works end to end at the data layer (one shipped template — the Investment Planner — forks a real repo, seeds `.factory/`, and renders in the App tab), but the **create-from-template UX has never been built out properly**. Today the entry point is a single rocket icon in the per-client `ProjectManagerModal` (`startFromTemplate` → `from-template` mode → `TemplatePicker`), and the journey from there is thin and unverified.

Build the journey as a first-class flow, shared here and surfaced per client:

- **Template browser** — evolve [src/web/compound/TemplatePicker.tsx](../src/web/compound/TemplatePicker.tsx) (+ native peer) from a bare list into a real picker: card per template with name, description, difficulty/estimated-time, and a thumbnail/preview (the catalog already carries the metadata via `useTemplates`). Empty/loading/error states. The headless `TemplatesContext` (`useTemplates`) stays the single source.
- **From-template create form** — name + recommended id (checked for collisions) + target group, then `createFromTemplate`; route into the new project's **App** tab on success, not the file tree. Surface fork progress (clone → seed → first commit can take a few seconds).
- **Entry point** — replace the unlabelled rocket with a clear "New from template" affordance in `ProjectManagerModal` (web + desktop; add to mobile project-create if/when it exists). Verify the whole path end to end on a device, per the parity mandate.
- **Integrate with GitHub-backed creation** — the in-flight "create project + GitHub repo" wizard work (backend `…/projects/github/create-repo` + a stored-credential reuse path + a name-availability check) should compose with the from-template flow, so a user can fork a template **into a fresh GitHub repo** in one step.

Tracking note: only the Investment Planner template exists; a second (car-buyer helper) is planned, which is the real second consumer that will shake out the picker + journey.

### B.4 In-app capture for agent debugging (`captureCurrentAppHtml`)

Motivation: when an embedded app renders wrong, the fastest fix loop is to let an agent **see the actual app**. But "Save Page As" only captures the outer Overseer shell — the app runs in a **cross-origin** iframe/WebView (overseer-web `:5173`, app served from the backend `:7001`), so overseer-web cannot read the iframe DOM directly.

**MVP shipped (a script):** [`thefactory-backend/scripts/capture-app-view.mjs`](../../thefactory-backend/scripts/capture-app-view.mjs) mints a view token, headlessly renders `…/view/index.html` (the exact bytes the iframe loads), and writes the rendered DOM + a screenshot. It renders **standalone** (no `OverseerBridge`) so it shows the shell + empty states — enough to judge layout/design against the mockups, and it proves what the backend actually serves vs. a stale client. Any agent can run it via a shell.

**To productize:**

- A backend chat tool `captureCurrentAppHtml(projectId)` wrapping the same headless render — reuse the backend's existing Playwright access (via `webTools`) instead of spawning the script — returning the HTML + a screenshot artifact the agent can read.
- **v2 — LIVE capture of the user's real iframe DOM** (their data + current view), not a fresh render. Cross-origin means the app must serialise itself: add a **host→app request/response** to the bridge — overseer-web posts `overseer:capture-html`; the shared template `bridge.js` replies with `document.documentElement.outerHTML`; `ProjectAppView` (web + native) exposes `captureHtml()` awaiting the reply. The agent-invocable path signals the client over ws (mirror `pendingToolGrants`), the client captures + uploads, and the tool returns it.

### B.5 "Show app" select-and-annotate mode → current chat (scope later)

From a chat, the user enters a **"Show app"** mode over the running app: they click elements in the app, each selection gets a comment box, and the set of `{ element (stable selector + outerHTML snippet), comment, optional bounding-box screenshot }` is fed back into the **launching chat** as structured context for the agent. Open questions to scope: element identification across the cross-origin boundary (the app exposes a lightweight **pick mode** via the bridge that returns a stable selector + the clicked node's `outerHTML`); how selections render in the chat composer; multi-select / edit / remove. Shares the "annotation → chat context" plumbing with B.6.

### B.6 Arbitrary screenshot + comment → current chat (scope later)

Same delivery as B.5 but for freeform screenshots: the user grabs a screenshot (of the app surface or a selected region), adds a comment, and it's attached to the launching chat. Shares the annotation→chat plumbing with B.5; differs only in the capture source (image vs. element pick).

---

## C. Deferred

### C.1 React testing setup for headless contexts/hooks

Vitest here runs in `environment: 'node'` with no React renderer, so context providers and hooks (e.g. `OverseerGitContext`, `GitContext`) have no co-located tests — consumers carry the only coverage. Add `jsdom` + `@testing-library/react` (+ `@testing-library/jest-dom`) as dev deps, switch the relevant tests to a jsdom environment (per-file `// @vitest-environment jsdom` or a second vitest project), then add provider/hook tests starting with `src/headless/contexts/OverseerGitContext.tsx` (mount → asserts the `overseer:git-status-changed` WS subscription drives a refresh, and `fetchCommitDiff` delegates with body+signal) and backfill `GitContext`.

Deferred because it's test-infra setup, not a feature blocker — the contexts are exercised through the client apps today. No external trigger; pick up when touching this area or when a context regression slips through.

### C.2 Template-app localisation (translation)

The layered app-settings primitive already stores a `language` per user (the `settings.*` bridge → user-global default + per-app override; see the Car Finder `locale.js`). Currency, number, date/time and measurement-unit formatting all honour the resolved locale today, but **`language` is stored and never used to translate UI strings** — every template app stays English regardless.

The deferred task is the actual i18n pass: give template apps a string catalogue keyed by `language`, fall back to English for missing keys, and re-render on a settings change. Decide the mechanism (a tiny per-template `i18n.js` dictionary vs. a shared catalogue format) when picking it up; it should compose with the existing `resolveLayers` output so a per-app language override Just Works.

Deferred deliberately — the user asked to ship the locale/region machinery now and keep all in-app text English. No trigger yet; pick up when a template needs to ship in a non-English market.

### C.3 Files tree: show empty folders

The Files tree never renders an empty directory. The data source is files-only: thefactory-tools `getAllFileStats` (`listAllFileStats`/`walk` in `src/git/GitTools.ts`) recurses into directories but emits an entry only for each file, and `FileMeta` (`src/file/fileTypes.ts`) has no directory marker. So an empty folder produces no path segment and `FileTree.buildTree` (web + native) — which infers dirs purely from file path prefixes — never creates a node for it.

The fix is a cross-repo data-model change:

- **thefactory-tools** — add a directory marker to `FileMeta` (e.g. `isDir?: boolean` / `kind`) and emit directory entries (including empty ones) from `getAllFileStats` + the `FilesWatcherWithIndex` listing. Rebuild dist with `tsc -p tsconfig.json`.
- **thefactory-backend** — extend `FileMetaSchema` with the marker; regenerate swagger.
- **thefactory-ui (generated client)** — regenerate types via `generate:backend` so `FileMeta` carries the marker.
- **`FileTree` (web + native)** — `buildTree` consumes explicit dir entries (create empty `DirNode`s), and `countLeafFiles` / the `onVisibleCountChange` count exclude directory rows. Host `FilesView`/`FilesListView` map the marker into `FileTreeEntry`.

Deferred because it can't be done client-side (the client never receives empty-dir info) and needs codegen + a runtime check across four repos. No trigger; pick up when empty folders need to be visible (e.g. a scaffolded-but-empty directory in a template repo).
