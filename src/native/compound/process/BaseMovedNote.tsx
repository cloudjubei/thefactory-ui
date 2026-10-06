import { Text, View } from 'react-native'

import { processBaseMovedView, type ProcessResumeChoice, type ProcessRun } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type BaseMovedNoteProps = {
  run: ProcessRun
  onChoose: (choice: ProcessResumeChoice) => void
}

/**
 * What a run says about its base branch beside its pipeline: that it has moved
 * on — with the choice to bring it in and re-check while the run's park offers
 * it — and the newest time it was brought in. The native peer of the web
 * `BaseMovedNote`.
 */
export default function BaseMovedNote({ run, onChoose }: BaseMovedNoteProps) {
  const { theme } = useNativeTheme()
  const view = processBaseMovedView(run)
  if (!view) return null
  const choice = view.choice
  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      {view.note ? (
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          {view.note}
        </Text>
      ) : null}
      {view.lastUpdate ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.lastUpdate}</Text>
      ) : null}
      {choice ? (
        <View style={{ alignSelf: 'flex-start', gap: 2 }}>
          <Button
            size="sm"
            variant={choice.primary ? 'primary' : 'secondary'}
            onPress={() => onChoose(choice.choice)}
          >
            {choice.label}
          </Button>
          <Text style={{ fontSize: 10, color: theme.text.secondary }}>{choice.detail}</Text>
        </View>
      ) : null}
    </View>
  )
}
