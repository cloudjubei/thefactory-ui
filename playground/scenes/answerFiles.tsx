import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  WAITING_NOTE_COPY,
  type AnswerFilesSource,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the waiting card draws its composer itself. The showcase
// reaches into the source for it, as the playground renders the library from source.
import ParkNoteComposer from '../../src/web/compound/process/ParkNoteComposer'
import AgentQuestionCard from '../../src/web/compound/chat/AgentQuestionCard'
import type { PendingQuestionGrant } from '../../src/headless/utils/chatTypes'
import type { Scene } from '../showcase/types'

const noop = () => {}

/** Uploads and the project's files, faked: nothing leaves the page. */
const SOURCE: AnswerFilesSource = {
  upload: async (name) => `.factory/attachments/3f2a9c1d0b7e4a51/8c1d2e3f4a5b-${name}`,
  loadProjectFiles: async () => ['data/dev-set-ledger.json', 'docs/plan.md', 'src/index.ts'],
}

const ATTACHED = [
  '.factory/attachments/3f2a9c1d0b7e4a51/8c1d2e3f4a5b-emulator-log.txt',
  'data/dev-set-ledger.json',
]

const FULL = Array.from({ length: 10 }, (_, i) => `data/extract-${i + 1}.json`)

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** Signed out with no backend and no project in view: nothing is read, so each state draws only what it is given. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="w-[420px] max-w-full rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-3">
                  {children}
                </div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

const composer = (
  copy: (typeof WAITING_NOTE_COPY)[keyof typeof WAITING_NOTE_COPY],
  files: string[],
) => (
  <Frame>
    <ParkNoteComposer
      copy={copy}
      required
      answerFiles={SOURCE}
      initialFiles={files}
      onSend={noop}
      onCancel={noop}
    />
  </Frame>
)

/** A developer's question in its chat, answered in the person's own words with files handed over. */
const QUESTION_GRANT = {
  id: 'q-1',
  toolName: 'askUser',
  args: {},
  question: {
    question: 'Which emulator log should I read to see why the app crashes on start?',
    context: 'Two runs crashed; the logs on the device were rotated since.',
    options: [{ label: 'The newest one on the device' }, { label: 'Leave it — use logcat now' }],
  },
  decide: async () => {},
  answer: async () => {},
  answerFiles: SOURCE,
} as unknown as PendingQuestionGrant

const QUESTION_FILES = [
  '.factory/attachments/3f2a9c1d0b7e4a51/8c1d2e3f4a5b-crash-log.txt',
  'docs/crash-notes.md',
]

export const ANSWER_FILES_SCENES: Scene[] = [
  {
    id: 'answer-files',
    title: 'Answer with files',
    component: 'ParkNoteComposer',
    group: 'Process',
    description:
      'Answering a waiting agent — “Provide more info”, or “Answer” to its question — can hand it files: attached from this device or picked from the project. They are staged in its workspace at the same paths for its next turn, and it is told where they are.',
    states: [
      {
        id: 'more-info-empty',
        title: 'Provide more info — no files yet',
        description: 'The two ways to add a file sit under the answer.',
        render: () => composer(WAITING_NOTE_COPY.blocker, []),
      },
      {
        id: 'question-with-files',
        title: 'Answer — two files attached',
        description: 'An uploaded file and a project file, each a chip that can be taken off.',
        render: () => composer(WAITING_NOTE_COPY.question, ATTACHED),
      },
      {
        id: 'full',
        title: 'Ten files — the most one answer takes',
        description: 'Adding is held off, and says why.',
        render: () => composer(WAITING_NOTE_COPY.blocker, FULL),
      },
    ],
  },
  {
    id: 'question-card-files',
    title: 'Answer a question in its chat with files',
    component: 'AgentQuestionCard',
    group: 'Chat',
    description:
      'The question card in the agent’s chat takes files with an answer in the person’s own words, as the pipeline does: attached from this device or picked from the project. They reach the agent where it is waiting before the answer does, and the reply names them.',
    states: [
      {
        id: 'own-words-with-files',
        title: 'Own words — two files attached',
        description:
          'The agent’s options still send in one click; files go with an answer typed in the box.',
        render: () => (
          <Frame>
            <AgentQuestionCard
              grant={QUESTION_GRANT}
              initialOwnAnswer={{
                text: 'Read the attached crash log, and the notes on what we tried.',
                files: QUESTION_FILES,
              }}
            />
          </Frame>
        ),
      },
    ],
  },
]
