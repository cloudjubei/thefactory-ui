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
  TICKET_PICKER_COPY,
  TICKET_PICKER_INHERIT,
  TICKET_PICKER_NONE,
  chooseTicketConnection,
  hasTicketProjects,
  ticketAccessCopy,
  ticketConnectionsOf,
  ticketTransitionStanding,
  useProviderConnections,
  useTicketStatuses,
  withSignOffTransition,
} from '../../../headless'
import type { TicketConnectionAccess, TicketConnectionBinding } from '../../../headless/api'
import {
  describeTicketBinding,
  formatJiraProjectKeys,
  parseJiraProjectKeys,
} from '../../../headless/utils/ticketConnection'
import { TICKET_ACCESS_LABELS } from '../../../headless/utils/ticketConnectionConstants'
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
  const { connections, listStatuses } = useProviderConnections()
  const ticketConnections = ticketConnectionsOf(connections)
  const own = value !== undefined && value !== 'none' ? value : undefined
  const [keysText, setKeysText] = useState(formatJiraProjectKeys(own?.projectKeys))
  const [transitionText, setTransitionText] = useState(own?.signOffTransition ?? '')

  const selected = own
    ? own.connectionId
    : value === undefined && inherited
      ? TICKET_PICKER_INHERIT
      : TICKET_PICKER_NONE
  const ownIsMissing =
    own !== undefined && !ticketConnections.some((c) => c.id === own.connectionId)

  const choose = (next: string) => {
    const choice = chooseTicketConnection(next, value, {
      inherits: inherited !== undefined,
      connections: ticketConnections,
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

  const connection = ticketConnections.find((c) => c.id === own?.connectionId)
  const statuses = useTicketStatuses(listStatuses, connection?.id, own?.projectKeys)
  const accessCopy = ticketAccessCopy(connection?.provider)

  const inheritedSummary = inherited?.binding
    ? describeTicketBinding(inherited.binding, connections)
    : 'not connected'

  return (
    <View style={{ gap: nativeSpace[4] }}>
      <Field
        label={TICKET_PICKER_COPY.label}
        hint={
          ticketConnections.length === 0
            ? TICKET_PICKER_COPY.noConnections
            : selected === TICKET_PICKER_INHERIT
              ? TICKET_PICKER_COPY.inherited(inherited?.groupTitle, inheritedSummary)
              : selected === TICKET_PICKER_NONE
                ? TICKET_PICKER_COPY.notConnected
                : undefined
        }
      >
        <Select value={selected} onValueChange={choose}>
          <SelectTrigger>
            <SelectValue placeholder={TICKET_PICKER_COPY.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {inherited ? (
              <SelectItem value={TICKET_PICKER_INHERIT}>Same as {inherited.groupTitle}</SelectItem>
            ) : null}
            <SelectItem value={TICKET_PICKER_NONE}>Not connected</SelectItem>
            {ticketConnections.map((c) => (
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
          <Field label={accessCopy.heading} hint={accessCopy.descriptions[own.access]}>
            <SegmentedControl
              ariaLabel={accessCopy.ariaLabel}
              value={own.access}
              onChange={setAccess}
              options={(['read', 'read-write'] as const).map((access) => ({
                value: access,
                label: TICKET_ACCESS_LABELS[access],
              }))}
            />
          </Field>
          {hasTicketProjects(connection?.provider) ? (
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
          ) : null}
          <TicketTransitionField
            value={transitionText}
            onChange={setTransition}
            statuses={statuses}
            {...(connection ? { provider: connection.provider } : {})}
            standing={ticketTransitionStanding({ binding: own, connection, writeBack })}
          />
          {ownIsMissing ? <Alert>{TICKET_PICKER_COPY.deleted}</Alert> : null}
        </>
      ) : null}
    </View>
  )
}
