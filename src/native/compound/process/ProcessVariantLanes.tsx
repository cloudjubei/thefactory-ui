import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_VARIANT_COPY,
  type ProcessVariantDayCell,
  type ProcessVariantLane,
  type ProcessVariantLanesView,
  type ProcessVariantReviewLook,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'

export type ProcessVariantLanesProps = {
  view: ProcessVariantLanesView
  /** Open a variant's own page: a push. */
  onOpen: (lane: ProcessVariantLane) => void
  /** Open the report, from the card's head. */
  onOpenReport?: () => void
}

function useCellLook() {
  const { theme, status } = useNativeTheme()
  return (look: ProcessVariantDayCell['look']) =>
    look === 'lived'
      ? { backgroundColor: status.done.softBg, borderColor: status.done.softBorder }
      : look === 'today'
        ? { backgroundColor: status.running.softBg, borderColor: status.running.bg }
        : look === 'parked'
          ? { backgroundColor: status.on_hold.bg, borderColor: status.on_hold.bg }
          : { borderColor: theme.border.default, borderStyle: 'dashed' as const }
}

function Review({ look }: { look: ProcessVariantReviewLook }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      accessibilityLabel={PROCESS_VARIANT_COPY.review}
      style={{
        width: 8,
        height: 8,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
        ...(look === 'done'
          ? { backgroundColor: status.done.bg }
          : look === 'now'
            ? { backgroundColor: status.running.bg }
            : { borderWidth: 1, borderColor: theme.border.strong, borderStyle: 'dashed' }),
      }}
    />
  )
}

function Lane({ lane, onOpen }: { lane: ProcessVariantLane; onOpen: () => void }) {
  const { theme, status } = useNativeTheme()
  const cellLook = useCellLook()
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
      {lane.weeks.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {lane.weeks.map((week) => (
            <View
              key={week.label}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              {week.cells.map((cell) => (
                <View
                  key={cell.day}
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 3,
                    borderWidth: 1,
                    ...cellLook(cell.look),
                  }}
                />
              ))}
              {week.review ? <Review look={week.review} /> : null}
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
          {lane.dayLine ?? lane.line}
        </Text>
        {lane.time ? <DurationChip label={lane.time} /> : null}
      </View>
    </Pressable>
  )
}

/** Native peer of web's `ProcessVariantLanes`: a row per variant, its days as small cells. */
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
