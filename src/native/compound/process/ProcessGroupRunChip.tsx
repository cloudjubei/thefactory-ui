import { Pressable, Text, View } from 'react-native'

import {
  costChipLabel,
  formatProcessDuration,
  processGroupCardView,
  processGroupWorkMs,
  useDurationTimer,
  useProcessGroupRun,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import CostChip from '../chips/CostChip'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessGroupRunChipProps = {
  groupRunId: string
  /** Open the group run. The card's only action, by design. */
  onOpen: (groupRunId: string) => void
}

/**
 * Native peer of
 * [web's `ProcessGroupRunChip`](../../../web/compound/process/ProcessGroupRunChip.tsx).
 * The card a group launch leaves in the chat — how many projects, how many
 * merged, and what it waits on. It reports and never decides: every decision is
 * made in the group run it opens.
 */
export default function ProcessGroupRunChip({ groupRunId, onOpen }: ProcessGroupRunChipProps) {
  const { theme } = useNativeTheme()
  const { group } = useProcessGroupRun(groupRunId)
  const now = useDurationTimer(group?.totals?.ticking === true)
  if (!group) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
          borderRadius: nativeRadii[3],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
        }}
      >
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>Loading the group run…</Text>
      </View>
    )
  }
  const view = processGroupCardView(group)
  const workMs = processGroupWorkMs(group.totals, now)
  const spend = costChipLabel(group.totals)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        gap: nativeSpace[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}
        >
          {view.title}
        </Text>
        <ToneBadge tone={view.badge.tone} label={view.badge.label} />
      </View>
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.sub}</Text>
      {view.body ? <BodyStrip tone={view.body.tone} text={view.body.text} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(groupRunId)}
          style={{
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: theme.surface.base,
            borderRadius: nativeRadii[2],
            paddingHorizontal: nativeSpace[2],
            paddingVertical: nativeSpace[1],
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.primary }}>
            {`${view.cta} ›`}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {workMs !== undefined ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {formatProcessDuration(workMs)}
          </Text>
        ) : null}
        {spend ? (
          <CostChip
            label={spend}
            cost={group.totals}
            title="Every project, summed"
            appearance="text"
            textStyle={{ fontSize: 11, color: theme.text.muted }}
          />
        ) : null}
      </View>
    </View>
  )
}

function ToneBadge({ tone, label }: { tone: ProcessStatusTone; label: string }) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 10, color: variant.softFg }}>{label}</Text>
    </View>
  )
}

function BodyStrip({ tone, text }: { tone: ProcessStatusTone; text: string }) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[1],
      }}
    >
      <Text style={{ fontSize: 11.5, color: variant.softFg }}>{text}</Text>
    </View>
  )
}
