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

_None — every ready-to-execute task has shipped (git history keeps the record). Items in §A land here when their trigger fires._
