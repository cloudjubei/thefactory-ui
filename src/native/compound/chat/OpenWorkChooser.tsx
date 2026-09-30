import { Pressable, Text, View } from 'react-native'

import {
  OPEN_WORK_RISKY_TAG,
  processOpenWorkView,
  type ProcessOpenWork,
  type ProcessOpenWorkChoice,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type OpenWorkChooserProps = {
  /** The story's open work, from the launch preview. */
  openWork: ProcessOpenWork
  /** The way chosen so far; nothing until the person picks one. */
  choice: ProcessOpenWorkChoice | undefined
  busy?: boolean
  onChoose: (choice: ProcessOpenWorkChoice) => void
}

/**
 * The story already has open work — a run still going, or finished and not
 * merged. Says which run, where it stands and what could go wrong, then offers
 * the three ways to proceed, each with what it entails; the launch waits for a
 * pick. Web peer: `web/compound/chat/OpenWorkChooser`.
 */
export default function OpenWorkChooser({
  openWork,
  choice,
  busy = false,
  onChoose,
}: OpenWorkChooserProps) {
  const { theme, status } = useNativeTheme()
  const view = processOpenWorkView(openWork)
  const line = { fontSize: 11.5, color: theme.text.secondary }
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="This story already has open work"
      style={{
        gap: nativeSpace[2],
        borderWidth: 1,
        borderColor: status.working.softBorder,
        backgroundColor: status.working.softBg,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
        {view.headline}
      </Text>
      {view.holds ? <Text style={line}>It holds: {view.holds}</Text> : null}
      {view.adds ? <Text style={line}>This launch adds: {view.adds}</Text> : null}
      {view.warnings.map((warning) => (
        <Text
          key={warning}
          style={{ fontSize: 11.5, fontWeight: '500', color: status.working.softFg }}
        >
          {warning}
        </Text>
      ))}
      <View style={{ gap: 6 }}>
        {view.options.map((option) => {
          const picked = choice === option.choice
          const disabled = busy || !option.available
          return (
            <Pressable
              key={option.choice}
              accessibilityRole="radio"
              accessibilityState={{ checked: picked, disabled }}
              disabled={disabled}
              onPress={() => onChoose(option.choice)}
              style={{
                gap: 2,
                borderWidth: 1,
                borderColor: picked ? theme.accent.primary : theme.border.default,
                backgroundColor: theme.surface.raised,
                borderRadius: nativeRadii[2],
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <Text
                  style={{
                    flexShrink: 1,
                    fontSize: 12.5,
                    fontWeight: '600',
                    color: theme.text.primary,
                  }}
                >
                  {option.label}
                </Text>
                {option.risky ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: status.stuck.softBorder,
                      backgroundColor: status.stuck.softBg,
                      borderRadius: 999,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        color: status.stuck.softFg,
                      }}
                    >
                      {OPEN_WORK_RISKY_TAG}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.text.secondary }}>
                {option.available ? option.detail : option.reason}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
