# Implementation plan

For the layer rules, conventions, and how consumers should use this package, see [ARCHITECTURE.md](./ARCHITECTURE.md). For setup, see [README.md](../README.md).

This file is the open-work backlog: real tasks plus their blockers. If a task is done it gets removed (git history keeps the record).

---

## Cross-client parity mandate (absolute requirement)

This package is the **spine** that holds the three frontend clients together: [thefactory-overseer-web](../../thefactory-overseer-web), [overseer-local](../../overseer-local) (desktop), and [thefactory-overseer-mobile](../../thefactory-overseer-mobile). The mandate, stated identically in each client's `docs/implementation-plan.md`:

**The three frontend clients — web, desktop, mobile — must mirror each other as closely as the host platform allows.** Side-by-side, they should read like the same app adapted to its surface, not three independent products.

What that means for this package specifically:

- **Tokens, headless hooks/stores, business logic, badge math, sanitisers, form state machines all live here.** If a piece of logic is needed by two clients, it lives in `src/headless/` (or `src/tokens/` for visual primitives), not duplicated in each client.
- **`src/web/` and `src/native/` are presentation peers with identical public APIs.** Same component name, same prop surface, same headless hook consumed underneath. Swapping `'thefactory-ui/web'` → `'thefactory-ui/native'` in a screen should compile and behave equivalently, modulo platform-required differences (e.g. native `Modal` vs DOM `Modal`).
- **A new shared piece lands here first, then clients pull it in.** New consumer in any client → check `headless/` first; promote if it's a real second consumer. Don't lift speculatively — but once a second consumer exists, lifting is mandatory, not optional.
- **Drift between clients is a bug in this package.** If web's `useFoo` diverges from desktop's `useFoo`, that's a missing `src/headless/useFoo.ts` waiting to happen. File the promotion ticket, don't accept the drift.

A new contributor opening web, desktop, and mobile side by side should be able to navigate by analogy. This package is the reason that's possible.

---

## A. Open questions / blocked tasks

*(Currently empty.)*

---

## B. Pending tasks

### 1. RN primitives — overlay group

The first batch (`Alert`, `Button`, `Field`, `Input`, `Skeleton` + `SkeletonText`, `Spinner`, `Switch`, `Textarea`) is already in `src/native/primitives/` and exported from the `./native` barrel. Remaining primitives, in dependency order:

- **`Modal`** — wraps RN's `Modal`. Same prop surface as web's: `isOpen`, `onClose`, `title`, `size`, `closeOnOverlayClick`, `closeOnEsc` (no-op on RN — back-button handled separately).
- **`Tooltip`** — long-press affordance instead of hover. The open/close state machine should be lifted into `src/headless/useTooltip.ts` so the two peers share it (see §B.3).
- **`Toast`** — absolute-positioned overlay above the active screen. The append-with-dismiss queue should be lifted into `src/headless/useToastQueue.ts` (see §B.3).

`ResizeHandle` is web-only — no native peer.

### 2. RN primitives — composite group

- **`SegmentedControl`** — wraps either RN's `SegmentedControlIOS` (deprecated; usually replaced by a community component) or a hand-rolled row of pressables. Exposes the same `value` / `onValueChange` / `options` surface as the web peer.
- **`Select`** — wraps an `ActionSheetIOS` / Android dialog under the hood. Exposes the Radix-style `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` + `SelectValue` composition shape that web's Select offers, adapted to the platform's modal presentation.

### 3. Headless promotions triggered by §B.1–2

As `src/native/` peers are written, anything currently entangled in `src/web/` that needs to be shared between web and native gets lifted into `src/headless/`. Concrete candidates:

- **`useTooltip`** — position calculation + open/close state. Currently in `src/web/primitives/Tooltip.tsx`. Native variant doesn't need positioning (long-press shows an overlay), but shares the open/close state machine.
- **`useToastQueue`** — append-with-dismiss queue. The render side differs (DOM vs RN view); the queue logic doesn't.
- **`useModalFocusTrap`** — only meaningful on web (RN's `Modal` handles focus). Stays web-only.
- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver` and tightly coupled to its UI. Worth lifting so the mobile (and the in-progress conflict-safe-editing flow in web) can reuse it. Tracked here as the natural shared piece for the lift mentioned in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md#b-conflict-safe-editing--mid-flight-remote-updates-in-filepane).
- **`useFileMentions`** — `@`-mention popover state machine, currently inside web's `FileMentionsTextarea`. Native textarea needs the same suggestions logic.

Promotion trigger: a real second consumer in `src/native/` would need the same code. Don't lift speculatively.

### 4. RN compounds (native siblings of `src/web/compound/`)

The compounds reuse the headless state machines already in `src/headless/` so the native impl is largely presentation. Order roughly by how much value they unlock for mobile screens:

- Chat surface: `MessageList`, `MessageRow`, `ChatInput`, `ChatBody`, `ChatHeader`, `ChatSettingsDropdown`, `ToolCallCard`, `ToolCallHoverCard`, `ThinkingRow`, `SystemPromptBubble`.
- Stories: `StoryCard`, `FeatureCard`, `StoryForm`, `FeatureForm` (already use `useStoryForm` / `useFeatureForm` headless hooks), `DependencyChip`, `DependencyBullet`, `ContextFileChip`, `StoryAndFeatureCallout`, `WarningChip`, `ExclamationChip`.
- Agents: `AgentRunRowCard`, `AgentRunBullet`, `AgentModelQuickSelect`.
- Files: `FileDisplay`, `FileSelector`, `PathDisplay`, `RichText` (use `react-native-markdown-display` or similar for markdown).
- Groups + nav: `GroupHome`, `NotificationBadge`, `SpinnerWithDot`, `DotBadge`, `BranchChip`, `ProjectChip`, `StatusChip`, `ModelChip`, `CostChip`, `TokensChip`, `TurnChip`.
- Diff / merge: `DiffViewer`, `MergeConflictResolver` — these are large enough that they may stay web-only initially. The conflict-safe editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) is the natural pull-forward trigger.

### 5. Documentation pass

- `docs/ARCHITECTURE.md` — drop the `_(future)_` tag on the `native` row of the layer table now that `src/native/` exists with primitives.
- `README.md` — add a "Use from React Native" section pointing at `'thefactory-ui/native'` + the NativeWind setup snippet (consumers add `node_modules/thefactory-ui/dist/native/**/*.{js,mjs}` to their Tailwind `content` array; `@import 'thefactory-ui/native/styles'` in their NativeWind-processed CSS provides the token variables).

---

## C. Non-goals

- Storybook. Visual verification stays `npm run build` + `playground/` smoke run + consumer integration. RN consumers verify in EAS Build + simulator.
- A web↔native style-conversion CLI. The two platforms write their own peers; they don't share a single source for layout. Tokens are shared, components aren't.
- A single CSS bundle that works in both web and native. The styling pipelines stay separate (`src/web/styles/*.css` + Tailwind v4 on web; NativeWind on native).
- Promoting `MergeConflictResolver` or `DiffViewer` to native before a real RN consumer asks. See §B.4.
- A second design system. The whole point of this package is one set of tokens + components across desktop, web, and mobile.
