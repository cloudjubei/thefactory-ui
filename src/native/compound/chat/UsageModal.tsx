import { ScrollView, Text, View } from 'react-native'

import { useUsageBreakdown } from '../../../headless/hooks/useUsageBreakdown'
import {
  USAGE_CURRENT_TITLE,
  USAGE_FOOTNOTES,
  USAGE_LEDGER_TITLE,
  USAGE_SOURCES_TITLE,
  USAGE_TABLE_COLUMNS,
} from '../../../headless/utils/usageBreakdownConstants'
import type {
  UsageModalCostAggregate,
  UsageModalMessage,
  UsageModalModelPrice,
  UsageTableRow,
} from '../../../headless/utils/usageBreakdownTypes'
import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
  messages: readonly UsageModalMessage[]
  /** The durable ledger's scope; without one only the messages on screen show. */
  chatKey?: string
  getPrice: (provider: string, model: string) => Promise<UsageModalModelPrice | undefined>
  getCost?: (chatKey: string) => Promise<UsageModalCostAggregate | undefined>
  title?: string
}

/**
 * Native peer of [web's `UsageModal`](../../../web/compound/UsageModal.tsx),
 * reading the same headless `useUsageBreakdown`: the durable ledger per model
 * and per executor, and the messages on screen with estimates from current
 * prices — the same columns, rows and footnotes as web, laid out for touch,
 * including the words a count a CLI never reported is shown with.
 */
export default function UsageModal({
  isOpen,
  onClose,
  messages,
  chatKey,
  getPrice,
  getCost,
  title = 'Usage',
}: UsageModalProps) {
  const { theme } = useNativeTheme()
  const { ledger, sources, current } = useUsageBreakdown({
    isOpen,
    messages,
    chatKey,
    getPrice,
    getCost,
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" contentStyle={{ padding: 0 }}>
      <ScrollView
        style={{ backgroundColor: theme.surface.base }}
        contentContainerStyle={{ paddingBottom: nativeSpace[6] }}
      >
        {ledger ? <UsageSection label={USAGE_LEDGER_TITLE} rows={ledger} /> : null}

        {sources ? (
          <>
            <DividerWithLabel label={USAGE_SOURCES_TITLE.toUpperCase()} />
            <UsageSection rows={sources} />
          </>
        ) : null}

        {current ? (
          <>
            <DividerWithLabel label={USAGE_CURRENT_TITLE} />
            <UsageSection rows={current} />
          </>
        ) : null}

        <View
          style={{
            paddingHorizontal: nativeSpace[6],
            paddingTop: nativeSpace[6],
            gap: nativeSpace[2],
          }}
        >
          {USAGE_FOOTNOTES.map((note) => (
            <Text
              key={note}
              style={{ fontSize: 11, color: theme.text.secondary, opacity: 0.8, lineHeight: 16 }}
            >
              {note}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Modal>
  )
}

/** One labelled table block, used for every section so they read 1:1 with web. */
function UsageSection({ label, rows }: { label?: string; rows: UsageTableRow[] }) {
  const { theme } = useNativeTheme()
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
            <View style={{ minWidth: COL_WIDTH * USAGE_TABLE_COLUMNS.length }}>
              <HeaderRow />
              {rows.map((row) => (
                <DataRow key={row.key} row={row} />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

/** Hairline divider with a centred label — mirrors web's row. */
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
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }} />
      <Text style={{ fontSize: 11, color: theme.text.secondary, letterSpacing: 1 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }} />
    </View>
  )
}

/** Every column is the same fixed slot, as on web; the inner ScrollView absorbs the overflow. */
const COL_WIDTH = 112

/**
 * Lines a cell may wrap to — a count can say a CLI left part of it out
 * (`14,701 + not reported`), a list value what it covers, and a group which
 * CLI did not report, so a one-line cell would cut off exactly the words that
 * keep it honest. Web's table cells wrap the same way.
 */
const CELL_LINES = 3

const cellBase = {
  width: COL_WIDTH,
  paddingHorizontal: nativeSpace[3],
  paddingVertical: nativeSpace[3],
} as const

function HeaderRow() {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surface.raised,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      {USAGE_TABLE_COLUMNS.map((c) => (
        <Text
          key={c.cell}
          style={[
            cellBase,
            {
              fontSize: 12,
              fontWeight: '600',
              color: theme.text.secondary,
              textAlign: 'center',
            },
          ]}
        >
          {c.label}
        </Text>
      ))}
    </View>
  )
}

function DataRow({ row }: { row: UsageTableRow }) {
  const { theme } = useNativeTheme()
  const num = {
    fontSize: 12,
    color: theme.text.primary,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
    fontWeight: row.total ? ('700' as const) : ('400' as const),
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        backgroundColor: row.total ? theme.surface.raised : 'transparent',
      }}
    >
      {USAGE_TABLE_COLUMNS.map((c) =>
        c.cell === 'label' && row.notReportedBy ? (
          <View key={c.cell} style={cellBase}>
            <Text style={num} numberOfLines={CELL_LINES}>
              {row.label}
            </Text>
            <Text
              style={[num, { fontSize: 11, fontWeight: '400', color: theme.text.secondary }]}
              numberOfLines={CELL_LINES}
            >
              {row.notReportedBy}
            </Text>
          </View>
        ) : c.cell === 'cachedRead' ? (
          <View key={c.cell} style={cellBase}>
            <Text style={num} numberOfLines={CELL_LINES}>
              {row.cachedRead}
            </Text>
            {row.cacheRatio ? (
              <Text style={[num, { fontWeight: '400', color: theme.text.secondary }]}>
                {row.cacheRatio}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text key={c.cell} style={[cellBase, num]} numberOfLines={CELL_LINES}>
            {row[c.cell]}
          </Text>
        ),
      )}
    </View>
  )
}
