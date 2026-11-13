import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import {
  PLAN_WINDOW_COPY,
  type PlanWindowChipView,
  type PlanWindowChipWindow,
  type PlanWindowStatus,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface PlanWindowChipProps {
  /** The run's plan windows, from `planWindowChip`. */
  view: PlanWindowChipView
}

function usePlanWindowColors() {
  const { theme, status } = useNativeTheme()
  const fill: Record<PlanWindowStatus, string> = {
    ok: theme.accent.primary,
    'near-limit': status.working.bg,
    'limit-reached': status.stuck.bg,
  }
  const text: Record<PlanWindowStatus, string> = {
    ok: theme.text.primary,
    'near-limit': status.working.softFg,
    'limit-reached': status.stuck.softFg,
  }
  return { fill, text }
}

function Ring({ window }: { window: PlanWindowChipWindow }) {
  const { theme } = useNativeTheme()
  const { fill } = usePlanWindowColors()
  const radius = 5
  const round = 2 * Math.PI * radius
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2.5}
        stroke={theme.border.default}
      />
      <Circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2.5}
        stroke={fill[window.status]}
        strokeDasharray={`${(round * (window.percent ?? 0)) / 100} ${round}`}
      />
    </Svg>
  )
}

function Dot({ window }: { window: PlanWindowChipWindow }) {
  const { fill } = usePlanWindowColors()
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: nativeRadii.round,
        backgroundColor: fill[window.status],
      }}
    />
  )
}

function Mark({ window }: { window: PlanWindowChipWindow }) {
  return window.percent === undefined ? <Dot window={window} /> : <Ring window={window} />
}

function WindowPill({ window }: { window: PlanWindowChipWindow }) {
  const { theme } = useNativeTheme()
  const { text } = usePlanWindowColors()
  const muted = [chipPillTextStyle(theme), { color: theme.text.muted }]
  return (
    <View style={[chipPillStyle(theme), { gap: nativeSpace[2], paddingVertical: nativeSpace[1] }]}>
      <Text style={muted}>{window.window}</Text>
      <Mark window={window} />
      {window.value ? (
        <Text
          style={[
            chipPillTextStyle(theme),
            { color: text[window.status], fontVariant: ['tabular-nums'] },
          ]}
        >
          {window.value}
        </Text>
      ) : null}
      <Text style={muted}>· {window.reset}</Text>
    </View>
  )
}

/**
 * How much of its CLI plan's rate-limit windows a run has used, beside the run's model. The
 * native peer of the web `PlanWindowChip`: a press opens each window in words in a sheet, the
 * touch analogue of the web hover.
 */
export default function PlanWindowChip({ view }: PlanWindowChipProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={PLAN_WINDOW_COPY.chipLabel(view.title)}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {view.notReported ? (
            <View style={[chipPillStyle(theme), { paddingVertical: nativeSpace[1] }]}>
              <Text style={[chipPillTextStyle(theme), { color: theme.text.muted }]}>
                {view.notReported}
              </Text>
            </View>
          ) : (
            view.windows.map((w) => <WindowPill key={w.window} window={w} />)
          )}
        </View>
      </Pressable>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={view.title}>
        <View
          style={{
            gap: nativeSpace[2],
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[5],
          }}
        >
          {view.windows.map((w) => (
            <Text key={w.window} style={{ fontSize: 13, color: theme.text.secondary }}>
              {w.detail}
            </Text>
          ))}
          {view.notReported ? (
            <Text style={{ fontSize: 13, color: theme.text.muted }}>{view.notReported}</Text>
          ) : null}
        </View>
      </BottomSheet>
    </>
  )
}
