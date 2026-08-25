# Implementation plan

Open-work backlog: real tasks plus their blockers. Done tasks are removed — git history keeps the record. For layer rules and conventions see [ARCHITECTURE.md](./ARCHITECTURE.md); for setup see [README.md](../README.md).

---

## ⭐ TOP PRIORITY — North-star plan: run every project through the Overseer

Cross-repo mission plan (tools → backend → ui → three clients). It lives here because the Overseer surface is where all of it lands; per-repo plans carry the repo-local slices as they start.

### North stars

1. **Group oversight** — a group of projects (e.g. the thefactory family) is overseeable as one unit: work, status, and cross-project dependencies.
2. **Cross-project exchange is clear, secure, and user-controlled** — every flow of data/info between projects is visible and consented.
3. **Ultimate user control** — nothing agentic happens that the user didn't allow; bad behaviour is only possible if the user explicitly enabled it.
4. **All project work happens in-app** — other than tasks the Overseer truly wasn't made for, the user never *wants* to leave it.
5. **The factory improves the factory** — while developing real projects, capability gaps in the thefactory tooling are noticed, filed, and closed through the same rigorous process.

### The spine: every task ends in a verified, inspectable evidence bundle

Today a run's acceptance model is a single timestamp: the diff lands on a review branch and "Sign off & merge" stamps `review.mergedAt` — no verification gate, no reviewer, no reject path, no evidence. The ASAP track builds the missing layer between *"agent finished"* and *"user signs off"*:

> **Evidence bundle** = the diff + the verification results (compile/tests per tier) + runtime proof (video, screenshots, traces) + the AI reviewer's verdict + cost/time. The user's sign-off consumes the bundle, not the raw transcript.

Delivery is organised as an **ASAP track** (milestones M0–M4: start overseeing real tasks now, deepen the bundle level by level) followed by the **long arc** (phases 2–7). Bundle depth is deliberately incremental — **L1** = diff + verification results + cost/time · **L2** = + reviewer verdict with loop-back · **L3** = + video artifact, vision-verified. Each milestone carries binary **Done when** criteria — define the measure before the implementation.

---

### The ASAP track — driving scenario: the android project

The target interaction, verbatim:

> 1. Drop an unstructured task into the project chat. 2. The agent recognises a task and offers to formalise it. 3. Yes. 4. The agent produces a feature proposal (existing tools). 5. Approve. 6. The agent asks whether to start the work. 7. Approve/launch. 8. Magic: isolated run → understand the codebase (knowledge map) → change code → verify via adb → critical review, looping back to code as needed. 9. A review bundle to sign off.

Step-by-step status against the codebase:

| Step | Status today | Closed by |
|---|---|---|
| 1–2 offer to formalise | chat + story/feature tools exist; no intake guidance, so the agent won't *offer* | M1.1 |
| 3–5 feature proposal | works — story/feature creation tools are advertised in project chats | — |
| 6–7 ask-then-launch | **gap** — no chat-callable launch tool; runs start only from UI routes or the feature-request accept path (`startAgentRun` is the raw library method, not chat-shaped) | M1.2 |
| 8 isolated run | works — workspace copy → sandbox → review branch | — |
| 8 knowledge-informed | **gap** — runs get zero knowledge tools (only chats do), and the android project has no map yet | M1.3 |
| 8 adb verification | **gap** — `mobileTest` (adb/simctl+idb) exists but the CLI sandbox can't reach devices; needs host-dispatch + gating | M1.4 |
| 8 review / hole-poking loop | **gap** — no reviewer exists; nothing re-reads a run's diff | M3 |
| 9 bundle + sign-off | **gap** — acceptance is one timestamp (`mergedAt`); no verification results on the run, no reject path | M0 |

Mid-run interaction (stage 2) rides on rails that already exist: `CliRunStatus` has `awaiting-approval`/`paused`, the action broker has `PendingAction` + decide/resume, and CLI runs have an opt-in `spawnAgent` seam (host-side sub-agents with a USD budget) — M2/M3 add new action kinds and personas, not new infrastructure.

#### M0 — Sign-off you can trust (unlocks backend/library projects immediately)

The minimal proper sign-off: verification results on the run + a real accept/reject decision. Generic machinery in `thefactory-tools`; backend composes; UI renders.

- **M0.1 `run.verification`** — after a run lands its review branch, execute the project's declared checks (compile + tests; start with `package.json → factory.tests` as-is) against that branch in a throwaway worktree, and persist per-check results on the run record (`CliRun`) — per-run history with sha/paths, not the current overwrite-in-place JSON blobs. Promote `verifyCandidate` (the panel's compile+test gate) into this shared runner.
- **M0.2 Verdict + reject path** — a `verdict` block on the run (`{ decision: 'approved'|'rejected'|'changes-requested', by, notes, at }`). `reject-review` route (records why, cleans up the branch) + request-changes (feeds the reasons back as a new turn). `CliRunArtifactPanel` grows Approve / Request changes / Reject beside the diff; merge policy per project: `require-verification` blocks "Sign off & merge" until checks are green (`warn`/`off` variants).
- **M0.3 One logical run = one record** — a story/feature run started with `runner:'cli'` currently produces two run records (one without `review`, offering the wrong action); unify. Landing failures become a surfaced state, never a silent `logger.warn`. Feature status follows *review* state — `+` on merge, not on loop-completion.
- **M0.4 Run report head (bundle L1)** — the panel leads with: what changed (diff stats), what verified (per-check results), cost + duration (join run `costUSD` with the chat ledger). This is the L1 bundle.

**Done when:** a real thefactory-tools/backend task runs end-to-end: run → checks execute against the landed branch → panel shows diff + results + cost/time → Approve merges (blocked while red), Reject records why. Usable for daily backend/library work at this point.

#### M1 — The android happy path (bundle L1)

- **M1.1 Task intake guidance** — project-chat system-prompt addendum (both transports): an unstructured task message → the agent offers to formalise; on yes → feature proposal via the existing story/feature tools, presented with a one-line summary + link. Prompt-work plus a check that the story tools are advertised identically on CLI-backed chats.
- **M1.2 Launch-from-chat tool** — a chat-facing `startFeatureWork(storyId, featureId?)` tool: the backend resolves everything the raw `startAgentRun` needs (llmConfig from the vault, runner prefs, sandbox policy) exactly as the feature-request accept path already does, binds the run to the current chat (progress + bundle land in the same conversation), and returns the runId. Approval-gated: the tool is never auto-called — the ask in step 6 *is* the tool-approval prompt.
- **M1.3 Knowledge in runs** — pass the knowledge toolset (`extraMcpTools` + guidance) into `/cli-runs/start` and `/agent-runs/start`, not just chat turns; run prompt nudges the before-you-edit calls (`askKnowledge`, `getChangeBriefing`). Prerequisite runbook step, no code: run `knowledge-analyze` on the android repo so the map exists.
- **M1.4 Device verification, host-dispatched** — register `mobileTest*` as host-side `extraMcpTools` handlers on android-project runs (the sandbox can't reach devices; handlers execute on the host over the MCP bridge — the proven knowledge-tools seam). Gate it: per-project capability opt-in + the raw `mobileTestAdb`/`mobileTestIdb` passthroughs behind the action broker (they are currently unrestricted host argv). Acceptable for M1: the operator pre-boots the emulator (lifecycle automation is M4).
- **M1.5 Bundle L1 assembly** — `run.verification` carries the declared android checks (build/unit via M0.1 config + an adb smoke sequence the agent ran), and the run report lists the mobileTest screenshots the run captured (simple file list + viewer via the existing raw-file route; the full artifact store is M4).

**Done when:** the 9-step scenario runs on a real android task with zero out-of-app steps besides booting the emulator: intake → proposal → approve → launch ask → isolated run that consulted the map and drove adb → L1 bundle → sign-off.

#### M2 — The not-so-happy path: questions, permissions, secrets

- **M2.1 Mid-run questions** — a `askUser(question, options?)` MCP tool: raises a `PendingAction` of a new `question` kind → run parks in `awaiting-approval` → the chat renders a question card → the answer resolves the action and the tool call returns it. Timeout + abort behaviour defined up front.
- **M2.2 Permission asks that execute** — `registerGatedExecutableMcpTool`: today a gated tool can only broker + echo the decision; add the post-approval handler so "may I? → yes → do it" is real. Runtime policy grants ride the existing `PolicyChange` path (the `workspace-limit-raise` pattern): approve a proxy-allowlist addition (internet access for named hosts) or a tool enable mid-run.
- **M2.3 Project notes & secrets vault** — a sixth credential-store entry kind (same encrypted-at-rest pattern as the existing five): `{ id, projectId, label, kind: 'note'|'secret', body|secretValue, access: 'open'|'ask' }`. Agent tools: `listProjectNotes` (labels/metadata only) + `readProjectNote(id)` — `open` returns immediately, `ask` routes through the M2.1/M2.2 approval. Chat guidance: when the user shares credentials/how-to-login context mid-chat, the agent offers to save it as a note/secret so it's never lost. Settings UI per project (web first, peers follow). **Honest guarantee** (stated in the UI): secrets are encrypted at rest, masked in persisted transcripts and UI, access-policied and audited — but a secret an agent *uses* (e.g. types into a login form via adb) necessarily transits that run's model context; `ask` mode exists so each such use is a conscious grant.

**Done when:** a run that hits a question parks, asks in-chat, resumes with the answer; an off-policy tool/network need is granted mid-run without restarting; login credentials shared once are retrievable by later runs under the declared access mode and never appear in stored transcripts.

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

**5.1 Backend image + host** — Dockerfile (vendoring resolved by 5.0), decide host (must run Docker for CLI sandboxes → VM-class host, e.g. EC2 — which is also the self-improvement scenario: the AWS capability gets built *through* the factory process), push sandbox images to a registry, health/readiness split, backup procedure.
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

1. **Backend task**: ticket → run → tiered tests incl. live → reviewer verdict + cost/impact → sign-off from the run report. *(M0, M3, 1.2)*
2. **Web task with backend follow-up**: both diffs condensed, playwright trace + video inspectable in-app. *(M0, 1.1, 2.1)*
3. **Android task, then iOS parity follow-up**: adb/simctl runs with screen recordings, chained via follow-up, group cockpit shows both. *(M1–M4, 1.3, 2.4–2.5)*
4. **LLM-heavy change**: verdict includes usage/cost impact. *(M3)*
5. **AWS/EC2 capability gap**: agents identify the missing factory capability, file + build it through the standard process, then the original task proceeds. *(cross-cutting loop; exercised for real by 5.1)*
6. **Daily driver hosted**: all of the above from the desktop + mobile apps against the hosted backend. *(5)*
7. **Template forked by an outsider, updated upstream, seamlessly pulled.** *(6)*
8. **A second human does scenario 1 on their own account.** *(7)*

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
