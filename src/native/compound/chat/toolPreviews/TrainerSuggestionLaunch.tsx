import { Text, View, Pressable } from 'react-native'
import { useTrainerSuggestionLaunch } from '../../../../headless/hooks/useTrainerSuggestionLaunch'
import {
  trainerActivityLabel,
  type TrainerSuggestionLaunchProps,
  type TrainerSuggestionState,
} from '../../../../headless/hooks/trainerSuggestionStore'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export function TrainerSuggestionLaunchView({
  state,
  onLaunch,
  onRefresh,
  unavailable = false,
}: {
  state: TrainerSuggestionState
  onLaunch: () => void
  onRefresh: () => void
  unavailable?: boolean
}) {
  const { theme } = useNativeTheme()
  const text = { color: theme.text.secondary, fontSize: 11 }
  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      {!state.activityId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Launch"
          accessibilityState={{ disabled: unavailable || state.launching }}
          disabled={unavailable || state.launching}
          onPress={onLaunch}
          style={{
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
            opacity: unavailable || state.launching ? 0.5 : 1,
          }}
        >
          <Text style={{ color: theme.accent.primary, fontSize: 12 }}>
            {state.launching ? 'Launching…' : 'Launch'}
          </Text>
        </Pressable>
      ) : (
        <Text accessibilityLiveRegion="polite" style={text}>
          {trainerActivityLabel(state)}
        </Text>
      )}
      {unavailable ? <Text style={text}>Launch from this project’s trainer.</Text> : null}
      {state.activity?.steps.map((step) => (
        <Text key={step.key} style={text}>
          {step.key}: {step.done}/{step.total} · {step.status}
        </Text>
      ))}
      {state.activity?.error ? <Text style={text}>{state.activity.error}</Text> : null}
      {state.error ? (
        <>
          <Text accessibilityRole="alert" style={text}>
            {state.error}
          </Text>
          {state.activityId ? (
            <Pressable accessibilityRole="button" onPress={onRefresh}>
              <Text style={text}>Refresh status</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

export default function TrainerSuggestionLaunch(props: TrainerSuggestionLaunchProps) {
  const launch = useTrainerSuggestionLaunch(props)
  return (
    <TrainerSuggestionLaunchView
      state={launch.state}
      onLaunch={launch.launch}
      onRefresh={launch.refresh}
      unavailable={launch.unavailable}
    />
  )
}
