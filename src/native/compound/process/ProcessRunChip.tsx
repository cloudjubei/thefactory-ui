import { Pressable, Text, View } from 'react-native'

import {
  formatProcessDuration,
  processRunCardView,
  processRunSpend,
  useProcessRun,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessRunChipProps = {
  processRunId: string
  /** Open the pipeline. The card's only action, by design. */
  onOpen: (processRunId: string) => void
}

/**
 * Native peer of
 * [web's `ProcessRunChip`](../../../web/compound/process/ProcessRunChip.tsx).
 * One object, three states — it REPORTS and never decides. A parked run says a
 * decision is pending and points into the run; a finished one holds its result.
 * Its one action is to open the pipeline.
 */
export default function ProcessRunChip({ processRunId, onOpen }: ProcessRunChipProps) {
  const { theme } = useNativeTheme()
  const { run } = useProcessRun(processRunId)
  if (!run) {
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
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>Loading the pipeline…</Text>
      </View>
    )
  }
  const view = processRunCardView(run)
  const spend = processRunSpend(run)
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
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
          onPress={() => onOpen(processRunId)}
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
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {formatProcessDuration(durMs)}
          {spend ? `  ${spend.label}` : ''}
        </Text>
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
