import { useState, type ReactNode } from 'react'
import { ticketUpdateCard, type TicketUpdateState } from 'thefactory-ui/headless'
import { TicketUpdateCard } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import {
  TICKET_UPDATE_STATES,
  TICKET_UPDATE_STATE_TEXT,
  type TicketUpdateStateId,
} from './ticketUpdateFixtures'

const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

/** The card in one state; confirming a post shows it going at once, as the store does. */
export function TicketUpdateDemo({
  id,
  confirming = false,
}: {
  id: TicketUpdateStateId
  confirming?: boolean
}) {
  const [held, setHeld] = useState<TicketUpdateState>(TICKET_UPDATE_STATES[id])
  const view = ticketUpdateCard(held)
  if (!view) return null
  return (
    <TicketUpdateCard
      view={view}
      initialConfirming={confirming}
      onPost={() => setHeld((was) => ({ ...was, posting: true, error: null }))}
    />
  )
}

const states: SceneState[] = [
  ...(Object.keys(TICKET_UPDATE_STATE_TEXT) as TicketUpdateStateId[]).map((id) => ({
    id,
    ...TICKET_UPDATE_STATE_TEXT[id],
    render: () => page(<TicketUpdateDemo id={id} />),
  })),
  {
    id: 'confirm',
    title: 'The confirm',
    description: 'Post to #shop-team? It goes out as the person, word for word.',
    overlay: true,
    render: () => page(<TicketUpdateDemo id="ready" confirming />),
  },
  {
    id: 'ready-phone',
    title: 'Ready to post, on a phone',
    description: 'The small-screen width: the mobile app’s native card follows this.',
    render: () => phone(<TicketUpdateDemo id="ready" />),
  },
  {
    id: 'posted-phone',
    title: 'Posted, on a phone',
    render: () => phone(<TicketUpdateDemo id="posted" />),
  },
]

export const TICKET_UPDATE_SCENES: Scene[] = [
  {
    id: 'ticket-update',
    title: 'Post the ticket update',
    component: 'TicketUpdateCard',
    group: 'Process',
    description:
      'On a run’s or a group run’s sign-off, once every repo of the ticket is at its sign-off with its pull request open: the shared post word for word, the Slack channel it goes to, what holds it back, a confirm, and where it went. It posts as the person, once. Never shown for one repo early.',
    states,
  },
]
