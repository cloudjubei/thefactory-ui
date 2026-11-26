import type { ChatContext, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'
import {
  fakeProcessRunsMatching,
  FAKE_REVIEW_RUN,
} from '../../src/fakeBackend/fixtures/processRuns'
import type { FixtureRoutes } from './onFixtures'

/**
 * How a review run and its own chat stand: its agent writing message after
 * message, the same with the person having asked for everything of that chat,
 * or the run stopped on a question that also waits as a card in the chat.
 */
export type RunChatStanding = 'agent-writing' | 'everything' | 'needs-you'

export const RUN_CHAT_STANDINGS: readonly {
  id: RunChatStanding
  title: string
  description: string
}[] = [
  {
    id: 'agent-writing',
    title: 'Run chat: agent writing',
    description:
      'The review’s agent wrote forty messages in the run’s own chat and the person read none: the run is quiet — no dot, no count — and its chat stays where it was in the chat list.',
  },
  {
    id: 'everything',
    title: 'Run chat: person asked for everything',
    description:
      'The look-alike base: the same forty messages once the person set that chat to Everything — the run carries its dot, and its chat moves up the chat list.',
  },
  {
    id: 'needs-you',
    title: 'Run chat: run needs you',
    description:
      'The same run stopped on its reviewer’s question, the same question waiting as a card in its chat: one Needs you, on the run.',
  },
]

/** The project the review is filed under: its runs list and its chat list show it. */
export const RUN_CHAT_PROJECT_ID = FAKE_REVIEW_RUN.projectId

const RUNNING: ProcessRun = { ...FAKE_REVIEW_RUN, alsoProjectIds: [] }

const STOPPED: ProcessRun = {
  ...RUNNING,
  status: 'parked',
  park: {
    reason: 'step-waiting',
    stepId: 'review',
    message: 'The reviewer has a question.',
    parkedAt: 0,
    ask: {
      kind: 'question',
      agent: 'reviewer',
      title: 'The reviewer has a question',
      detail: 'Which base branch should the review compare against?',
    },
  },
}

const RUN_CHAT: ChatContext = processRunChatContext(RUNNING)
const TOPIC: ChatContext = {
  type: 'PROJECT_TOPIC',
  projectId: RUN_CHAT_PROJECT_ID,
  topicId: 'release-notes',
}

const ROUTINE_TIMES = Array.from(
  { length: 40 },
  (_, i) => `2026-10-12T10:${String(i).padStart(2, '0')}:00.000Z`,
)

const runChat = (standing: RunChatStanding) => ({
  context: RUN_CHAT,
  title: RUNNING.title,
  createdAt: '2026-10-12T09:00:00.000Z',
  updatedAt: ROUTINE_TIMES[39],
  messageCount: ROUTINE_TIMES.length,
  messageTimes: ROUTINE_TIMES,
  needsYouTimes: [],
  ...(standing === 'everything' ? { notifyLevel: 'everything' } : {}),
})

const topicChat = {
  context: TOPIC,
  title: 'Release notes',
  createdAt: '2026-10-12T09:20:00.000Z',
  updatedAt: '2026-10-12T09:30:00.000Z',
  messageCount: 1,
  messageTimes: ['2026-10-12T09:30:00.000Z'],
  needsYouTimes: [],
}

/** When the person last opened the topic chat: its one message is read. */
export const RUN_CHAT_SEEN = { [getChatContextKey(TOPIC)]: '2026-10-12T09:45:00.000Z' }

/** The review as the only run, with its own chat and a topic chat, as the list routes answer them. */
export const runChatRoutes = (standing: RunChatStanding): FixtureRoutes => ({
  '/api/v1/process-runs': (_, query) =>
    fakeProcessRunsMatching(query, [standing === 'needs-you' ? STOPPED : RUNNING]),
  '/api/v1/chats/summaries': () => [runChat(standing), topicChat],
  '/api/v1/cli-runs/actions/pending-by-chat': () => ({
    counts: standing === 'needs-you' ? { [getChatContextKey(RUN_CHAT)]: 1 } : {},
  }),
})
