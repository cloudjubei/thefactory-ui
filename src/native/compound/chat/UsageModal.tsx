import { ScrollView, Text, View } from 'react-native'

import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface UsageModelRow {
  model: string
  /** Total cost for this model, in USD. */
  costUSD: number
  /** Optional token breakdown. */
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
}

export interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
  /** Durable (persisted cost ledger) breakdown grouped by model. */
  rows: ReadonlyArray<UsageModelRow>
  /** Total across all models in the durable ledger. */
  totalCostUSD: number
  /**
   * In-memory "current" breakdown — usage aggregated from the messages
   * currently loaded in the chat. Mirrors web's `CURRENT` section: useful
   * when the durable ledger persists across chat clears, so the user can
   * see what's been spent on just the visible conversation. Omit to hide
   * the section entirely.
   */
  currentRows?: ReadonlyArray<UsageModelRow>
  /** Total across all models in the in-memory current breakdown. */
  currentTotalCostUSD?: number
  /**
   * Optional per-executor (API / CLI) breakdown — the caller maps the
   * aggregate's `bySource` into rows labelled "API" / "CLI". Mirrors web's
   * "By executor" section. Omit to hide.
   */
  sourceRows?: ReadonlyArray<UsageModelRow>
  title?: string
}

function formatUSD(n: number) {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toFixed(4)}`
}

function formatTokens(n?: number) {
  if (n == null) return '—'
  return Math.round(n).toLocaleString()
}

function pct(num: number, denom: number) {
  if (denom <= 0) return 0
  return Math.round((num / denom) * 100)
}

/**
 * Native peer of [web's `UsageModal`](../../../web/compound/UsageModal.tsx).
 * Lays out the durable cost ledger as a fixed table: TOTALS row first, then
 * one row per model. Column labels match web exactly — Group · Cost · Tokens
 * · Prompt · Completion · Cached read — and the modal renders the same
 * preface / footer copy so this screen reads identically on both clients.
 *
 * Mobile-specific scoping: web also surfaces an in-memory "CURRENT" section
 * derived from a `messages` array. Mobile callers don't pass messages
 * (StoriesListView / StoryDetailsView only read the persisted ledger via
 * `getCost`), so this peer focuses solely on the durable section. Adding a
 * matching CURRENT section is a strict additive extension once mobile gains
 * a callsite with messages — no behaviour to remove here.
 */
export default function UsageModal({
  isOpen,
  onClose,
  rows,
  totalCostUSD,
  currentRows,
  currentTotalCostUSD,
  sourceRows,
  title = 'Usage',
}: UsageModalProps) {
  const { theme } = useNativeTheme()
  const hasCurrent = !!currentRows && currentRows.length > 0
  const hasSource = !!sourceRows && sourceRows.length > 0
  const sourceTotal = (sourceRows ?? []).reduce((sum, r) => sum + r.costUSD, 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" contentStyle={{ padding: 0 }}>
      <ScrollView
        style={{ backgroundColor: theme.surface.base }}
        contentContainerStyle={{ paddingBottom: nativeSpace[6] }}
      >
        <UsageSection label="Ledger totals (durable)" rows={rows} totalCostUSD={totalCostUSD} />

        {hasSource ? (
          <>
            <DividerWithLabel label="BY EXECUTOR" />
            <UsageSection rows={sourceRows!} totalCostUSD={sourceTotal} />
          </>
        ) : null}

        {hasCurrent ? (
          <>
            <DividerWithLabel label="CURRENT" />
            <UsageSection
              rows={currentRows!}
              totalCostUSD={currentTotalCostUSD ?? 0}
            />
          </>
        ) : null}

        <View
          style={{
            paddingHorizontal: nativeSpace[6],
            paddingTop: nativeSpace[6],
            gap: nativeSpace[2],
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: theme.text.secondary,
              opacity: 0.8,
              lineHeight: 16,
            }}
          >
            If a message has no stored cost, cost is estimated using current pricing for that
            provider+model and the message&apos;s tokens.
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: theme.text.secondary,
              opacity: 0.8,
              lineHeight: 16,
            }}
          >
            Durable totals are computed from the persisted cost ledger for this &apos;chatKey&apos;
            and do not decrease if you clear/restart/delete a chat.
          </Text>
        </View>
      </ScrollView>
    </Modal>
  )
}

/**
 * One labelled table block (TOTALS row + breakdown). Used for both the
 * durable ledger and the in-memory current sections so they read 1:1.
 */
function UsageSection({
  label,
  rows,
  totalCostUSD,
}: {
  label?: string
  rows: ReadonlyArray<UsageModelRow>
  totalCostUSD: number
}) {
  const { theme } = useNativeTheme()
  const totalIn = rows.reduce((s, r) => s + (r.inputTokens ?? 0), 0)
  const totalOut = rows.reduce((s, r) => s + (r.outputTokens ?? 0), 0)
  const totalCached = rows.reduce((s, r) => s + (r.cachedTokens ?? 0), 0)
  return (
    <View>
      {label ? (
        <View style={{ paddingHorizontal: nativeSpace[6], paddingTop: nativeSpace[6] }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{label}</Text>
        </View>
      ) : null}
      <View style={{ paddingHorizontal: nativeSpace[6], paddingTop: nativeSpace[3] }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ minWidth: 720 }}>
              <HeaderRow />
              <TotalsRow
                costUSD={totalCostUSD}
                promptTokens={totalIn}
                completionTokens={totalOut}
                cachedTokens={totalCached}
              />
              {rows.map((row) => (
                <DataRow
                  key={row.model}
                  label={row.model}
                  costUSD={row.costUSD}
                  promptTokens={row.inputTokens ?? 0}
                  completionTokens={row.outputTokens ?? 0}
                  cachedTokens={row.cachedTokens ?? 0}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

/** Hairline divider with a centred CURRENT label — mirrors web's row. */
function DividerWithLabel({ label }: { label: string }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[3],
        paddingHorizontal: nativeSpace[6],
        paddingTop: nativeSpace[6],
      }}
    >
      <View
        style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }}
      />
      <Text
        style={{
          fontSize: 11,
          color: theme.text.secondary,
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      <View
        style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }}
      />
    </View>
  )
}

/** Each column is the same fixed 120 px slot (matches web's table-fixed grid
 *  where every column shares the same width); reads cleanly horizontally and
 *  the inner ScrollView absorbs the overflow on narrower phones. */
const COL_WIDTH = 120

const cellBase = {
  width: COL_WIDTH,
  paddingHorizontal: nativeSpace[3],
  paddingVertical: nativeSpace[3],
} as const

function HeaderRow() {
  const { theme } = useNativeTheme()
  const t = theme
  const text = {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.text.secondary,
    textAlign: 'center' as const,
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.surface.raised,
        borderBottomWidth: 1,
        borderBottomColor: t.border.subtle,
      }}
    >
      <Text style={[cellBase, text]}>Group</Text>
      <Text style={[cellBase, text]}>Cost</Text>
      <Text style={[cellBase, text]}>Tokens</Text>
      <Text style={[cellBase, text]}>Prompt</Text>
      <Text style={[cellBase, text]}>Completion</Text>
      <Text style={[cellBase, text]}>Cached read</Text>
    </View>
  )
}

function DataRow({
  label,
  costUSD,
  promptTokens,
  completionTokens,
  cachedTokens,
  emphasized = false,
}: {
  label: string
  costUSD: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  emphasized?: boolean
}) {
  const { theme } = useNativeTheme()
  const t = theme
  const totalTokens = promptTokens + completionTokens + cachedTokens
  const cachedRatio = pct(cachedTokens, promptTokens + cachedTokens)
  const num = {
    fontSize: 12,
    color: t.text.primary,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
    fontWeight: emphasized ? ('700' as const) : ('400' as const),
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: t.border.subtle,
        backgroundColor: emphasized ? t.surface.raised : 'transparent',
      }}
    >
      <Text
        style={[
          cellBase,
          { fontSize: 12, color: t.text.primary, fontWeight: emphasized ? '700' : '400' },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text style={[cellBase, num]} numberOfLines={1}>
        {formatUSD(costUSD)}
      </Text>
      <Text style={[cellBase, num]}>{formatTokens(totalTokens)}</Text>
      <Text style={[cellBase, num]}>{formatTokens(promptTokens)}</Text>
      <Text style={[cellBase, num]}>{formatTokens(completionTokens)}</Text>
      <View style={[cellBase]}>
        <Text style={num}>{formatTokens(cachedTokens)}</Text>
        <Text style={[num, { fontWeight: '400', color: t.text.secondary }]}>({cachedRatio}%)</Text>
      </View>
    </View>
  )
}

function TotalsRow({
  costUSD,
  promptTokens,
  completionTokens,
  cachedTokens,
}: {
  costUSD: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
}) {
  // The TOTALS row uses the same `DataRow` recipe (web folds totals into the
  // same tbody as breakdown rows) but with emphasized typography + raised bg.
  // The total-tokens column is derived from the same parts inside DataRow so
  // it can never disagree with the breakdown.
  return (
    <DataRow
      label="TOTALS"
      costUSD={costUSD}
      promptTokens={promptTokens}
      completionTokens={completionTokens}
      cachedTokens={cachedTokens}
      emphasized
    />
  )
}
