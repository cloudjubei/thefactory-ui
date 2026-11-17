import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { WaitingCard } from '../../src/web/compound/process/ProcessPipeline'
import { RETRY_DEFINITIONS_NEWER } from './retryDefinitionsFixtures'
import { WAITING_RETRY_PICK, WAITING_RETRY_VIEW } from './waitingRetryNoteFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}
const handedOn = async () => true
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/**
 * The waiting card with Current selected, and with the note open on that pick.
 *
 * Web, no login:
 * - /?scene=waiting-retry-note&state=current — Current is selected. The note is closed.
 * - &state=note — the note composer is open, and Current stays selected above it.
 *   The note sends that pick. There is no readout of the resume body.
 *
 * Native: ?view=waiting-retry-note&state=current|note
 */
function Card({ noteOpen }: { noteOpen: boolean }): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="max-w-[720px] bg-(--surface-base) p-4">
                  <WaitingCard
                    view={WAITING_RETRY_VIEW}
                    managerLine={undefined}
                    retry={{
                      definitions: RETRY_DEFINITIONS_NEWER,
                      pick: WAITING_RETRY_PICK,
                      onPick: noop,
                    }}
                    {...(noteOpen ? { noteForStart: 'retry' as const } : {})}
                    onChoose={noop}
                    onChangeProof={noop}
                    onAnswerRequest={noop}
                    onDelegate={handedOn}
                  />
                </div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

export const WAITING_RETRY_NOTE_SCENES: Scene[] = [
  {
    id: 'waiting-retry-note',
    title: 'A waiting card’s own answer for a retry',
    component: 'WaitingCard (ProcessPipeline)',
    group: 'Process',
    description:
      'The waiting card on a stopped reviewer, with Current selected — the same pick as the retry card’s current state. Writing your own answer opens the note, and the note sends that pick. The versions stay on the card while the note is open. Each state is its own address; nothing is clicked. There is no readout of the resume body.',
    states: [
      {
        id: 'current',
        title: 'Current selected',
        description:
          'Current is selected: Reviewer, version 7 and Feature, version 2. Try again and writing your own answer both send that pick.',
        render: () => <Card noteOpen={false} />,
      },
      {
        id: 'note',
        title: 'Own answer, note open',
        description:
          'The note composer is open on that retry, and Current stays selected above it. The note sends that pick.',
        render: () => <Card noteOpen />,
      },
    ],
  },
]
