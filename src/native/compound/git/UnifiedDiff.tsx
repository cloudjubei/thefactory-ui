import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  annotateHunks,
  hunkLineRange,
  parseUnifiedDiffAnnotated,
  type IntraMode,
  type ParsedDiffHunk,
  type ParsedDiffLine,
} from '../../../headless/utils/diffAnnotate'
import { nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BinaryDiffView, { type BinaryDiffRecovery } from './BinaryDiffView'

export interface UnifiedDiffProps {
  /** Unified-diff patch body. */
  patch?: string
  /** Project-relative path — used only in the binary-diff view's copy. */
  path?: string
  /** When true, renders the binary-diff view (Before → After bytes) instead of the diff. */
  binary?: boolean
  /** Byte size of the before side — shown in the binary-diff view. */
  beforeSize?: number
  /** Byte size of the after side — shown in the binary-diff view. */
  afterSize?: number
  /**
   * On-demand recovery for a binary / unparseable file (the "quick fix"):
   * sanitize both sides in memory and return a text diff. Absent ⇒ no recovery
   * affordance, just the Before → After byte summary.
   */
  onRecoverText?: () => Promise<BinaryDiffRecovery>
  /** Persist the recovery — write the sanitized content back to the working tree. */
  onApplyTextRecovery?: () => void | Promise<{ removedBytes?: number } | void>
  /** Max height before the diff body scrolls vertically. Default 360. */
  maxHeight?: number
  /**
   * Above this many renderable lines the diff is gated behind a "Show
   * anyway" button. Mirrors web's `StructuredUnifiedDiff` `largeGuardLines`
   * (default 5000).
   */
  largeGuardLines?: number

  /** When true, long lines wrap inside the hunk body instead of producing
   *  a horizontal scroller. */
  wrap?: boolean
  /** Hide add/del pairs that only differ in whitespace. */
  ignoreWhitespace?: boolean
  /** Per-token highlighting on paired add/del lines. Default 'none'. */
  intra?: IntraMode

  /** Line-selection mode — when true, a leading checkbox column appears so
   *  the user can pick individual add/del lines for partial staging. The
   *  hunk header gets a tri-state checkbox covering all add/del lines in
   *  that hunk. */
  selectable?: boolean
  /** Set of selected line keys in `"hunkIndex:lineIndex"` form. */
  selectedLines?: Set<string>
  onToggleLineSelection?: (hunkIndex: number, lineIndex: number) => void
  onToggleHunkSelection?: (hunkIndex: number) => void

  /** Show per-hunk Stage/Unstage/Discard buttons in the hunk header. */
  isEditable?: boolean
  /** Drives the green "Stage Hunk" vs blue "Unstage Hunk" button label. */
  isStaged?: boolean
  onStageHunk?: (hunkIndex: number) => void
  onUnstageHunk?: (hunkIndex: number) => void
  onDiscardHunk?: (hunkIndex: number) => void

  /**
   * Render inline: no internal scroll wrapper, no fixed-height container.
   * Hunks stack vertically and the parent (a chat preview sheet, etc.)
   * provides the scroll. `maxHeight` / `stickyHeaderIndices` are ignored
   * in this mode — sticky hunk headers aren't meaningful when there's no
   * inner scroll to pin against, and the parent scroller already lets the
   * user reach every hunk. Default `false` (Git pane behaviour).
   */
  inline?: boolean
}

const LINE_BG: Record<ParsedDiffLine['type'], string> = {
  add: 'rgba(22,163,74,0.12)',
  del: 'rgba(220,38,38,0.12)',
  ctx: 'transparent',
  meta: 'transparent',
}
const GUTTER: Record<ParsedDiffLine['type'], string> = {
  add: '+',
  del: '-',
  ctx: ' ',
  meta: ' ',
}

const LINE_HEIGHT = 18
const LINE_NUM_COL_W = 30
const MARKER_COL_W = 14
const CHECKBOX_COL_W = 22

/**
 * Native peer of web's `StructuredUnifiedDiff`. Each hunk renders as a
 * sticky header (Stage / Unstage / Discard + line-range caption) followed
 * by a body where the line-number gutter + marker stay pinned to the left
 * and only the text content scrolls horizontally — same layout as web.
 *
 * Multiple sticky headers stack: while a hunk's body scrolls under, its
 * header stays at the top until the next hunk's header pushes it out, just
 * like CSS `position: sticky` on web.
 */
export default function UnifiedDiff({
  patch,
  path,
  binary,
  beforeSize,
  afterSize,
  onRecoverText,
  onApplyTextRecovery,
  maxHeight = 360,
  largeGuardLines = 5000,
  wrap = false,
  ignoreWhitespace = false,
  intra = 'none',
  selectable = false,
  selectedLines,
  onToggleLineSelection,
  onToggleHunkSelection,
  isEditable = false,
  isStaged = false,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  inline = false,
}: UnifiedDiffProps) {
  const { theme } = useNativeTheme()
  const hunksRaw = useMemo<ParsedDiffHunk[]>(
    () => (patch ? parseUnifiedDiffAnnotated(patch) : []),
    [patch],
  )
  const hunks = useMemo(
    () => annotateHunks(hunksRaw, { ignoreWhitespace, intra }),
    [hunksRaw, ignoreWhitespace, intra],
  )
  const totalRenderableLines = useMemo(
    () =>
      hunks.reduce(
        (acc, h) => acc + h.lines.filter((l) => l.type !== 'meta' && !l._hidden).length,
        0,
      ),
    [hunks],
  )
  // Per-mount bypass — navigating to a new diff resets the gate.
  const [guardBypass, setGuardBypass] = useState(false)

  if (binary) {
    return (
      <BinaryDiffView
        path={path ?? ''}
        reason="binary"
        beforeSize={beforeSize}
        afterSize={afterSize}
        onRecover={onRecoverText}
        onApplyRecovery={onApplyTextRecovery}
        wrap={wrap}
        ignoreWhitespace={ignoreWhitespace}
        intra={intra}
      />
    )
  }
  if (!patch) {
    // Empty / missing patch — the consumer's surrounding chrome already
    // covers this; in standalone mode show a generic copy.
    if (inline) return null
    return <Placeholder text="No changes to display." />
  }
  if (hunks.length === 0) {
    // Non-empty patch that didn't parse into any hunks — not a real unified
    // diff (often a binary/corrupted file). Offer the same recovery view as a
    // genuine binary so the user can quick-fix a text file with stray bytes.
    return (
      <BinaryDiffView
        path={path ?? ''}
        reason="unparseable"
        beforeSize={beforeSize}
        afterSize={afterSize}
        onRecover={onRecoverText}
        onApplyRecovery={onApplyTextRecovery}
        wrap={wrap}
        ignoreWhitespace={ignoreWhitespace}
        intra={intra}
      />
    )
  }
  if (!guardBypass && totalRenderableLines > largeGuardLines) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: 6,
          padding: nativeSpace[4],
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 13, color: theme.text.primary }}>
          Diff is very large ({totalRenderableLines} lines). Showing it might freeze the UI.
        </Text>
        <Pressable
          onPress={() => setGuardBypass(true)}
          accessibilityRole="button"
          accessibilityLabel="Show large diff anyway"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            backgroundColor: pressed ? theme.surface.hover : theme.surface.muted,
          })}
        >
          <Text style={{ fontSize: 12, color: theme.text.primary }}>Show anyway</Text>
        </Pressable>
      </View>
    )
  }

  // Flatten hunks into a `[header, body, header, body, …]` list so
  // ScrollView's `stickyHeaderIndices` can pin each header until the next
  // one replaces it — RN's equivalent of `position: sticky` stacking.
  const children: ReactNode[] = []
  const stickyIndices: number[] = []
  hunks.forEach((hunk, hi) => {
    stickyIndices.push(children.length)
    children.push(
      <HunkHeader
        key={`h-${hi}`}
        hunk={hunk}
        hunkIndex={hi}
        selectable={selectable}
        selectedLines={selectedLines}
        onToggleHunkSelection={onToggleHunkSelection}
        isEditable={isEditable}
        isStaged={isStaged}
        onStageHunk={onStageHunk}
        onUnstageHunk={onUnstageHunk}
        onDiscardHunk={onDiscardHunk}
      />,
    )
    children.push(
      <HunkBody
        key={`b-${hi}`}
        hunk={hunk}
        hunkIndex={hi}
        wrap={wrap}
        selectable={selectable}
        selectedLines={selectedLines}
        onToggleLineSelection={onToggleLineSelection}
      />,
    )
  })

  if (inline) {
    // Parent owns the vertical scroll — stack hunks directly so the diff
    // sizes to its content and an outer ScrollView can reach every line.
    // `width: '100%'` + `alignSelf: 'stretch'` are load-bearing: without a
    // definite cross-axis width here each `HunkBody` row's inner
    // horizontal `ScrollView` (with `flex: 1`) has no space to claim, the
    // row sizes to its children's intrinsic widths, and long lines push
    // every hunk wide instead of scrolling within their own ScrollView.
    return <View style={{ width: '100%', alignSelf: 'stretch' }}>{children}</View>
  }

  return (
    <View style={{ flex: 1, maxHeight }}>
      <ScrollView nestedScrollEnabled stickyHeaderIndices={stickyIndices}>
        {children}
      </ScrollView>
    </View>
  )
}

function HunkHeader({
  hunk,
  hunkIndex,
  selectable,
  selectedLines,
  onToggleHunkSelection,
  isEditable,
  isStaged,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: {
  hunk: ParsedDiffHunk
  hunkIndex: number
  selectable: boolean
  selectedLines?: Set<string>
  onToggleHunkSelection?: (hunkIndex: number) => void
  isEditable: boolean
  isStaged: boolean
  onStageHunk?: (hunkIndex: number) => void
  onUnstageHunk?: (hunkIndex: number) => void
  onDiscardHunk?: (hunkIndex: number) => void
}) {
  const { theme } = useNativeTheme()
  const range = useMemo(() => hunkLineRange(hunk), [hunk])
  const { allSelected, anySelected } = useMemo(() => {
    const modIdxs = hunk.lines
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.type === 'add' || l.type === 'del')
      .map(({ idx }) => idx)
    if (modIdxs.length === 0) return { allSelected: false, anySelected: false }
    let sel = 0
    for (const idx of modIdxs) {
      if (selectedLines?.has(`${hunkIndex}:${idx}`)) sel++
    }
    return { allSelected: sel === modIdxs.length, anySelected: sel > 0 }
  }, [hunk, hunkIndex, selectedLines])

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[2],
        backgroundColor: theme.surface.muted,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      {selectable ? (
        <SelectionCheckbox
          state={allSelected ? 'checked' : anySelected ? 'mixed' : 'unchecked'}
          onPress={() => onToggleHunkSelection?.(hunkIndex)}
          accessibilityLabel={`Select hunk ${hunkIndex + 1}`}
        />
      ) : null}
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: theme.text.secondary,
        }}
      >
        Hunk {hunkIndex + 1}:
      </Text>
      <Text style={{ fontSize: 10, color: theme.text.muted }}>
        Lines {range.start}–{range.end}
      </Text>
      <View style={{ flex: 1 }} />
      {isEditable ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ActionPill
            label={isStaged ? 'Unstage Hunk' : 'Stage Hunk'}
            tone={isStaged ? 'blue' : 'green'}
            onPress={() => (isStaged ? onUnstageHunk?.(hunkIndex) : onStageHunk?.(hunkIndex))}
          />
          <ActionPill label="Discard Hunk" tone="red" onPress={() => onDiscardHunk?.(hunkIndex)} />
        </View>
      ) : null}
    </View>
  )
}

function HunkBody({
  hunk,
  hunkIndex,
  wrap,
  selectable,
  selectedLines,
  onToggleLineSelection,
}: {
  hunk: ParsedDiffHunk
  hunkIndex: number
  wrap: boolean
  selectable: boolean
  selectedLines?: Set<string>
  onToggleLineSelection?: (hunkIndex: number, lineIndex: number) => void
}) {
  const { theme } = useNativeTheme()
  const LINE_FG: Record<ParsedDiffLine['type'], string> = {
    add: nativePalette.green[700],
    del: nativePalette.red[700],
    ctx: theme.text.secondary,
    meta: theme.text.muted,
  }
  // Original (full) line indices for each visible line so selection keys
  // stay aligned with the unfiltered hunk model `generateSelectedPatch`
  // expects.
  const visible = useMemo(() => {
    return hunk.lines
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => !l._hidden && l.type !== 'meta')
  }, [hunk])

  // Fixed (non-scrolling) left column: checkbox? + line numbers + marker.
  // Rendered once per visible line, height-matched to the text rows.
  const fixedColumn = (
    <View>
      {visible.map(({ l, idx }) => {
        const isSelectable = l.type === 'add' || l.type === 'del'
        const checked = selectedLines?.has(`${hunkIndex}:${idx}`) ?? false
        return (
          <View
            key={`fix-${idx}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: LINE_HEIGHT,
              backgroundColor: LINE_BG[l.type],
              borderRightWidth: 1,
              borderRightColor: theme.border.subtle,
            }}
          >
            {selectable ? (
              <View
                style={{
                  width: CHECKBOX_COL_W,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelectable ? (
                  <SelectionCheckbox
                    state={checked ? 'checked' : 'unchecked'}
                    onPress={() => onToggleLineSelection?.(hunkIndex, idx)}
                    accessibilityLabel={`Select line ${idx + 1} of hunk ${hunkIndex + 1}`}
                  />
                ) : null}
              </View>
            ) : null}
            <Text
              style={{
                width: LINE_NUM_COL_W,
                textAlign: 'right',
                paddingRight: 4,
                fontFamily: 'Menlo',
                fontSize: 10,
                color: theme.text.muted,
              }}
            >
              {l.oldLine ?? ''}
            </Text>
            <Text
              style={{
                width: LINE_NUM_COL_W,
                textAlign: 'right',
                paddingRight: 4,
                fontFamily: 'Menlo',
                fontSize: 10,
                color: theme.text.muted,
              }}
            >
              {l.newLine ?? ''}
            </Text>
            <Text
              style={{
                width: MARKER_COL_W,
                textAlign: 'center',
                fontFamily: 'Menlo',
                fontSize: 10,
                color: LINE_FG[l.type],
                opacity: 0.7,
              }}
            >
              {GUTTER[l.type]}
            </Text>
          </View>
        )
      })}
    </View>
  )

  // Scrollable (or wrap-flexed) text column. In wrap mode each row is
  // `flex: 1` and the column stays inside the row layout. In no-wrap mode
  // the column lives inside a horizontal ScrollView so long lines extend
  // out and only that column scrolls.
  const textRows = (
    <View style={wrap ? { flex: 1 } : undefined}>
      {visible.map(({ l }, vi) => (
        <View
          key={`txt-${vi}`}
          style={{
            minHeight: LINE_HEIGHT,
            justifyContent: 'center',
            backgroundColor: LINE_BG[l.type],
            paddingHorizontal: 4,
            ...(wrap ? { flex: 1 } : {}),
          }}
        >
          <Text
            style={{
              fontFamily: 'Menlo',
              fontSize: 11,
              color: LINE_FG[l.type],
              ...(wrap ? { flexShrink: 1 } : {}),
            }}
          >
            {l._markup ? <MarkupText segs={l._markup} /> : <Text>{l.text}</Text>}
          </Text>
        </View>
      ))}
    </View>
  )

  return (
    <View style={{ flexDirection: 'row' }}>
      {fixedColumn}
      {wrap ? (
        textRows
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          nestedScrollEnabled
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingRight: 4 }}
        >
          {textRows}
        </ScrollView>
      )}
    </View>
  )
}

function ActionPill({
  label,
  tone,
  onPress,
}: {
  label: string
  tone: 'green' | 'blue' | 'red'
  onPress: () => void
}) {
  const bg = tone === 'green' ? '#16a34a' : tone === 'blue' ? '#2563eb' : '#dc2626'
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 3,
        borderRadius: nativeRadii[2],
        backgroundColor: bg,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontSize: 10, fontWeight: '600', color: '#ffffff' }}>{label}</Text>
    </Pressable>
  )
}

function SelectionCheckbox({
  state,
  onPress,
  accessibilityLabel,
}: {
  state: 'checked' | 'unchecked' | 'mixed'
  onPress: () => void
  accessibilityLabel: string
}) {
  const { theme } = useNativeTheme()
  const isOn = state !== 'unchecked'
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === 'checked' }}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: isOn ? theme.accent.primary : theme.border.strong,
        backgroundColor: isOn ? theme.accent.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {state === 'checked' ? (
        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>✓</Text>
      ) : state === 'mixed' ? (
        <View
          style={{
            width: 7,
            height: 1.5,
            backgroundColor: '#fff',
            borderRadius: 1,
          }}
        />
      ) : null}
    </Pressable>
  )
}

function MarkupText({ segs }: { segs: NonNullable<ParsedDiffLine['_markup']> }) {
  // Render each segment as a `<Text>` child of the parent diff line —
  // intra-line highlighting (ins / del) is shown via background colour
  // matching web's `bg-green-300/40` and `bg-red-300/40` accents.
  return (
    <>
      {segs.map((s, i) => (
        <Text
          key={i}
          style={
            s.t === 'ins'
              ? { backgroundColor: 'rgba(34,197,94,0.4)' }
              : s.t === 'del'
                ? {
                    backgroundColor: 'rgba(239,68,68,0.4)',
                    textDecorationLine: 'line-through',
                  }
                : undefined
          }
        >
          {s.v}
        </Text>
      ))}
    </>
  )
}

function Placeholder({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        padding: nativeSpace[4],
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text.muted }}>{text}</Text>
    </View>
  )
}
