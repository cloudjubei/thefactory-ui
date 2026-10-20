# stopActivity approval: coordination

## Status

**Agreed with the backend — contract version 1, 2026-10-20.** The contract is
`thefactory-backend/docs/STOP_ACTIVITY_CONTRACT.md`, built on the thefactory-tools types in
`src/activity/activityStopTypes.ts`, which are the source of truth. The backend request is
**8a95cafa-96a2-4dcd-b7e6-124f6cd16764** (backend story #8f9c5993-8463-46c1-98f7-cbd25a019211);
this project's request is **1f88f34d-532a-45e0-a72f-1c804c5e6112** (story
#2d20d84b-5ec6-4054-bbb5-1eedf9e41861). Origin: thefactory-tools story
16138347-0b32-42e2-84d9-620643b4e82b, request 9b10cbea-e99f-482c-95cf-b6ddfc1d5afa from
thefactory-knowledge.

Where the earlier proposal here named things differently, the agreed contract wins:

| Proposed here | Agreed |
| --- | --- |
| `kind: 'stop-activity'` | `kind: 'activity-stop'`, `version: 1` (`ActivityStopCard`, validated by `isActivityStopCard`) |
| `observedAt` | `snapshotAt` |
| `elapsedRunningMs`, queue time excluded | `elapsedMs` from the recorded start, queue time included — the card says so |
| `progress: { done, total \| null }` | `steps[]`, each `{ key, status, done, total }`, not aggregated |
| `costUSD: null` for unknown | `costUSD` absent for unknown; a recorded `0` is shown as `$0.00` |
| `requestedReason` | `reason`, shown as the agent's own words |
| outcomes `stop-requested / stopped / denied / terminal-no-op / refused / failed` | Tools `ActivityStopResult.outcome`: `stopped / noop / not-stopped / failed / refused`. A stop is awaited, so there is no `stop-requested`; a denial runs nothing, so it has no stop result; `noop` names the terminal `status` it found |
| a separate execution envelope | the tool's `ActivityStopResult`, recorded as the broker action's execution (`PendingAction.execution.result`), plus `ActivityRun.stopAttempts` on `GET …/activities/:id` |

## What this project ships

Shared presentation, both platforms, mounted by the shared `ApprovalPanel`:

1. `src/headless/utils/activityStopApproval.ts` — `isActivityStopGrant`, `activityStopCardOf`
   (reads only a version-1 card), `activityStopApprovalView` (the host's facts only; with no
   card it says the details could not be read and shows nothing the agent claims as fact) and
   `activityStopMilestone` (only `stopped` reads as done).
2. The decided stop's row: `toolRowMilestone` gives a `stopActivity` row the outcome line —
   Stopped, Already <status>, Not stopped (it ended on its own first), Couldn’t confirm it stopped,
   or Not stopped — <code> — on web and native alike (`ToolRowMilestoneLine`, a `neutral` tone for
   the no-op). It reads the execution the broker action recorded (`ToolCallLike.executionResult`,
   carried from the live decided ask by `settledAskFacts`), falling back to the row's own result,
   never a copy taken earlier. The activities the stop ended with it (`ActivityStopResult.children`)
   are counted on the same line; any that may still be running make it a warning.
3. `src/web/compound/chat/ActivityStopApprovalPanel.tsx` and its native peer
   `src/native/compound/chat/ActivityStopApprovalPanel.tsx` — the shared `ToolAskCard`, danger
   tone, verb **Stop it**, the agent's reason, then type, status (paused said as interrupted),
   elapsed, cost so far, each step's progress and the launch parameters, with the parameters
   left out as secret named, never shown.
4. Routing: `ApprovalPanel` (web and native) sends a `stopActivity` ask to that card. Its broker
   kind `activity:stopActivity` is not a row-decided kind, so it always takes the composer's
   place and is never decided on a generic tool row, and writing past it never declines it
   (the backend's `PASSED_OVER_ASK_KINDS` agrees).
5. The person's own Stop for embedded apps: the bridge op `activities.stop`
   (`{ activityId, reason? }` → the `ActivityStopResult`) in `src/headless/api/activitiesBridge.ts`,
   calling `POST /projects/:projectId/activities/:activityId/stop`. The app confirms before it
   sends. `activities.abort` stays the interrupt (Pause) — resumable, no stop record.
6. Showcase (`playground/scenes/activityStop.tsx`): scene `activity-stop-ask`, states `running`,
   `no-reason`, `paused`, `queued`, `params-left-out`, `unreadable`, `phone`; scene
   `activity-stop-row`, states `stopped`, `stopped-with-children`, `children-unconfirmed`, `noop`,
   `not-stopped`, `failed`, `refused`.

## Consumers

Each mounts the shared `ChatBody`, whose `ApprovalPanel` routes the ask — no consumer carries
a second cancellation path or calls `abortActivity` for an approval:

| Consumer | Mount | Adoption |
| --- | --- | --- |
| thefactory-overseer-web | `src/ui/screens/ChatView.tsx`, `GroupChatView.tsx`, `AssistantView.tsx` → `ChatBody` (`thefactory-ui/web`, `file:../thefactory-ui`) | the shared web card, wide and narrow |
| overseer-local | `src/renderer/src/ui/components/chat/ChatBodyForContext.tsx` → `ChatBody` (`thefactory-ui/web`, `file:../thefactory-ui`) | the shared web card |
| thefactory-overseer-mobile | `src/ui/screens/chat/ChatSessionScreen.tsx` → `ChatBody` (`thefactory-ui/native`, `file:../thefactory-ui`) | the shared native card |

Embedded app viewers (thefactory-knowledge, thefactory-modeltrainer,
thefactory-templates-financialplanner) stop through the host bridge: their Stop / Discard send
`activities.stop` after an in-app confirm, with a bridge timeout long enough for the awaited
teardown (`stopActivity` in each `viewer/bridge.js`); their Pause stays on `activities.abort`.

## Proof still owed

Screens of the consumers come from the showcase states above, not from a person's live app.
A live approve / decline walkthrough on a running activity is the person's screen check.
