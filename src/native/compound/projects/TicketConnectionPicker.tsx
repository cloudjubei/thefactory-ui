import { useState } from 'react'
import { View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import {
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
  chooseTicketConnection,
  ticketTransitionStanding,
  useProviderConnections,
  withSignOffTransition,
} from '../../../headless'
import type { TicketConnectionAccess, TicketConnectionBinding } from '../../../headless/api'
import {
  describeTicketBinding,
  formatJiraProjectKeys,
  jiraConnectionsOf,
  parseJiraProjectKeys,
} from '../../../headless/utils/ticketConnection'
import {
  TICKET_ACCESS_DESCRIPTIONS,
  TICKET_ACCESS_LABELS,
} from '../../../headless/utils/ticketConnectionConstants'
import TicketTransitionField from './TicketTransitionField'

/** A project's setting (`undefined` = inherit, `'none'` = opted out) or a group's (`undefined` = none). */
export type TicketConnectionPickerValue = TicketConnectionBinding | 'none' | undefined

export interface TicketConnectionPickerProps {
  value: TicketConnectionPickerValue
  onChange: (next: TicketConnectionPickerValue) => void
  /**
   * For a project: the main group it inherits from, and that group's binding.
   * Absent for a group, or for a project with no main group.
   */
  inherited?: { groupTitle: string; binding?: TicketConnectionBinding }
  /** Whether connector write-back is on where this binding applies. */
  writeBack?: boolean
}

/**
 * Native peer of the web `TicketConnectionPicker`. Which Jira connection a
 * project or group gives its agents, and how much they may do with it. A
 * project can follow its main group, opt out, or choose its own connection; a
 * group chooses a connection or none.
 */
export default function TicketConnectionPicker({
  value,
  onChange,
  inherited,
  writeBack = false,
}: TicketConnectionPickerProps) {
  const { connections } = useProviderConnections()
  const jiraConnections = jiraConnectionsOf(connections)
  const own = value !== undefined && value !== 'none' ? value : undefined
  const [keysText, setKeysText] = useState(formatJiraProjectKeys(own?.projectKeys))
  const [transitionText, setTransitionText] = useState(own?.signOffTransition ?? '')

  const selected = own
    ? own.connectionId
    : value === undefined && inherited
      ? TICKET_PICKER_INHERIT
      : TICKET_PICKER_NONE
  const ownIsMissing = own !== undefined && !jiraConnections.some((c) => c.id === own.connectionId)

  const choose = (next: string) => {
    const choice = chooseTicketConnection(next, value, {
      inherits: inherited !== undefined,
      connectionIds: jiraConnections.map((c) => c.id),
    })
    if (!choice) return
    if (choice.value !== undefined && choice.value !== 'none') {
      setKeysText(formatJiraProjectKeys(choice.value.projectKeys))
      setTransitionText(choice.value.signOffTransition ?? '')
    }
    onChange(choice.value)
  }

  const setAccess = (access: string) => {
    if (own) onChange({ ...own, access: access as TicketConnectionAccess })
  }

  const setKeys = (text: string) => {
    setKeysText(text)
    if (!own) return
    const projectKeys = parseJiraProjectKeys(text)
    const { projectKeys: _previous, ...rest } = own
    onChange(projectKeys.length ? { ...rest, projectKeys } : rest)
  }

  const setTransition = (text: string) => {
    setTransitionText(text)
    if (own) onChange(withSignOffTransition(own, text))
  }

  const inheritedSummary = inherited?.binding
    ? describeTicketBinding(inherited.binding, connections)
    : 'not connected'

  return (
    <View style={{ gap: nativeSpace[4] }}>
      <Field
        label="Jira"
        hint={
          jiraConnections.length === 0
            ? 'No Jira connection yet — add one in Settings → Tickets.'
            : selected === TICKET_PICKER_INHERIT
              ? `Agents here use ${inherited?.groupTitle}'s Jira: ${inheritedSummary}.`
              : selected === TICKET_PICKER_NONE
                ? 'Agents here get no Jira tools.'
                : undefined
        }
      >
        <Select value={selected} onValueChange={choose}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a Jira connection" />
          </SelectTrigger>
          <SelectContent>
            {inherited ? (
              <SelectItem value={TICKET_PICKER_INHERIT}>Same as {inherited.groupTitle}</SelectItem>
            ) : null}
            <SelectItem value={TICKET_PICKER_NONE}>Not connected</SelectItem>
            {jiraConnections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
            {ownIsMissing ? (
              <SelectItem value={own.connectionId}>A deleted connection</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </Field>

      {own ? (
        <>
          <Field label="What agents may do" hint={TICKET_ACCESS_DESCRIPTIONS[own.access]}>
            <SegmentedControl
              ariaLabel="What agents may do in Jira"
              value={own.access}
              onChange={setAccess}
              options={(['read', 'read-write'] as const).map((access) => ({
                value: access,
                label: TICKET_ACCESS_LABELS[access],
              }))}
            />
          </Field>
          <Field
            label="Limit to Jira projects (optional)"
            hint="Jira project keys, e.g. ENG, OPS. Leave blank to allow every project the connection's account can see."
          >
            <Input
              value={keysText}
              onChangeText={setKeys}
              placeholder="ENG, OPS"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Field>
          <TicketTransitionField
            value={transitionText}
            onChange={setTransition}
            standing={ticketTransitionStanding({
              binding: own,
              connection: jiraConnections.find((c) => c.id === own.connectionId),
              writeBack,
            })}
          />
          {ownIsMissing ? (
            <Alert>
              This connection was deleted, so agents here get no Jira tools. Choose another.
            </Alert>
          ) : null}
        </>
      ) : null}
    </View>
  )
}
