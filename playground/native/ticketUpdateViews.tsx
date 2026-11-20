import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { ticketUpdateCard, type TicketUpdateState } from 'thefactory-ui/headless'
import TicketUpdateCard from '../../src/native/compound/process/TicketUpdateCard'
import { TICKET_UPDATE_STATES, type TicketUpdateStateId } from '../scenes/ticketUpdateFixtures'
import type { NativeView } from './views'

function Card({ id }: { id: TicketUpdateStateId }) {
  const [held, setHeld] = useState<TicketUpdateState>(TICKET_UPDATE_STATES[id])
  const view = ticketUpdateCard(held)
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>
        {view ? (
          <TicketUpdateCard
            view={view}
            onPost={() => setHeld((was) => ({ ...was, posting: true, error: null }))}
          />
        ) : null}
      </View>
    </ScrollView>
  )
}

/**
 * Post the ticket update on a phone, at `?view=ticket-update&state=` one of the
 * web scene's: ready, blocked, no-channel, not-written, thread, posting, posted or refused.
 */
export const TICKET_UPDATE_VIEWS: NativeView[] = [
  {
    id: 'ticket-update',
    title: 'Post the ticket update',
    render: (address) => {
      const asked = address.get('state') ?? 'ready'
      const id = (asked in TICKET_UPDATE_STATES ? asked : 'ready') as TicketUpdateStateId
      return <Card key={id} id={id} />
    },
  },
]
