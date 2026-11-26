import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  type ProcessAnswerInFlight,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import type { ReviewCardMerge } from '../../src/headless/utils/colleagueReviewMergeTypes'
// Not on the package's public surface: the pipeline draws its stop itself. The showcase
// reaches into the source for it, as the playground renders the library from source.
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import { MergeSection } from '../../src/web/compound/chat/ColleagueReviewCard'
import type { Scene } from '../showcase/types'
import {
  MERGE_ASKED_DEVELOPER,
  MERGE_BEHIND_BASE,
  MERGE_RESOLVE_STARTING,
  MERGE_RESOLVING_IN_RUN,
  MERGE_STOPPED_ON_BASE,
  RUN_BASE_CHECKS_FAILED,
  RUN_MERGE_STOPPED_ON_BASE,
} from './mergeBaseStopFixtures'

const noop = () => {}
const handedOn = async () => true

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** Signed out with no backend: nothing is read, so each state draws only what it is given — the ask's composer included. */
const frame = (node: ReactNode) => (
  <AuthProvider storage={NO_TOKEN}>
    <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
      <AppSettingsProvider storage={MEMORY}>
        <ProjectsProvider>
          <FilesProvider>
            <MemoryRouter>
              <div className="max-w-[720px] p-4">{node}</div>
            </MemoryRouter>
          </FilesProvider>
        </ProjectsProvider>
      </AppSettingsProvider>
    </ApiProvider>
  </AuthProvider>
)

const section = (merge: ReviewCardMerge, askOpen = false) =>
  frame(
    <div className="rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3 text-[12.5px]">
      <MergeSection
        merge={merge}
        onStart={noop}
        onResolveHere={noop}
        onAsk={noop}
        askOpen={askOpen}
      />
    </div>,
  )

const park = (run: ProcessRun, answering?: ProcessAnswerInFlight) =>
  frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      {...(answering ? { answering } : {})}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={handedOn}
      onDrill={noop}
    />,
  )

export const MERGE_BASE_STOP_SCENES: Scene[] = [
  {
    id: 'merge-base-stop',
    title: 'A merge stopped on a pull request’s base',
    component: 'MergeSection (ColleagueReviewCard, GroupTicketPage) · ParkBlock (ProcessPipeline)',
    group: 'Process',
    description:
      'Approve & merge stops when GitHub will not merge a pull request because it conflicts with its base, or lacks its commits. The merge section — in the review chat and on the ticket page — and a review run’s stop offer the same two ways on: Resolve it here (the ticket’s review run brings the base in, resolves the conflict in a checkout of its own, runs its checks, waits for your push approval, then merges) and Ask the developer (a drafted message for the update’s Slack thread, edited before it is sent; the review then waits for their answer). Bringing the base in first runs the project’s build and type check on the merged result: a failure stops before anything is pushed, with what the check printed.',
    states: [
      {
        id: 'inline',
        title: 'Inline merge stopped on a conflict',
        description:
          'The backend’s pull request conflicts with main on two files; the rest are not merged. Resolve it here, or Ask Ana.',
        render: () => section(MERGE_STOPPED_ON_BASE),
      },
      {
        id: 'inline-ask',
        title: 'Asking the developer: the drafted message, editable',
        description:
          'Ask Ana opens the drafted message to edit before it is sent in the update’s thread.',
        render: () => section(MERGE_STOPPED_ON_BASE, true),
      },
      {
        id: 'inline-resolve-starting',
        title: 'Resolve it here, pressed',
        description: 'Shown at once while it goes through.',
        render: () => section(MERGE_RESOLVE_STARTING),
      },
      {
        id: 'inline-resolving',
        title: 'Resolving it in the review run',
        description: 'The review run brings main in; its card asks before pushing the resolution.',
        render: () => section(MERGE_RESOLVING_IN_RUN),
      },
      {
        id: 'inline-asked',
        title: 'Asked the developer',
        description: 'The message is in the update’s thread, linked; the review waits for Ana.',
        render: () => section(MERGE_ASKED_DEVELOPER),
      },
      {
        id: 'inline-behind',
        title: 'Behind its base, nothing conflicting',
        description:
          'The head only lacks main’s commits: the stop says it is behind, and the developer is not known by name.',
        render: () => section(MERGE_BEHIND_BASE),
      },
      {
        id: 'run-stop',
        title: 'A review run’s merge stopped on a conflict',
        description:
          'The run’s stop offers Resolve it here and Ask Ana beside Try again. Ask Ana opens the drafted message to edit (pick Ask Ana, then press it), then sends it as the round’s reply.',
        render: () => park(RUN_MERGE_STOPPED_ON_BASE),
      },
      {
        id: 'run-stop-answer-sent',
        title: 'Resolve it here, sent and not answered yet',
        description:
          'Pressed, the way on shows it is being carried out before the host replies: the stop says “Carrying on…”, Resolve it here shows the spinner, and the other answers wait. Pressing again sends nothing.',
        render: () =>
          park(RUN_MERGE_STOPPED_ON_BASE, { choice: 'retry', recovery: 'resolve-here' }),
      },
      {
        id: 'run-checks-failed',
        title: 'Bringing the base in fails the type check',
        description:
          'The merged result of main and the web app’s branch fails its type check (an e2e spec uses a removed selector): nothing was brought in, and the stop shows what the check printed.',
        render: () => park(RUN_BASE_CHECKS_FAILED),
      },
    ],
  },
]
