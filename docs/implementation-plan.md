# Implementation plan

For the layer rules, conventions, and how consumers should use this package, see [ARCHITECTURE.md](./ARCHITECTURE.md). For setup, see [README.md](../README.md).

This file is the open-work backlog: real tasks plus their blockers. If a task is done it gets removed (git history keeps the record).

---

## A. Open questions / blocked tasks

_(Empty — no items currently blocked on external decisions.)_

---

## B. Pending tasks

### Native target — starts when an RN consumer exists

When an RN app is on the roadmap:

- **Split `src/web/` → `src/web/` + `src/native/`.** Introduce `src/native/` parallel to `src/web/` with matching component names. `tokens/` and `headless/` stay shared. The `exports` map adds `./native` and `./native/styles` (StyleSheet objects, not CSS). Add `react-native` to peer deps as optional. Public APIs stay identical so consumer code is platform-agnostic.
- **Headless promotions.** As the RN target needs headless versions of `Tooltip` positioning, `Toast` queue, `Modal` focus-trap, etc., promote those state machines from `web/` into `headless/`. Trigger is genuine duplication between `web/` and `native/` implementations.
