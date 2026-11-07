import { Text, View } from 'react-native'
import {
  TICKET_TRANSITION_FIELD,
  ticketTransitionChoiceOf,
  ticketTransitionChoices,
  ticketTransitionOfChoice,
  type TicketStatusList,
  type TicketTransitionStanding,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

export interface TicketTransitionFieldProps {
  /** The status saved, or as typed. Blank leaves the ticket where it is. */
  value: string
  onChange: (text: string) => void
  /** What the connection can reach. When it cannot be read, the field takes a typed name. */
  statuses: TicketStatusList
  /** The connection's provider: GitHub's states read as words. */
  provider?: string
  /** What a sign-off would do with this binding. */
  standing: TicketTransitionStanding
}

const STATUS_KEY = {
  done: 'done',
  onhold: 'on_hold',
  empty: 'empty',
} as const satisfies Record<TicketTransitionStanding['tone'], string>

function TransitionInput({
  value,
  onChange,
  statuses,
  provider,
}: Pick<TicketTransitionFieldProps, 'value' | 'onChange' | 'statuses' | 'provider'>) {
  if (statuses.kind === 'failed') {
    return (
      <Field
        label={TICKET_TRANSITION_FIELD.label}
        hint={TICKET_TRANSITION_FIELD.typeHint(statuses.reason)}
      >
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={TICKET_TRANSITION_FIELD.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
    )
  }
  const reading = statuses.kind === 'reading'
  const choices = ticketTransitionChoices(
    statuses.kind === 'ready' ? statuses.statuses : undefined,
    value,
    provider,
  )
  return (
    <Field
      label={TICKET_TRANSITION_FIELD.label}
      hint={reading ? TICKET_TRANSITION_FIELD.reading : TICKET_TRANSITION_FIELD.hint}
    >
      <Select
        value={ticketTransitionChoiceOf(choices, value)}
        onValueChange={(choice) => onChange(ticketTransitionOfChoice(choice))}
      >
        <SelectTrigger disabled={reading}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Native peer of the web `TicketTransitionField`, in the layout that ships. */
export default function TicketTransitionField({
  value,
  onChange,
  statuses,
  provider,
  standing,
}: TicketTransitionFieldProps) {
  const { theme, status } = useNativeTheme()
  const colors = status[STATUS_KEY[standing.tone]]
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <TransitionInput
        value={value}
        onChange={onChange}
        statuses={statuses}
        {...(provider ? { provider } : {})}
      />
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
