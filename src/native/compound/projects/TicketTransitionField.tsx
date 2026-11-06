import { Text, View } from 'react-native'
import { TICKET_TRANSITION_FIELD, type TicketTransitionStanding } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export interface TicketTransitionFieldProps {
  /** The transition as typed. */
  value: string
  onChange: (text: string) => void
  /** What a sign-off would do with this binding. */
  standing: TicketTransitionStanding
}

const STATUS_KEY = {
  done: 'done',
  onhold: 'on_hold',
  empty: 'empty',
} as const satisfies Record<TicketTransitionStanding['tone'], string>

/** Native peer of the web `TicketTransitionField`, in the layout that ships. */
export default function TicketTransitionField({
  value,
  onChange,
  standing,
}: TicketTransitionFieldProps) {
  const { theme, status } = useNativeTheme()
  const colors = status[STATUS_KEY[standing.tone]]
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Field label={TICKET_TRANSITION_FIELD.label} hint={TICKET_TRANSITION_FIELD.hint}>
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={TICKET_TRANSITION_FIELD.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        <Text
          style={{
            fontSize: 11,
            overflow: 'hidden',
            color: colors.softFg,
            backgroundColor: colors.softBg,
            borderWidth: 1,
            borderColor: colors.softBorder,
            borderRadius: nativeRadii.round,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          {standing.label}
        </Text>
        <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{standing.text}</Text>
      </View>
    </View>
  )
}
