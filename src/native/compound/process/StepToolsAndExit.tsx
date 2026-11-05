import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProcessPlanStep } from 'thefactory-tools/types'
import { processStepToolsView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'

export type StepToolsAndExitProps = {
  step: Pick<ProcessPlanStep, 'kind' | 'agentType' | 'agentRole' | 'documents'>
}

/** What a step is handed and what ends it. Native peer of web's `StepToolsAndExit`. */
export default function StepToolsAndExit({ step }: StepToolsAndExitProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const { exitLabel, tools, toolsLabel, noTools } = processStepToolsView(step)
  const line = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <Text style={line}>{exitLabel}</Text>
      {noTools ? <Text style={line}>{noTools}</Text> : null}
      {toolsLabel ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={toolsLabel}
            onPress={() => setOpen((value) => !value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}
          >
            <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
              <IconChevron size={12} color={theme.text.secondary} />
            </View>
            <Text style={line}>{toolsLabel}</Text>
          </Pressable>
          {open ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{tools.join('  ')}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  )
}
