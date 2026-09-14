import { Pressable, Text, View } from 'react-native'

import { processRunChipLabel, useProcessRun } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ProcessRunChipProps = {
  processRunId: string
  /** Open the pipeline. The chip's only action, by design. */
  onOpen: (processRunId: string) => void
}

/**
 * Native peer of
 * [web's `ProcessRunChip`](../../../web/compound/process/ProcessRunChip.tsx).
 * Same prop surface.
 *
 * It REPORTS and it never decides. A parked run says a decision is pending and
 * nothing more — the choices live in the pipeline, where their context is.
 */
export default function ProcessRunChip({ processRunId, onOpen }: ProcessRunChipProps) {
  const { theme } = useNativeTheme()
  const { run } = useProcessRun(processRunId)
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(processRunId)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[1],
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
        {run ? processRunChipLabel(run) : 'Loading the pipeline…'}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>Open the pipeline →</Text>
    </Pressable>
  )
}
