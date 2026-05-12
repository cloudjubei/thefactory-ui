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
- **`FileMentionsTextarea` — added `#`-references support and accept callbacks.** _2026-05-12._ The package primitive previously handled only `@`-file mentions. Added a parallel `#`-reference flow: a new [src/web/compound/files/reference.ts](../src/web/compound/files/reference.ts) with `parseReference` / `applyReference` / `ReferenceParse` / `ReferenceSuggestion`; a second optional `onSearchReferences?: (token) => ReferenceSuggestion[]` callback on `FileMentionsTextareaProps`; a second dropdown (mutually exclusive with the `@`-dropdown — the caret is only ever in one active token). Also added `onAcceptFileMention?(path)` and `onAcceptReference?(value)` callbacks that fire AFTER the user confirms a suggestion, so consumers can run side effects (overseer-local pushes the file path into a feature's context-files and the ref into its blockers). Backward compatible — consumers that don't pass `onSearchReferences` get an `@`-only textarea exactly as before.
- **`Spinner` — add optional `label?: string` prop.** _2026-05-12._ When set, the spinner returns an `inline-flex` row of the SVG + a muted-text caption ("Loading preview…"). When omitted, the bare SVG renders as before (no layout change). Four chat-side call sites in `overseer-local` use it for indeterminate loading captions. [src/web/primitives/Spinner.tsx](../src/web/primitives/Spinner.tsx).
- **`FileMentionsTextarea` — use raw `<textarea>` and accept `style` + `id`.** _2026-05-12._ The primitive previously rendered the shared `<Textarea>` primitive, which adds `rounded-md border bg-surface-raised` — those fight chat-input cards that already provide their own border + background. Switched to a raw `<textarea>` with minimal defaults (`w-full bg-transparent text-(--text-primary) outline-none resize-none`); the consumer's `className` is appended. Added `style?: CSSProperties` and `id?: string` props forwarded straight to the textarea — needed for `maxHeight` styling and `<label htmlFor>` wiring. Discovered while fixing chat-input regressions in overseer-local (scrollbar-in-scrollbar, mention dropdown clipped by an outer `overflow-y: auto` wrapper, double border around the textarea).
- **`Modal` — restore `contentClassName?: string` prop.** _2026-05-12._ The body wrapper has `flex-grow overflow-y-auto p-4` by default. Consumers that want full-bleed content (e.g. modals whose first child has its own padded background) need to drop the `p-4`. Reintroduced the `contentClassName` prop so callers can append e.g. `'!p-0'` to override the padding without giving up the flex-grow + scroll behaviour. The default `p-4` is unchanged.
- **`Markdown` — port the legacy `components` map verbatim into the package.** _2026-05-12._ First attempt was to match styling via CSS bumps to `.markdown-content`; that wasn't enough — `.markdown-content X` selectors had higher specificity than a single Tailwind utility, so the consumer-side Tailwind classes from the legacy `MarkdownMessage` wrapper (still used elsewhere) were silently overridden. Ported the full local `components` map into the package's `<Markdown>` — h1/h2 are `font-bold` with bottom border, h3–h6 `font-semibold`, paragraphs `my-1 leading-relaxed`, lists `list-disc/decimal list-outside ml-6 mb-4 space-y-1`, list items `mb-1`, fenced code `p-4 rounded-md my-4 bg-(--surface-muted)`, inline code `bg-(--surface-muted) px-1 py-px rounded text-[0.9em] font-mono`, tables wrapped in an overflow-x scroller with the box-styled border, blockquote / hr / strong / a all matching the legacy classnames. The `.markdown-content` CSS now keeps only container-level rules (overflow-wrap, inline-code break behaviour, GFM checkbox margin) so it can't fight the component map. [src/web/compound/Markdown.tsx](../src/web/compound/Markdown.tsx), [src/web/styles/components/markdown.css](../src/web/styles/components/markdown.css).
- **Icons — ported `IconBack`, `IconCode`, `IconCollection`, `IconDocument`, `IconNotAllowed`, `IconRefreshChat`, `IconScroll`, `IconStop`.** _2026-05-12._ Lifted from `overseer-local/components/ui/icons/Icons.tsx` and exported via [src/web/icons/index.ts](../src/web/icons/index.ts). Closes the temporary mixed-import workaround in overseer-local; all chat / stories / sidebar / files consumers now use only the package's icon barrel.
- **`Markdown` — add `allowHtml?: boolean` opt-in.** _2026-05-12._ Most chat content shouldn't render raw HTML, but `.md` file preview / editor surfaces in overseer-local rely on it (literal `<details>`, `<br>`, etc.). When set, the prop plugs `rehype-raw` + `rehype-sanitize` into the rehype chain with a permissive schema (`className`, `target`, `rel` allowed); default remains `false` so chat content is unaffected. Added `rehype-raw` + `rehype-sanitize` to package dependencies. [src/web/compound/Markdown.tsx](../src/web/compound/Markdown.tsx).

### Lift-when-needed primitives

The `thefactory-overseer-web` parity backlog flagged a handful of patterns that _might_ belong here once duplication is real:

- **`StoryCardChips`** — `StatusChip` + feature-count chip + blocker chip cluster. Currently rendered inline in both list and board cells. Lift only if both surfaces share the same JSX after the parity restyle (web Task 3); otherwise it's a screen-side composite.
- **`IconRail`** — vertical 60 px-wide column of icon buttons (the `overseer-local` Git actions panel pattern). Lift only when a second screen needs the same shape; otherwise it stays in the web app's Git view (web Task 6).
- **`DateStrip` + Gantt row primitive** — the time-axis header + cell-rectangle row from the timeline rewrite (web Task 10). Lift only when a second consumer needs them.

These are signals, not commitments. **Don't preemptively extract** — wait for the second consumer to surface, then lift in a single PR with the migration of both call-sites.

### Native target (deferred until an RN consumer exists — don't preemptively start)

4. **Split `src/web/` → `src/web/` + `src/native/`.** When the RN app starts, introduce `src/native/` parallel to `src/web/` with matching component names. `tokens/` and `headless/` stay shared. The `exports` map adds `./native` and `./native/styles` (StyleSheet objects, not CSS). Add `react-native` to peer deps as optional. Public APIs stay identical so consumer code is platform-agnostic.

5. **Headless promotions.** As the RN target asks for headless versions of Tooltip positioning, Toast queue, Modal focus-trap, etc., promote those state machines from `web/` into `headless/`. Trigger is genuine duplication between `web/` and `native/` implementations — never preemptive.
