import ChatList from '../../src/native/compound/chat/ChatList'
import ProcessRunsView from '../../src/native/screens/ProcessRunsView'
import { OnFixtures } from '../scenes/onFixtures'
import {
  RUN_CHAT_PROJECT_ID,
  RUN_CHAT_SEEN,
  RUN_CHAT_STANDINGS,
  runChatRoutes,
} from '../scenes/runChatQuietFixtures'
import type { NativeView } from './views'

const noop = () => {}
const SCOPE = { kind: 'project', projectId: RUN_CHAT_PROJECT_ID } as const

/** A run's own chat stays quiet until its run needs the person. Native peers of the `project-runs` run-chat states and the `chat-list-run-chat` scene. */
export const RUN_CHAT_QUIET_VIEWS: readonly NativeView[] = RUN_CHAT_STANDINGS.flatMap(
  (standing) => [
    {
      id: `project-runs-run-chat-${standing.id}`,
      title: `Project runs list — ${standing.title}`,
      render: () => (
        <OnFixtures routes={runChatRoutes(standing.id)}>
          <ProcessRunsView
            projectId={RUN_CHAT_PROJECT_ID}
            chatsSeen={RUN_CHAT_SEEN}
            onSelectRun={noop}
            onOpenSettings={noop}
          />
        </OnFixtures>
      ),
    },
    {
      id: `chat-list-run-chat-${standing.id}`,
      title: `Chat list — ${standing.title}`,
      render: () => (
        <OnFixtures routes={runChatRoutes(standing.id)}>
          <ChatList scope={SCOPE} seen={RUN_CHAT_SEEN} onOpen={noop} />
        </OnFixtures>
      ),
    },
  ],
)
