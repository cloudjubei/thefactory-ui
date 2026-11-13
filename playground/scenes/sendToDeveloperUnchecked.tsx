import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  parkNoteCopy,
  parkNoteRequired,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import ParkNoteComposer from '../../src/web/compound/process/ParkNoteComposer'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'
import { SEND_TO_DEVELOPER_SPENT_RUN, sendToDeveloperRun } from './sendToDeveloperUncheckedFixtures'

const noop = () => {}
const resolved = async () => {}
const handedOn = async () => true
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** Signed out with no backend and no project in view: each state draws only what it is given. */
function frame(children: ReactNode): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="max-w-[720px] bg-(--surface-base) p-4">{children}</div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

function park(run: ReturnType<typeof sendToDeveloperRun>): ReactNode {
  return frame(
    <ParkBlock
      run={run}
      managerLine={undefined}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={handedOn}
      onDrill={noop}
    />,
  )
}

export const SEND_TO_DEVELOPER_UNCHECKED_SCENES: Scene[] = [
  {
    id: 'send-to-developer-unchecked',
    title: 'Send to the developer when Verify could not check',
    component: 'ParkBlock (ProcessPipeline) · ParkNoteComposer',
    group: 'Process',
    description:
      'Verify could not check anything because the fake data grew on a timer (Covision run 59d1109e). The fix is the developer’s, so the stop offers “Send to the developer”: the person says what to change, the developer gets that and why Verify could not check, then the checks, the code review and Verify run again. It counts as one pass back, as a failed Verify would.',
    states: [
      {
        id: 'stop-offers-send',
        title: 'Verify could not check: “Send to the developer” is offered',
        description:
          '“Send to the developer” sits after “Try again” and “Accept and carry on”, before “Stop here”.',
        render: () => park(sendToDeveloperRun()),
      },
      {
        id: 'note-required',
        title: 'What should the developer change?',
        description:
          'Choosing it opens the note in place of the choices. The note is required: “Send to the developer” stays off while it is blank.',
        render: () =>
          frame(
            <ParkNoteComposer
              copy={parkNoteCopy('send-to-developer', { noteRequired: true })}
              required={parkNoteRequired('send-to-developer', { noteRequired: true })}
              onSend={noop}
              onCancel={noop}
            />,
          ),
      },
      {
        id: 'loop-spent',
        title: 'Passes back to the developer spent: not offered',
        description:
          'Once Verify has sent the work back as many times as its loop allows, the answer is not offered, as a failed Verify would stop there too. “Try again” and “Stop here” stay.',
        render: () => park(SEND_TO_DEVELOPER_SPENT_RUN),
      },
    ],
  },
]
