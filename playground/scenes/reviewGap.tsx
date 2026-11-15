import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  signoffCarriedView,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import SignoffCarriedCard from '../../src/web/compound/process/signoff/SignoffCarriedCard'
import type { Scene } from '../showcase/types'
import {
  REVIEW_GAP_BLOCKED_RUN,
  REVIEW_GAP_CARRIED_RUN,
  REVIEW_GAP_FOLLOW_UPS_RUN,
  reviewGapRun,
} from './reviewGapFixtures'

const noop = () => {}
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
                <div className="flex max-w-[720px] flex-col gap-3 bg-(--surface-base) p-4">
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

function park(run: ProcessRun): ReactNode {
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

function Carried() {
  const carried = signoffCarriedView([REVIEW_GAP_CARRIED_RUN])
  return frame(carried ? <SignoffCarriedCard view={carried} /> : null)
}

export const REVIEW_GAP_SCENES: Scene[] = [
  {
    id: 'review-gap-stop',
    title: 'Code review asks for changes nothing sends back',
    component: 'ParkBlock (ProcessPipeline) · SignoffCarriedCard',
    group: 'Process',
    description:
      'A code review that asks for changes never passes. When nothing can be sent back — only the proof is missing, or every finding is a follow-up — the run stops at the review with ready answers: capture the proof again (the proving step before the review runs again, then the review reads it), carry on with the gap named at sign-off, or stop.',
    states: [
      {
        id: 'missing-proof',
        title: 'Only the proof is missing',
        description:
          '“Capture the proof again” leads and names the walkthrough it runs; “Carry on — name the gap at sign-off” says what the review still asks. Stop asks first.',
        render: () => park(reviewGapRun()),
      },
      {
        id: 'capture-blocked',
        title: 'Capturing again can’t work here yet',
        description:
          'The proof could not be captured for a reason that still holds, such as device automation being off: “Capture the proof again” is left out, “Try again” leads, and carrying on says what has to change first. It comes back once that changes.',
        render: () => park(REVIEW_GAP_BLOCKED_RUN),
      },
      {
        id: 'follow-ups-only',
        title: 'Every finding is a follow-up',
        description:
          'No recapture: “Try again” leads, carrying on names the gap, and “Accept with follow-ups filed” files what the review kept.',
        render: () => park(REVIEW_GAP_FOLLOW_UPS_RUN),
      },
      {
        id: 'carried-to-sign-off',
        title: 'Carried on: the sign-off names it',
        description:
          'The proof the review asked for goes under Try these at sign-off, not proven, beside the build to try.',
        render: () => <Carried />,
      },
    ],
  },
]
