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
- **A new shared piece lands here first, then clients pull it in.** New consumer in any client → check `headless/` first; promote if it's a real second consumer. The "don't lift speculatively" rule in §B.4 still applies — but once a second consumer exists, lifting is mandatory, not optional.
- **Drift between clients is a bug in this package.** If web's `useFoo` diverges from desktop's `useFoo`, that's a missing `src/headless/useFoo.ts` waiting to happen. File the promotion ticket, don't accept the drift.

A new contributor opening web, desktop, and mobile side by side should be able to navigate by analogy. This package is the reason that's possible.

---

## A. Open questions / blocked tasks

*(Currently empty — the previous NativeWind-vs-StyleSheet question is resolved: NativeWind v4. See §B.2 and the mobile plan.)*

---

## B. Pending tasks

### 1. Split `src/web/` → `src/web/` + `src/native/`

Active task — mobile work is starting (see [thefactory-overseer-mobile/docs/implementation-plan.md](../../thefactory-overseer-mobile/docs/implementation-plan.md)).

- Introduce `src/native/` as a peer to `src/web/`. `tokens/` and `headless/` stay shared.
- The `exports` map gets `./native` and `./native/styles` entries; `./web` and `./web/styles` stay as they are.
- Add `react-native` to peer deps as optional (`peerDependenciesMeta: { "react-native": { optional: true } }`) so web/desktop consumers don't pull it in.
- The boundary check ([scripts/check-uikit-boundaries.sh](../scripts/check-uikit-boundaries.sh)) gets a new rule: `src/native/` may import `react`, `react-native`, `tokens/`, `headless/`; never `src/web/` or `react-dom`. Mirrors the existing web-side rule.
- The tsup config grows a `./native` entry pointing at `src/native/index.ts`.
- Public APIs stay identical between web and native peers: a consumer that does `import { Button } from 'thefactory-ui/web'` can swap to `'thefactory-ui/native'` and get the same prop surface.

### 2. RN primitives (native siblings of `src/web/primitives/`)

In order of dependency:

- `Button`, `Input`, `Textarea`, `Switch`, `Field`, `Alert`, `Spinner`, `Skeleton`, `SkeletonText`.
- `Modal` (uses RN's `Modal`), `Tooltip` (long-press affordance), `Toast` (uses an absolute-positioned overlay).
- `SegmentedControl`, `Select` (composes RN `ActionSheetIOS` / `Picker` under the hood — exposes the same `value` / `onValueChange` surface as web's Select).
- `ResizeHandle` is web-only (no equivalent on mobile); native gets no peer.

Each primitive lands together with its web peer's test coverage — `headless` hooks already drive the behaviour; the native impl is presentation only.

### 3. RN compounds (native siblings of `src/web/compound/`)

The compounds reuse the headless state machines already in `src/headless/` so the native impl is largely presentation. Order roughly by how much value they unlock for mobile screens:

- Chat surface: `MessageList`, `MessageRow`, `ChatInput`, `ChatBody`, `ChatHeader`, `ChatSettingsDropdown`, `ToolCallCard`, `ToolCallHoverCard`, `ThinkingRow`, `SystemPromptBubble`.
- Stories: `StoryCard`, `FeatureCard`, `StoryForm`, `FeatureForm` (already use `useStoryForm` / `useFeatureForm` headless hooks), `DependencyChip`, `DependencyBullet`, `ContextFileChip`, `StoryAndFeatureCallout`, `WarningChip`, `ExclamationChip`.
- Agents: `AgentRunRowCard`, `AgentRunBullet`, `AgentModelQuickSelect`.
- Files: `FileDisplay`, `FileSelector`, `PathDisplay`, `RichText` (use `react-native-markdown-display` or similar for markdown).
- Groups + nav: `GroupHome`, `NotificationBadge`, `SpinnerWithDot`, `DotBadge`, `BranchChip`, `ProjectChip`, `StatusChip`, `ModelChip`, `CostChip`, `TokensChip`, `TurnChip`.
- Diff / merge: `DiffViewer`, `MergeConflictResolver` — these are large enough that they may stay web-only initially. The conflict-safe editing flow in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md) is the natural pull-forward trigger.

### 4. Headless promotions triggered by mobile

As `src/native/` peers are written, anything currently entangled in `src/web/` that needs to be shared between web and native gets lifted into `src/headless/`. Concrete candidates already identified:

- **`useTooltip`** — position calculation + open/close state. Currently in `src/web/primitives/Tooltip.tsx`. Native variant doesn't need positioning (long-press shows an overlay), but shares the open/close state machine.
- **`useToastQueue`** — append-with-dismiss queue. The render side differs (DOM vs RN view); the queue logic doesn't.
- **`useModalFocusTrap`** — only meaningful on web (RN's `Modal` handles focus). Stays web-only.
- **`useDiff`** — the three-way merge algorithm currently inside `MergeConflictResolver` and tightly coupled to its UI. Worth lifting so the mobile (and the in-progress conflict-safe-editing flow in web) can reuse it. Tracked here as the natural shared piece for the lift mentioned in [thefactory-overseer-web/docs/implementation-plan.md § B](../../thefactory-overseer-web/docs/implementation-plan.md#b-conflict-safe-editing--mid-flight-remote-updates-in-filepane).
- **`useFileMentions`** — `@`-mention popover state machine, currently inside web's `FileMentionsTextarea`. Native textarea needs the same suggestions logic.

Promotion trigger: a real second consumer in `src/native/` would need the same code. Don't lift speculatively.

### 5. Tokens → RN StyleSheet bridge

`src/tokens/` already authors palette + semantic + metrics in pure TS. For RN consumption:

- Add `src/tokens/native.ts` that re-exports the same TS source as RN-friendly objects (numeric metrics in `dp`, colors as hex strings).
- A NativeWind preset bound to these tokens so `bg-(--surface-base)` class strings resolve to the right colour on both platforms. The CSS-variable form stays the source of truth; the RN preset is a generated mirror.

### 6. Per-platform exports + bundler hints

- The package's `exports` map gets:
  - `"./native": { "types": "./dist/native/index.d.ts", "import": "./dist/native/index.js", "react-native": "./dist/native/index.js" }`
  - `"./native/styles": "./dist/native/styles.js"` (the NativeWind preset entry)
- Add `"react-native"` to peer deps (optional, see §B.1).
- `tsup` config grows the `./native` entry. The CSS pipeline stays web-only — RN doesn't ship `.css`.

### 7. Documentation pass

- `docs/ARCHITECTURE.md` already describes the four-layer split; update the `native` row's "_(future)_" tag once the native folder exists with at least one primitive.
- README gets a "Use from React Native" section pointing at `'thefactory-ui/native'` + the NativeWind setup snippet.

---

## C. Non-goals

- Storybook. Visual verification stays `npm run build` + `playground/` smoke run + consumer integration. RN consumers verify in EAS Build + simulator.
- A web↔native style-conversion CLI. The two platforms write their own peers; they don't share a single source for layout. Tokens are shared, components aren't.
- A single CSS bundle that works in both web and native. The styling pipelines stay separate (`src/web/styles/*.css` + Tailwind v4 on web; NativeWind on native).
- Promoting `MergeConflictResolver` or `DiffViewer` to native before a real RN consumer asks. See §B.3.
- A second design system. The whole point of this package is one set of tokens + components across desktop, web, and mobile.
