import { Text, View } from 'react-native'

import { launchPlanningLine } from '../../../headless/utils/launchPlanning'
import { LAUNCH_PLANNING_COPY } from '../../../headless/utils/launchPlanningConstants'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'

export type LaunchPlanFirstToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
  busy?: boolean
}

/** Native peer of the web `LaunchPlanFirstToggle`. */
export default function LaunchPlanFirstToggle({
  value,
  onChange,
  busy = false,
}: LaunchPlanFirstToggleProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 4 }} testID="launch-plan-first">
      <Switch
        checked={value}
        disabled={busy}
        onCheckedChange={onChange}
        label={LAUNCH_PLANNING_COPY.title}
      />
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
        {launchPlanningLine(value)}
      </Text>
    </View>
  )
}
