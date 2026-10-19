import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  DAILY_USAGE_RANGE_OPTIONS,
  DAILY_USAGE_TEXT,
} from '../../../headless/utils/dailyUsageConstants'
import type {
  DailyUsageDay,
  DailyUsageModelRow,
  DailyUsageStatus,
  DailyUsageView,
} from '../../../headless/utils/dailyUsageTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'

export interface UsageSettingsViewProps {
  view: DailyUsageView
  days: number
  onDaysChange: (days: number) => void
  /** `true` until the first read lands. */
  loading: boolean
  error?: string
  onRebuild: () => void
  rebuilding: boolean
}

const TOKEN_CELLS = [
  ['input', DAILY_USAGE_TEXT.columns.input],
  ['output', DAILY_USAGE_TEXT.columns.output],
  ['cacheRead', DAILY_USAGE_TEXT.columns.cacheRead],
  ['cacheWrite', DAILY_USAGE_TEXT.columns.cacheWrite],
  ['cacheShare', DAILY_USAGE_TEXT.columns.cacheShare],
] as const satisfies ReadonlyArray<readonly [keyof DailyUsageModelRow, string]>

function useStatusColor(): (status: DailyUsageStatus) => string {
  const { theme, status } = useNativeTheme()
  return (s) =>
    s === 'unknown'
      ? status.stuck.softFg
      : s === 'partial'
        ? status.working.softFg
        : theme.text.secondary
}

function ModelRow({ row }: { row: DailyUsageModelRow }) {
  const { theme } = useNativeTheme()
  const small = {
    fontSize: 12,
    color: theme.text.secondary,
    fontVariant: ['tabular-nums' as const],
  }
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingVertical: nativeSpace[3],
        gap: nativeSpace[1],
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text.primary }}>
        {row.name} <Text style={small}>{row.source}</Text>
      </Text>
      <Text style={small}>
        {row.charged} · {row.listValue} · {row.calls}
      </Text>
      <Text style={small}>
        {TOKEN_CELLS.map(([cell, label]) => `${label} ${row[cell]}`).join(' · ')}
      </Text>
    </View>
  )
}

function ToolBreakdown({ day }: { day: DailyUsageDay }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  if (day.tools.length === 0 && day.unattributed.length === 0) return null
  const line = { fontSize: 12, color: theme.text.primary, fontVariant: ['tabular-nums' as const] }
  const note = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button">
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {open ? '▾' : '▸'} {DAILY_USAGE_TEXT.tools}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={note}>{DAILY_USAGE_TEXT.toolsNote}</Text>
          {day.tools.map((tool) => (
            <Text key={tool.key} style={line}>
              {tool.name} · {tool.charged} · {tool.calls}
              {tool.averaged ? <Text style={note}> · {tool.averaged}</Text> : null}
            </Text>
          ))}
          {day.unattributed.length > 0 ? (
            <Text style={note}>{DAILY_USAGE_TEXT.unattributed}</Text>
          ) : null}
          {day.unattributed.map((row) => (
            <Text key={row.key} style={line}>
              {row.name} · {row.charged} · {row.calls}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function UsageDay({ day }: { day: DailyUsageDay }) {
  const { theme, status } = useNativeTheme()
  const statusColor = useStatusColor()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        padding: nativeSpace[4],
        gap: nativeSpace[3],
      }}
    >
      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {day.label}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.primary, fontVariant: ['tabular-nums'] }}>
          {day.charged}{' '}
          <Text style={{ color: theme.text.secondary }}>
            · {day.listValue} · {day.calls}
          </Text>
        </Text>
        {day.completeness ? (
          <Text style={{ fontSize: 12, color: statusColor(day.status) }}>{day.completeness}</Text>
        ) : null}
      </View>
      {day.anomalies.map((anomaly) => (
        <View
          key={anomaly.key}
          style={{
            borderWidth: 1,
            borderColor: status.working.softBorder,
            backgroundColor: status.working.softBg,
            borderRadius: nativeRadii[2],
            padding: nativeSpace[3],
          }}
        >
          <Text style={{ fontSize: 13, color: status.working.softFg }}>
            <Text style={{ fontWeight: '600' }}>{anomaly.title}</Text> · {anomaly.detail}
          </Text>
        </View>
      ))}
      {day.models.length > 0 ? (
        <View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {DAILY_USAGE_TEXT.models}
          </Text>
          {day.models.map((row) => (
            <ModelRow key={row.key} row={row} />
          ))}
        </View>
      ) : null}
      <ToolBreakdown day={day} />
    </View>
  )
}

/**
 * Native peer of the web `UsageSettingsView`, laid out for touch from the
 * same headless view: each UTC day's charge and list-price estimate, its
 * calls short of counts, its cache anomalies, each provider and model, and
 * the spend per tool.
 */
export default function UsageSettingsView({
  view,
  days,
  onDaysChange,
  loading,
  error,
  onRebuild,
  rebuilding,
}: UsageSettingsViewProps) {
  const { theme, status } = useNativeTheme()
  const statusColor = useStatusColor()
  const muted = { fontSize: 13, color: theme.text.muted }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <Text style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 18 }}>
        {DAILY_USAGE_TEXT.intro}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
        <SegmentedControl
          size="sm"
          ariaLabel={DAILY_USAGE_TEXT.title}
          options={DAILY_USAGE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={String(days)}
          onChange={(value) => onDaysChange(Number(value))}
        />
        <Button variant="secondary" size="sm" loading={rebuilding} onPress={onRebuild}>
          {DAILY_USAGE_TEXT.rebuild}
        </Button>
      </View>
      {view.days.length > 0 ? (
        <Text
          style={{
            fontSize: 13,
            color: statusColor(view.total.status),
            fontVariant: ['tabular-nums'],
          }}
        >
          {DAILY_USAGE_TEXT.total}:{' '}
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>{view.total.charged}</Text>{' '}
          · {view.total.listValue} · {view.total.calls}
        </Text>
      ) : null}
      {error ? <Text style={{ fontSize: 13, color: status.stuck.softFg }}>{error}</Text> : null}
      {loading && view.days.length === 0 ? (
        <Text style={muted}>{DAILY_USAGE_TEXT.reading}</Text>
      ) : view.days.length === 0 ? (
        <Text style={muted}>{DAILY_USAGE_TEXT.empty}</Text>
      ) : (
        view.days.map((day) => <UsageDay key={day.day} day={day} />)
      )}
    </View>
  )
}
