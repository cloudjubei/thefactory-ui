import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  processTryBuildDisplay,
  signoffCarriedView,
  verifyProofView,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { ProcessTryBuildPanel } from 'thefactory-ui/web'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import ProofScreens from '../../src/web/compound/process/ProofScreens'
import SignoffCarriedCard from '../../src/web/compound/process/signoff/SignoffCarriedCard'
import type { Scene } from '../showcase/types'
import {
  CARRIED_SIGNOFF_RUN,
  CARRIED_TRY_BUILD,
  CHECKS_BREAK_RUN,
  DEVELOPER_BREAK_RUN,
  PARTIAL_PROOF,
  PARTIAL_PROOF_RUN,
  PARTIAL_PROOF_TILES,
  POINTS_ONLY_SIGNOFF_RUN,
} from './readyAnswersFixtures'

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

function VerifyRow() {
  const view = verifyProofView(PARTIAL_PROOF, PARTIAL_PROOF_TILES, { standing: 'unchecked' })
  return <ProofScreens view={view} onOpen={noop} onRequestImage={noop} />
}

function Carried({ run, phone }: { run: ProcessRun; phone: boolean }) {
  const carried = signoffCarriedView([run])
  const display = phone ? processTryBuildDisplay(CARRIED_TRY_BUILD, null) : undefined
  return frame(
    <>
      {display ? <ProcessTryBuildPanel display={display} /> : null}
      {carried ? <SignoffCarriedCard view={carried} /> : null}
    </>,
  )
}

export const READY_ANSWER_SCENES: Scene[] = [
  {
    id: 'partial-proof-stop',
    title: 'Verify showed part of it',
    component: 'ParkBlock (ProcessPipeline) · PartialProofLists · ProofScreens',
    group: 'Process',
    description:
      'A verifier that showed some points and named others it could not show stops unchecked, never failed. What was shown counts; the rest is listed as not proven. Carrying on leads and puts the rest on the sign-off to try; verifying just those points again carries the verifier on.',
    states: [
      {
        id: 'stop',
        title: 'The stop',
        description:
          'Shown and Not shown lists, then “Carry on — try the rest at sign-off” in front and “Verify just these points again” beside it. Stop asks first.',
        render: () => park(PARTIAL_PROOF_RUN),
      },
      {
        id: 'verify-row',
        title: 'The verify row',
        description:
          'The counted pairs as thumbnails under Shown, and the points not shown in a dashed box marked as not proven.',
        render: () => frame(<VerifyRow />),
      },
    ],
  },
  {
    id: 'pre-existing-break-stop',
    title: 'Already broken before this change',
    component: 'ParkBlock (ProcessPipeline) · PreExistingBreakNotice',
    group: 'Process',
    description:
      'A check target that fails the same way on the base, in files the change does not touch. The stop names the files and checks and offers its ready answers: repair it in its own commit, leave this target out of the proof, or stop — and Stop asks first.',
    states: [
      {
        id: 'checks',
        title: 'Found by the checks',
        description:
          'The checks step stopped on it: “Repair it in its own commit” sends it to the developer; leaving it out carries on past the checks.',
        render: () => park(CHECKS_BREAK_RUN),
      },
      {
        id: 'developer',
        title: 'Found by the developer',
        description:
          'The developer ran the tests itself and the base confirmed it: the same card, answered to the waiting developer, no words needed.',
        render: () => park(DEVELOPER_BREAK_RUN),
      },
    ],
  },
  {
    id: 'signoff-carried',
    title: 'Sign-off: try these, left out',
    component: 'SignoffCarriedCard · ProcessTryBuildPanel',
    group: 'Process',
    description:
      'At the sign-off, beside the build to try: the points no proving step showed, carried on by a person — with what was shown — and the targets left out of the proof, with where they already failed. The phone block no longer repeats the points.',
    states: [
      {
        id: 'beside-phone-build',
        title: 'Beside the phone build',
        description: 'Try it on your phone, then Try these and Left out of the proof.',
        render: () => <Carried run={CARRIED_SIGNOFF_RUN} phone />,
      },
      {
        id: 'no-phone-build',
        title: 'No phone build',
        description: 'A web project: the same card on its own.',
        render: () => <Carried run={CARRIED_SIGNOFF_RUN} phone={false} />,
      },
      {
        id: 'points-only',
        title: 'Points to try only',
        description: 'Nothing was left out of the proof.',
        render: () => <Carried run={POINTS_ONLY_SIGNOFF_RUN} phone={false} />,
      },
    ],
  },
]
