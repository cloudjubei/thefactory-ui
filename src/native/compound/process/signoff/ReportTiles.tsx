import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  runModelKey,
  type ReportTile,
  type RunModel,
  type SignoffCostView,
  type SignoffTimeSegment,
  type SignoffTimeView,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronDown } from '../../../icons'
import RunModelChip from '../../chat/signoff/RunModelChip'
import { reviewToneVariant, TIME_PART_FILL } from './tones'

export type ReportTilesProps = { tiles: readonly ReportTile[] }

/**
 * Native peer of web's `ReportTiles`: the report's four tiles, Time and Cost
 * opening their breakdowns under them when the runs' work is known.
 */
export default function ReportTiles({ tiles }: ReportTilesProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const box = {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 4,
    padding: 10,
    borderRadius: nativeRadii[3],
    borderWidth: 1,
    borderColor: theme.border.subtle,
  } as const
  return (
    <View style={{ gap: 10, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tiles.map((tile) =>
          tile.detail ? (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              accessibilityState={{ expanded: open.has(tile.key) }}
              onPress={() => toggle(tile.key)}
              style={box}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.secondary }}>
                  {tile.label}
                </Text>
                <View style={{ transform: [{ rotate: open.has(tile.key) ? '180deg' : '0deg' }] }}>
                  <IconChevronDown size={12} color={theme.text.muted} />
                </View>
              </View>
              <TileBody tile={tile} />
            </Pressable>
          ) : (
            <View key={tile.key} style={box}>
              <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{tile.label}</Text>
              <TileBody tile={tile} />
            </View>
          ),
        )}
      </View>
      {tiles.map((tile) =>
        tile.detail && open.has(tile.key) ? (
          tile.detail.kind === 'time' ? (
            <TimeBreakdown key={tile.key} view={tile.detail.view} />
          ) : (
            <CostBreakdown key={tile.key} view={tile.detail.view} />
          )
        ) : null,
      )}
    </View>
  )
}

function TileBody({ tile }: { tile: ReportTile }) {
  const { theme, status } = useNativeTheme()
  const detail = tile.detail
  const small = { fontSize: 11.5, color: theme.text.secondary } as const
  return (
    <>
      <Text
        style={{
          fontSize: 13.5,
          fontWeight: '600',
          color:
            tile.tone === 'neutral'
              ? theme.text.primary
              : reviewToneVariant(tile.tone, status).softFg,
        }}
      >
        {tile.value}
      </Text>
      {detail?.kind === 'time' ? <Bar segments={detail.view.segments} /> : null}
      {tile.sub ? <Text style={small}>{tile.sub}</Text> : null}
      {detail?.kind === 'cost' && detail.view.runs ? (
        <Text style={small}>{detail.view.runs}</Text>
      ) : null}
      {detail?.kind === 'cost' ? <ModelChips models={detail.view.models} /> : null}
    </>
  )
}

function ModelChips({ models }: { models: readonly RunModel[] }) {
  if (models.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {models.map((m) => (
        <RunModelChip key={runModelKey(m)} model={m} />
      ))}
    </View>
  )
}

function Bar({ segments }: { segments: readonly SignoffTimeSegment[] }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: theme.surface.muted,
      }}
    >
      {segments.map((s) => (
        <View
          key={s.part}
          style={{ width: `${s.fraction * 100}%`, backgroundColor: TIME_PART_FILL[s.part] }}
        />
      ))}
    </View>
  )
}

function Panel({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
      }}
    >
      {children}
    </View>
  )
}

function Row({
  label,
  total,
  bar,
  models,
}: {
  label: string
  total: string
  bar: ReactNode
  models?: readonly RunModel[]
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{total}</Text>
      </View>
      {models ? <ModelChips models={models} /> : null}
      {bar}
    </View>
  )
}

function TimeBreakdown({ view }: { view: SignoffTimeView }) {
  const { theme } = useNativeTheme()
  const legend = { fontSize: 12, color: theme.text.secondary } as const
  return (
    <Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
        {view.legend.map((s) => (
          <View key={s.part} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: TIME_PART_FILL[s.part],
              }}
            />
            <Text style={legend}>{`${s.label} ${s.value}`}</Text>
          </View>
        ))}
        {view.waitingLegend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.text.muted,
              }}
            />
            <Text style={legend}>{view.waitingLegend}</Text>
          </View>
        ) : null}
      </View>
      {view.rows.map((row) => (
        <Row
          key={row.key}
          label={row.label}
          total={row.total}
          bar={<Bar segments={row.segments} />}
        />
      ))}
    </Panel>
  )
}

function CostBreakdown({ view }: { view: SignoffCostView }) {
  const { theme } = useNativeTheme()
  return (
    <Panel>
      {view.reasons.map((reason) => (
        <Text key={reason} style={{ fontSize: 12, color: theme.text.primary }}>
          {reason}
        </Text>
      ))}
      {view.note ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.note}</Text>
      ) : null}
      {view.rows.map((row) => (
        <Row
          key={row.key}
          label={row.label}
          total={row.amount}
          models={row.models}
          bar={
            <View
              style={{
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: theme.surface.muted,
              }}
            >
              <View
                style={{
                  width: `${row.fraction * 100}%`,
                  height: 8,
                  backgroundColor: theme.accent.primary,
                }}
              />
            </View>
          }
        />
      ))}
      {view.tokens ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row' }}>
            <RunModelChip model={view.tokens.model} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
            {view.tokens.rows.map((r) => (
              <View key={r.label}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{r.label}</Text>
                <Text style={{ fontSize: 12, color: theme.text.primary }}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Panel>
  )
}
