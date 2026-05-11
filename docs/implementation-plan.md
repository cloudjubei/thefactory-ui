# Implementation plan

For the layer rules, decisions, conventions, and what's already shipped, see [ARCHITECTURE.md](./ARCHITECTURE.md). For setup, see [README.md](../README.md).

This file is the open-work backlog. Each entry is sized so a contributor can pick it up and start without waiting on a third-party decision.

---

## A. Open questions

_(Empty — all earlier open questions resolved and moved to ARCHITECTURE.md.)_

---

## B. Pending tasks

### Wire `overseer-local` (Electron renderer) _(in progress — driven from [overseer-local/docs/conversion-plan.md](../../overseer-local/docs/conversion-plan.md))_

> **Status.** The conversion is being driven screen-by-screen from inside `overseer-local`, not from this side. The detailed step-by-step plan, deferred swaps, and accepted divergences live at [overseer-local/docs/conversion-plan.md](../../overseer-local/docs/conversion-plan.md). This entry is now a pointer + a place to record upstream changes made to `thefactory-ui` during the conversion.
>
> When the conversion drains (every screen migrated, `src/renderer/src/components/ui/` reduced to Electron-specific bits), tick this entry off and proceed to publish.

### Upstream fixes landed during the `overseer-local` conversion

Recording what changed in `thefactory-ui` itself while the conversion has been running. New entries get appended as conversion steps surface gaps.

- **`Button` — fix icon + text stacking inside the wrapper span.** _2026-05-11._ The Button wraps children in a `<span>` (to support the loading-state opacity overlay). The span was `display: inline`, so SVG children (which Tailwind preflight sets to `display: block`) broke onto their own line. Changed the wrapper to `inline-flex items-center gap-2`. [src/web/primitives/Button.tsx](../src/web/primitives/Button.tsx).
- **`ConfirmDialog` — add `closeOnOverlayClick` and `closeOnEsc` props.** _2026-05-11._ The dialog had no way to disable overlay / Escape dismissal. `overseer-local`'s discard-confirm needed sticky behaviour. Threaded through to the inner `Modal`. [src/web/primitives/Modal.tsx](../src/web/primitives/Modal.tsx).
- **`FileSelector` — switch to arb-value CSS-var classes for the selected-row checkmark.** _2026-05-12._ The checkmark used `bg-brand-600`/`border-brand-600` which require the consumer's Tailwind to register the package's `@theme inline { --color-brand-N }` block; that didn't fire reliably in `overseer-local`. Switched to `bg-(--color-brand-600)`/`border-(--color-brand-600)`. Same rule for any future custom-palette utility — recorded in [ARCHITECTURE.md](./ARCHITECTURE.md) under Conventions.

### Lift-when-needed primitives

The `thefactory-overseer-web` parity backlog flagged a handful of patterns that _might_ belong here once duplication is real:

- **`StoryCardChips`** — `StatusChip` + feature-count chip + blocker chip cluster. Currently rendered inline in both list and board cells. Lift only if both surfaces share the same JSX after the parity restyle (web Task 3); otherwise it's a screen-side composite.
- **`IconRail`** — vertical 60 px-wide column of icon buttons (the `overseer-local` Git actions panel pattern). Lift only when a second screen needs the same shape; otherwise it stays in the web app's Git view (web Task 6).
- **`DateStrip` + Gantt row primitive** — the time-axis header + cell-rectangle row from the timeline rewrite (web Task 10). Lift only when a second consumer needs them.

These are signals, not commitments. **Don't preemptively extract** — wait for the second consumer to surface, then lift in a single PR with the migration of both call-sites.

### Native target (deferred until an RN consumer exists — don't preemptively start)

4. **Split `src/web/` → `src/web/` + `src/native/`.** When the RN app starts, introduce `src/native/` parallel to `src/web/` with matching component names. `tokens/` and `headless/` stay shared. The `exports` map adds `./native` and `./native/styles` (StyleSheet objects, not CSS). Add `react-native` to peer deps as optional. Public APIs stay identical so consumer code is platform-agnostic.

5. **Headless promotions.** As the RN target asks for headless versions of Tooltip positioning, Toast queue, Modal focus-trap, etc., promote those state machines from `web/` into `headless/`. Trigger is genuine duplication between `web/` and `native/` implementations — never preemptive.
