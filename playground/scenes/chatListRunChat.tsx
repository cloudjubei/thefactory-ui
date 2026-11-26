import { ChatList } from 'thefactory-ui/web'
import { OnFixtures } from './onFixtures'
import { RUN_CHAT_PROJECT_ID, RUN_CHAT_STANDINGS, runChatRoutes } from './runChatQuietFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}
const SCOPE = { kind: 'project', projectId: RUN_CHAT_PROJECT_ID } as const

export const CHAT_LIST_RUN_CHAT_SCENES: Scene[] = [
  {
    id: 'chat-list-run-chat',
    title: 'A process run’s chat in the chat list',
    component: 'ChatList',
    group: 'Chat',
    description:
      'A process run’s own chat holds a long conversation of its agent’s. None of it is news in the chat list: the row carries no badge and no dot, and messages do not move it up — what the run needs from the person is told once, on the run. Web, desktop and mobile draw the same rows.',
    states: RUN_CHAT_STANDINGS.map((standing) => ({
      id: standing.id,
      title: standing.title,
      description: standing.description,
      render: () => (
        <OnFixtures routes={runChatRoutes(standing.id)}>
          <div
            className="flex h-[300px] flex-col overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)"
            style={{ width: 340 }}
          >
            <ChatList scope={SCOPE} onOpen={noop} />
          </div>
        </OnFixtures>
      ),
    })),
  },
]
