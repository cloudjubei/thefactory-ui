import { Text, View } from 'react-native'
import { processRunStepSpendChip, type ProcessRun } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type RunStepSpendChipProps = {
  run: ProcessRun
}

/** The most one step of a run may spend, in its head beside the turn limit — nothing when unset. */
export function RunStepSpendChip({ run }: RunStepSpendChipProps) {
  const { theme } = useNativeTheme()
  const chip = processRunStepSpendChip(run)
  if (!chip) return null
  return (
    <View
      accessibilityLabel={`${chip.label}. ${chip.title}`}
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{chip.label}</Text>
    </View>
  )
}

export default RunStepSpendChip
