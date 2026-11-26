import { MemoryRouter } from 'react-router-dom'
import {
  chatHeaderView,
  FilesProvider,
  processRunChatContext,
  RUN_CHAT_PLACEHOLDER,
  RUN_CHAT_TITLE,
} from 'thefactory-ui/headless'
import { ChatHeader, ChatInput, MessageRow } from 'thefactory-ui/web'
// Not on the package's public surface: the chat draws a question itself. The showcase
// reaches into the source for it, as the playground renders the library from source.
import AgentQuestionCard from '../../src/web/compound/chat/AgentQuestionCard'
import ProcessPipeline from '../../src/web/compound/process/ProcessPipeline'
import type { Scene, SceneState } from '../showcase/types'
import { ClickEach } from './clickOnce'
import { OnFixtures } from './onFixtures'
import {
  REVIEW_RUN_PAGE_CLICKS,
  REVIEW_RUN_PAGE_ID,
  reviewRunPageRoutes,
  RUN_CHAT_MESSAGES,
  RUN_CHAT_QUESTION,
  RUN_REVIEWING,
  type ReviewRunPageCase,
} from './reviewRunPageFixtures'

const noop = () => {}
const NOW = Date.parse('2026-11-17T11:30:00.000Z')

type Host = 'dock' | 'phone' | 'no-chat'

/**
 * The run's own chat as the host docks it beside the run: the slim header,
 * what the review step said, and the composer — or, while the agent asks, its
 * question in the composer's place, answered there.
 */
function RunChat({ asks, onClose }: { asks: boolean; onClose: () => void }) {
  const messages = [...RUN_CHAT_MESSAGES]
  return (
    <div className="flex h-full min-h-0 flex-col bg-(--surface-base)">
      <ChatHeader
        view={chatHeaderView({
          context: processRunChatContext(RUN_REVIEWING),
          chatTitle: `Run: ${RUN_REVIEWING.title}`,
          projectName: 'Coach backend',
          run: RUN_REVIEWING,
          now: NOW,
        })}
        dockedLabel={RUN_CHAT_TITLE}
        onCollapse={onClose}
        onMaximize={noop}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            globalIndex={i}
            totalMessages={messages.length}
            isThinking={!asks && i === messages.length - 1}
            isLast={i === messages.length - 1}
            prevUserMessagesLen={messages.length}
            enhancedTotalLength={messages.length}
          />
        ))}
      </div>
      {asks ? (
        <div className="border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
          <AgentQuestionCard grant={RUN_CHAT_QUESTION} />
        </div>
      ) : (
        <ChatInput value="" onChange={noop} onSend={noop} placeholder={RUN_CHAT_PLACEHOLDER} />
      )}
    </div>
  )
}

function Page({ which, host }: { which: ReviewRunPageCase; host: Host }) {
  const phone = host === 'phone'
  return (
    <OnFixtures routes={reviewRunPageRoutes(which)}>
      <FilesProvider>
        <MemoryRouter>
          <div
            className={`${phone ? 'h-[860px] w-[390px]' : 'h-[820px] w-full max-w-[1280px]'} overflow-hidden`}
          >
            <ClickEach labels={REVIEW_RUN_PAGE_CLICKS[which]}>
              <ProcessPipeline
                runId={REVIEW_RUN_PAGE_ID}
                narrow={phone}
                {...(host === 'no-chat'
                  ? {}
                  : {
                      renderChat: (_context, onClose) => (
                        <RunChat asks={which === 'ask-pending'} onClose={onClose} />
                      ),
                    })}
              />
            </ClickEach>
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

const CASES: { id: ReviewRunPageCase; title: string; description: string; hosts: Host[] }[] = [
  {
    id: 'review-working',
    title: 'The review works: its conversation beside the run',
    description:
      'The Review step is turns of the run’s own chat, so that chat is its conversation: while the step works it docks beside the run by itself — once per pass, so closing it holds — and the step’s row opens it again. On a small screen, or in a host that renders no chat, the page says so in a row instead: “Review · Working”, opening the chat where the host can.',
    hosts: ['dock', 'phone', 'no-chat'],
  },
  {
    id: 'ask-pending',
    title: 'The agent asks: answered beside the run',
    description:
      'An ask waiting in the run’s chat — a question, a tool approval — docks the chat by itself, where it is answered on the chat’s own card: no second approval UI on the run’s page. On a small screen the page leads with a tinted row, “Review · Waiting for your answer”, whose press opens the chat.',
    hosts: ['dock', 'phone'],
  },
  {
    id: 'approval',
    title: 'Your approval, the reply to edit',
    description:
      'The round is recorded: the verdict, the drafted reply to edit, and Send the reply, Approve & merge, Keep reviewing with a note, or Stop. Nothing is posted or merged before you choose.',
    hosts: ['dock', 'phone'],
  },
  {
    id: 'waiting-developer',
    title: 'Waiting for the developer',
    description:
      'The reply is posted: the run is on hold until someone other than you answers in the thread, then says so here and offers the next round.',
    hosts: ['dock', 'phone'],
  },
  {
    id: 'base-failed',
    title: 'Bringing the base in failed: resolve it here, ask the developer, or stop',
    description:
      'With dev merged in, coach-be #390 fails its type check and the run’s agent could not fix it. The stop shows the pull request with what failed and what it printed, then the stop’s own answers: Try again, Resolve it here, Ask Ana, and Stop here.',
    hosts: ['dock', 'phone'],
  },
  {
    id: 'base-failed-note',
    title: 'Resolve it here, with a note for the agent',
    description:
      'Resolve it here tries again in the same checkout. Add a note opens an optional field: what is written reaches the agent with the try.',
    hosts: ['dock'],
  },
  {
    id: 'base-failed-ask',
    title: 'Ask Ana: the drafted message to edit',
    description:
      'The ask is drafted from what failed; it is posted as the round’s reply, as edited, and the run waits for the answer.',
    hosts: ['dock'],
  },
  {
    id: 'push-after-fix',
    title: 'Approve the push of a checks fix',
    description:
      'Nothing conflicted, but the merged result failed its checks and the agent fixed it: the row reads Fixed, lists no conflicted files, and shows the fix’s changes and its checks before Approve push.',
    hosts: ['dock', 'phone'],
  },
  {
    id: 'merging',
    title: 'Merging: pull request by pull request',
    description:
      'The round’s approve-and-merge on the run’s own page while the run works: each pull request as it goes, the one merged, the next waiting on its checks.',
    hosts: ['dock', 'phone'],
  },
]

const HOST_SUFFIX: Record<Host, string> = { dock: '', phone: '-phone', 'no-chat': '-no-chat' }
const HOST_TITLE: Record<Host, string> = {
  dock: '',
  phone: ', phone',
  'no-chat': ', a host that renders no chat',
}

const states: SceneState[] = CASES.flatMap((one) =>
  one.hosts.map((host) => ({
    id: `${one.id}${HOST_SUFFIX[host]}`,
    title: `${one.title}${HOST_TITLE[host]}`,
    ...(host === 'dock' ? { description: one.description } : {}),
    render: () => <Page which={one.id} host={host} />,
  })),
)

export const REVIEW_RUN_PAGE_SCENES: Scene[] = [
  {
    id: 'review-run-page',
    title: 'A colleague review run on its page',
    component:
      'ProcessPipeline (RunConversationCard · RunReviewMergeProgress · ParkBlock · ReviewBranchRows)',
    group: 'Process',
    kind: 'screen',
    wide: true,
    description:
      'A review started as a process is all on its run’s page — no chat of the ticket’s is opened for it. The review agent’s conversation is the run’s own chat, shown beside the run while it works or asks; every stop is a card on the page: the approval with the reply to edit, bringing the base in failing with Resolve it here / Ask the developer / Stop, the push to approve — of a conflict resolved or of a checks fix — the wait for the developer, and the merge followed pull request by pull request.',
    states,
  },
]
