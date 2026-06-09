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

---

## C. Deferred

### C.1 React testing setup for headless contexts/hooks

Vitest here runs in `environment: 'node'` with no React renderer, so context providers and hooks (e.g. `OverseerGitContext`, `GitContext`) have no co-located tests — consumers carry the only coverage. Add `jsdom` + `@testing-library/react` (+ `@testing-library/jest-dom`) as dev deps, switch the relevant tests to a jsdom environment (per-file `// @vitest-environment jsdom` or a second vitest project), then add provider/hook tests starting with `src/headless/contexts/OverseerGitContext.tsx` (mount → asserts the `overseer:git-status-changed` WS subscription drives a refresh, and `fetchCommitDiff` delegates with body+signal) and backfill `GitContext`.

Deferred because it's test-infra setup, not a feature blocker — the contexts are exercised through the client apps today. No external trigger; pick up when touching this area or when a context regression slips through.

### C.2 Template-app localisation (translation)

The layered app-settings primitive already stores a `language` per user (the `settings.*` bridge → user-global default + per-app override; see the Car Finder `locale.js`). Currency, number, date/time and measurement-unit formatting all honour the resolved locale today, but **`language` is stored and never used to translate UI strings** — every template app stays English regardless.

The deferred task is the actual i18n pass: give template apps a string catalogue keyed by `language`, fall back to English for missing keys, and re-render on a settings change. Decide the mechanism (a tiny per-template `i18n.js` dictionary vs. a shared catalogue format) when picking it up; it should compose with the existing `resolveLayers` output so a per-app language override Just Works.

Deferred deliberately — the user asked to ship the locale/region machinery now and keep all in-app text English. No trigger yet; pick up when a template needs to ship in a non-English market.
