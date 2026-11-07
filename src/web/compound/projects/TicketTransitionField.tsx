import { useState } from 'react'
import {
  TICKET_TRANSITION_DEFAULT_LAYOUT,
  TICKET_TRANSITION_FIELD,
  ticketTransitionChoiceOf,
  ticketTransitionChoices,
  ticketTransitionOfChoice,
  type TicketStatusList,
  type TicketTransitionLayout,
  type TicketTransitionStanding,
} from '../../../headless'
import { IconChevronDown } from '../../icons/IconChevronDown'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import Surface from '../../primitives/Surface'

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
  layout?: TicketTransitionLayout
  /** With the `fold` layout: start open. */
  initialOpen?: boolean
}

const TONE_CLASS: Record<TicketTransitionStanding['tone'], string> = {
  done: 'badge--done',
  onhold: 'badge--onhold',
  empty: 'badge--empty',
}

function StandingChip({ standing }: { standing: TicketTransitionStanding }) {
  return (
    <span className={`badge badge--soft badge--sm shrink-0 ${TONE_CLASS[standing.tone]}`}>
      {standing.label}
    </span>
  )
}

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
          onChange={(e) => onChange(e.target.value)}
          placeholder={TICKET_TRANSITION_FIELD.placeholder}
          spellCheck={false}
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
        disabled={reading}
      >
        <SelectTrigger>
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

/**
 * The status a sign-off moves a ticket to, picked from what the connection can
 * reach, with what a sign-off would do right now: nothing is written until
 * connector write-back is on, and it says so here. Native peer:
 * `native/compound/projects/TicketTransitionField`.
 */
export default function TicketTransitionField({
  value,
  onChange,
  statuses,
  provider,
  standing,
  layout = TICKET_TRANSITION_DEFAULT_LAYOUT,
  initialOpen = false,
}: TicketTransitionFieldProps) {
  const [open, setOpen] = useState(initialOpen)
  const input = (
    <TransitionInput
      value={value}
      onChange={onChange}
      statuses={statuses}
      {...(provider ? { provider } : {})}
    />
  )

  if (layout === 'panel') {
    return (
      <Surface className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{TICKET_TRANSITION_FIELD.heading}</span>
          <StandingChip standing={standing} />
        </div>
        <span className="text-[12px] text-(--text-secondary)">{standing.text}</span>
        {input}
      </Surface>
    )
  }

  if (layout === 'fold') {
    return (
      <div className="rounded-md border border-(--border-subtle)">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-(--surface-raised)"
        >
          <span className="min-w-0 flex-1 text-sm font-medium">
            {TICKET_TRANSITION_FIELD.heading}
          </span>
          <StandingChip standing={standing} />
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-(--text-muted) ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open ? (
          <div className="flex flex-col gap-3 border-t border-(--border-subtle) p-3">
            <span className="text-[12px] text-(--text-secondary)">{standing.text}</span>
            {input}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {input}
      <div className="flex items-start gap-2">
        <StandingChip standing={standing} />
        <span className="min-w-0 text-[12px] text-(--text-secondary)">{standing.text}</span>
      </div>
    </div>
  )
}
