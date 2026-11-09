import { useEffect, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FilesProvider, processRunLaunchGrant, useProjects } from 'thefactory-ui/headless'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import { StepSidePanelView } from '../../src/web/compound/process/pipeline/StepSidePanel'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_AGENT_VALUES,
  FAKE_SCRIPTED_NOTES,
  FAKE_SCRIPTED_RUN_ID,
  FAKE_SCRIPTED_STEP_ID,
  FAKE_SCRIPTED_TEXTS,
  FAKE_SCRIPTED_VALUES,
  fakeScriptedEvidence,
  fakeScriptedPreview,
  fakeScriptedRun,
  type FakeScriptedState,
} from '../../src/fakeBackend/fixtures/scriptedRun'
import type { Scene } from '../showcase/types'
import { OnFixtures } from './onFixtures'

const noop = () => {}

function InProject({ children }: { children: ReactNode }) {
  const { projects, activeProjectId, setActiveProjectId } = useProjects()
  useEffect(() => {
    if (projects.length > 0 && activeProjectId !== FAKE_PROJECT_ID) {
      setActiveProjectId(FAKE_PROJECT_ID)
    }
  }, [projects, activeProjectId, setActiveProjectId])
  return activeProjectId === FAKE_PROJECT_ID ? children : null
}

/** The compare-variants launch card, its form filled as the state says, under a key of its own. */
function Launch({ id, asked }: { id: string; asked: Record<string, unknown> }) {
  const grant = {
    ...processRunLaunchGrant({
      processId: 'compare-variants',
      chatRunner: 'cli',
      agent: { inputValues: asked },
      onLaunch: async () => {},
      onCancel: noop,
    }),
    id: `scene:${id}`,
  }
  return (
    <OnFixtures
      routes={{
        'POST /api/v1/process-runs/preview': () => fakeScriptedPreview(),
        '/api/v1/projects/{projectId}/notes': () => FAKE_SCRIPTED_NOTES,
        '/api/v1/process-runs/statistics': () => [],
      }}
    >
      <FilesProvider>
        <MemoryRouter>
          <div className="w-full max-w-[720px]">
            <InProject>
              <ApprovalPanel grant={grant} projectId={FAKE_PROJECT_ID} onDecideLater={noop} />
            </InProject>
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The step panel of the scripted step, over its variant's page, reading its run's filings. */
function ScriptStep({ state }: { state: FakeScriptedState }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/process-runs/{runId}/evidence': () => fakeScriptedEvidence(state),
        'POST /api/v1/projects/{projectId}/review-evidence/texts': (_, __, body) =>
          ((body as { ids?: string[] })?.ids ?? []).flatMap((id) =>
            FAKE_SCRIPTED_TEXTS[id] ? [{ id, text: FAKE_SCRIPTED_TEXTS[id] }] : [],
          ),
        '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': () => '',
      }}
    >
      <div className="relative h-[880px] max-w-[760px] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)">
        <StepSidePanelView
          run={fakeScriptedRun(state)}
          target={{ runId: FAKE_SCRIPTED_RUN_ID, stepId: FAKE_SCRIPTED_STEP_ID }}
          onClose={noop}
        />
      </div>
    </OnFixtures>
  )
}

export const SCRIPTED_RUN_SCENES: Scene[] = [
  {
    id: 'scripted-launch',
    title: 'Launch card: how the days are lived',
    component: 'ProcessRunLaunchPanel, ProcessLaunchFields',
    group: 'Process',
    description:
      'Story 9d5fcdb8, feature f9138472. Compare variants v2 asks how the days are lived: a switch, Scripted by default or Agent (legacy), drawn first since it decides what else the card asks. Scripted shows the Journey script note, required; Agent hides it and the launch leaves it out.',
    states: [
      {
        id: 'scripted',
        title: 'Scripted',
        description: 'The default. The journey script note is asked for, with no "optional" mark.',
        render: () => <Launch id="scripted" asked={FAKE_SCRIPTED_VALUES} />,
      },
      {
        id: 'scripted-no-script',
        title: 'Scripted, no script yet',
        description: 'Start run waits and says the journey script is needed while Scripted is on.',
        render: () => (
          <Launch id="scripted-no-script" asked={{ ...FAKE_SCRIPTED_VALUES, journeyScript: '' }} />
        ),
      },
      {
        id: 'agent',
        title: 'Agent (legacy)',
        description: 'The agent lives the days as before: no journey script field, none sent.',
        render: () => <Launch id="agent" asked={FAKE_AGENT_VALUES} />,
      },
    ],
  },
  {
    id: 'scripted-step',
    title: 'A script step’s days',
    component: 'StepSidePanel, JourneyStepDays',
    group: 'Process',
    description:
      'Story 9d5fcdb8, feature a9658c63. The step panel of a scripted Live the days, read from its day log and recording on GET /process-runs/:runId/evidence. A total line and cost, the recording, then a row per day that opens on a click: goals offered, removed, replaced (from → to, why), accepted, statuses, journal, evening question, cards, take-overs with how they ended, and each decision marked Plan or Live with its cost. The last day starts open.',
    states: [
      {
        id: 'two-days',
        title: 'Two days lived',
        description:
          'Day 1 replaces a goal and has an agent take over past a rating dialog, then hand back; day 2 removes one.',
        render: () => <ScriptStep state="lived" />,
      },
      {
        id: 'stopped',
        title: 'Stopped short',
        description:
          'A take-over failed on day 2: the day says Failed, and the screenshot of where it stopped shows under the recording.',
        render: () => <ScriptStep state="stopped" />,
      },
    ],
  },
]
