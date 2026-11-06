import { chatContextTickets, ticketChipView } from 'thefactory-ui/headless'
import { ContextInfoButton, RichText } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const URL = 'https://zenor.atlassian.net/browse/ZNR-780'
const TICKET = chatContextTickets({
  metadata: { ticket: { provider: 'jira', externalId: 'ZNR-780', url: URL } },
})
const TWO_TICKETS = [
  ...TICKET,
  ticketChipView({ key: 'ZNR-693', title: 'Compare the newer models', url: URL }),
]

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-(--accent-primary) px-3 py-2 text-sm text-white">
        <RichText text={text} />
      </div>
    </div>
  )
}

export const CHAT_TICKET_SCENES: Scene[] = [
  {
    id: 'chat-ticket-context',
    title: 'A ticket in its chat',
    component: 'ContextInfoButton, RichText',
    group: 'Chat',
    description:
      'A chat started from a ticket says only what the person wants, with the ticket as a link; how the agent works it sits in the prompt. The "i" dropdown shows the ticket first.',
    states: [
      {
        id: 'discuss-message',
        title: 'Discuss message',
        render: () => <UserMessage text={`Let's discuss [ZNR-780](${URL}).`} />,
      },
      {
        id: 'plan-message',
        title: 'Plan message',
        render: () => <UserMessage text={`Let's plan [ZNR-780](${URL}).`} />,
      },
      {
        id: 'dropdown-ticket',
        title: 'Dropdown with its ticket',
        render: () => <ContextInfoButton tickets={TICKET} label="ZNR-780" />,
      },
      {
        id: 'dropdown-tickets',
        title: 'Dropdown with two tickets',
        render: () => <ContextInfoButton tickets={TWO_TICKETS} label="Two tickets" />,
      },
      {
        id: 'dropdown-none',
        title: 'Dropdown with nothing',
        render: () => <ContextInfoButton label="Nothing" />,
      },
    ],
  },
]
