# Research: direct Cancel for host activities

## Decision

**No — do not add a generic client Cancel control in this feature.** Keep the
existing person-confirmed Stop in the embedded project's App and the agent's
approval card. No implementation stories are proposed: the conditional requirement
to create stories applies only to a yes outcome.

This is a placement/scope decision, not a claim that a generic activity list or a
shell Cancel already exists. If independent, shell-level oversight of activities
is wanted later, first specify that surface and its navigation. A badge alone is
not enough context to choose which activity to stop.

## Findings

Inspected the shared library and the registered web, desktop, mobile and backend
checkouts on 2026-11-18. Cross-project reads describe those checkouts, not a pinned
multi-repository release. Keyword searches of each client's `src/` for
`useProjectActivities`, `listActivities`, `stopActivity` and `activities.stop`
returned only its badge-count wrapper. Source inspection confirms that wrapper
reads activity counts, not a list of actionable activity rows:

| Client | Activity counts | Embedded App bridge mount |
| --- | --- | --- |
| Web | `src/core/notifications/useBadgeCounts.ts` | `src/ui/screens/ProjectAppTab.tsx` |
| Desktop | `src/renderer/src/core/notifications/useBadgeCounts.ts` | `src/renderer/src/ui/screens/ProjectAppTab.tsx` |
| Mobile | `src/core/notifications/useBadgeCounts.ts` | `src/ui/screens/app/ProjectAppTabView.tsx` |

All three mounts use the shared `useProjectDataBridge`. In this library:

- `src/headless/hooks/useProjectActivities.ts` exposes live/paused/unseen counts.
  `activitiesStore.ts` retains only id, scope, status, liveness and finish time;
  it does not retain the type, launch parameters, cost or progress needed to
  identify work safely. No standalone activity-list presentation was found in
  the shared consumers of this hook.
- `src/headless/hooks/useProjectDataBridge.ts` dispatches activity messages to
  `src/headless/api/activitiesBridge.ts`. Its `activities.stop` handler requires
  an activity id, scopes it to the active project, trims an optional reason and
  calls the generated `stopActivity` SDK operation, returning the observed result.
- The generated SDK calls
  `POST /api/v1/projects/{projectId}/activities/{activityId}/stop`. The backend's
  `src/routes/activities.ts` and `docs/STOP_ACTIVITY_CONTRACT.md` distinguish this
  permanent, awaited stop from the resumable interrupt at `/abort`.
- `docs/stop-activity-coordination.md` documents the existing shared web/native
  approval card and the embedded App's person-initiated stop contract. An app
  confirms before sending; the bridge itself does not create a confirmation.
- As a concrete existing surface, the knowledge project's `viewer/index.html`
  lists activities, offers Stop followed by an inline confirmation, awaits
  `Transport.stopActivity`, and reports its outcome. This is evidence of an
  existing App implementation, not proof that every project App offers Stop.

## Reasons

1. There is no existing generic activity row on which to add the requested
   control. Adding a shell list, drawer or screen would introduce a new product
   surface and routing, rather than add a missing button to one already shown.
2. A project can have several activities. A Stop on its aggregate badge would
   need an unspecified selection or stop-all policy and could end unintended
   work, including children started by the selected activity.
3. The existing App has the domain context to identify work and distinguish
   Pause from permanent Stop. The shared bridge and web/native approval cards
   already provide the stop transport and agent-mediated control, respectively.
4. A generic list might improve discoverability or cover a missing/broken App,
   but those are distinct requirements. They are not established by this request
   and are not solved safely by guessing a Cancel placement.

## Boundaries and a future trigger

Do not replace `activities.abort` (Pause), imply that stopping a chat turn stops
its detached activities, or label a request as successfully stopped before its
result arrives. No runtime changes are made by this research.

Reopen as a **yes** if the product asks for activity oversight outside the App
(for example, access when an App is unavailable). Define the entry point, single
activity selection, queued/interrupted states, confirmation, progress/cost facts,
awaited teardown and partial/failed child outcomes first. Shared selection/state
logic belongs in `headless/`, with web and native presentation peers. Client
routing/adoption stories would then be needed wherever that entry point mounts;
the existing scoped backend route should be reused unless its contract changes.

## Verification scope

The decision is supported by source inspection; unit checks can verify the
existing bridge mapping and approval outcome handling, not establish the absence
of every possible screen. No live activity was stopped, no live credentials were
used, and no visual proof is needed because this change draws nothing. Actual
check results are recorded in the feature's developer-verification handover.
