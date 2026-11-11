import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_VARIANT_COPY,
  processVariantChildView,
  useProcessRun,
  type ProcessVariantLane,
  type ProcessVariantLanesView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'
import StepsStrip from './StepsStrip'

export type ProcessVariantLanesProps = {
  view: ProcessVariantLanesView
  /** Open a variant's own page: a push. */
  onOpen: (lane: ProcessVariantLane) => void
  /** Open the report, from the card's head. */
  onOpenReport?: () => void
}

const NO_TILES = [] as const

/** The steps of the run fanned out for a lane, once it is read. */
function LaneSteps({ runId }: { runId: string | undefined }) {
  const { run } = useProcessRun(runId)
  const { steps } = processVariantChildView(run, NO_TILES)
  if (steps.length === 0) return null
  return (
    <View style={{ marginHorizontal: -nativeSpace[3] }}>
      <StepsStrip model={{ label: PROCESS_VARIANT_COPY.steps, entries: [...steps] }} />
    </View>
  )
}

function Lane({ lane, onOpen }: { lane: ProcessVariantLane; onOpen: () => void }) {
  const { theme, status } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lane.label}
      onPress={onOpen}
      style={{
        gap: 6,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        ...(lane.status === 'parked' ? { backgroundColor: status.on_hold.softBg } : {}),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
        >
          {lane.label}
        </Text>
        <ToneBadge tone={lane.badge.tone} label={lane.badge.label} />
        <IconChevronRight size={14} color={theme.text.muted} />
      </View>
      <LaneSteps runId={lane.runId} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
          {lane.line}
        </Text>
        {lane.time ? <DurationChip label={lane.time} /> : null}
        {lane.cost ? <CostChip label={lane.cost} /> : null}
      </View>
    </Pressable>
  )
}

/** Native peer of web's `ProcessVariantLanes`: a row per variant with the steps of its run. */
export default function ProcessVariantLanes({
  view,
  onOpen,
  onOpenReport,
}: ProcessVariantLanesProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityLabel={view.heading}
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        overflow: 'hidden',
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {view.heading}
        </Text>
        <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.muted }}>{view.sub}</Text>
        {onOpenReport ? (
          <Pressable accessibilityRole="button" onPress={onOpenReport}>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
              {PROCESS_VARIANT_COPY.report}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {view.lanes.map((lane) => (
        <Lane key={lane.id} lane={lane} onOpen={() => onOpen(lane)} />
      ))}
    </View>
  )
}
