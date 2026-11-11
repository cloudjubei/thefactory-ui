import { useEffect, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FilesProvider, processRunLaunchGrant, useProjects } from 'thefactory-ui/headless'
import { ProcessesView } from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import { StepSidePanelView } from '../../src/web/compound/process/pipeline/StepSidePanel'
import { FAKE_PROCESS_LIBRARY } from '../../src/fakeBackend/fixtures/processLibrary'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_AGENT_VALUES,
  FAKE_SCRIPT_NOTES,
  FAKE_SCRIPT_RUN_ID,
  FAKE_SCRIPT_STEP_ID,
  FAKE_SCRIPT_TEXTS,
  FAKE_SCRIPT_VALUES,
  fakeScriptEvidence,
  fakeScriptPreview,
  fakeScriptRun,
  type FakeScriptStepState,
} from '../../src/fakeBackend/fixtures/scriptStepRun'
import type { Scene } from '../showcase/types'
import { Click } from './clickOnce'
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

/** The launch card of a process with a choice input, its form filled as the state says. */
function Launch({ id, asked }: { id: string; asked: Record<string, unknown> }) {
  const grant = {
    ...processRunLaunchGrant({
      processId: 'check-a-flow',
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
        'POST /api/v1/process-runs/preview': () => fakeScriptPreview(),
        '/api/v1/projects/{projectId}/notes': () => FAKE_SCRIPT_NOTES,
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

/** The step panel of a script step, reading its run's filings. */
function ScriptStep({ state }: { state: FakeScriptStepState }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/process-runs/{runId}/evidence': () => fakeScriptEvidence(state),
        'POST /api/v1/projects/{projectId}/review-evidence/texts': (_, __, body) =>
          ((body as { ids?: string[] })?.ids ?? []).flatMap((id) =>
            FAKE_SCRIPT_TEXTS[id] ? [{ id, text: FAKE_SCRIPT_TEXTS[id] }] : [],
          ),
        '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': () => '',
      }}
    >
      <div className="relative h-[880px] max-w-[760px] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)">
        <StepSidePanelView
          run={fakeScriptRun(state)}
          target={{ runId: FAKE_SCRIPT_RUN_ID, stepId: FAKE_SCRIPT_STEP_ID }}
          onClose={noop}
        />
      </div>
    </OnFixtures>
  )
}

/** The process library of a project in a group, open on a process, its editor opened when `open` says. */
function Library({ selected, open }: { selected?: string; open?: string }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/processes': () => FAKE_PROCESS_LIBRARY,
        '/api/v1/process-runs/statistics': () => [],
      }}
    >
      <MemoryRouter>
        <div className="h-[560px] w-full">
          <InProject>
            <Click label={open}>
              <ProcessesView {...(selected ? { selectedProcessId: selected } : {})} />
            </Click>
          </InProject>
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

export const SCRIPT_STEP_SCENES: Scene[] = [
  {
    id: 'choice-launch',
    title: 'Launch card: a choice input',
    component: 'ProcessRunLaunchPanel, ProcessLaunchFields',
    group: 'Process',
    description:
      'A process whose launch asks How it runs: a switch, Script by default or Agent, drawn first since it decides what else the card asks. Script shows the Script note, required; Agent hides it and the launch leaves it out.',
    states: [
      {
        id: 'script',
        title: 'Script',
        description: 'The default. The Script note is asked for, with no "optional" mark.',
        render: () => <Launch id="script" asked={FAKE_SCRIPT_VALUES} />,
      },
      {
        id: 'script-missing',
        title: 'Script, none picked',
        description: 'Start run waits and says the Script is needed while Script is on.',
        render: () => (
          <Launch id="script-missing" asked={{ ...FAKE_SCRIPT_VALUES, scriptNote: '' }} />
        ),
      },
      {
        id: 'agent',
        title: 'Agent',
        description: 'No Script field, none sent.',
        render: () => <Launch id="agent" asked={FAKE_AGENT_VALUES} />,
      },
    ],
  },
  {
    id: 'script-step',
    title: 'A script step’s log',
    component: 'StepSidePanel, ScriptStepLog',
    group: 'Process',
    description:
      'Story bad1678e. The step panel of any script step, read from its step log and recording on GET /process-runs/:runId/evidence. A summary line (sections · asks, how many live · take-overs) and total cost, the recording, then a row per section that opens on a click: each line with its kind badge, title, detail, items, Pinned or Live for an ask, and its cost. A section with a take-over carries its worst outcome on the folded row. The last section starts open.',
    states: [
      {
        id: 'two-sections',
        title: 'Two sections',
        description: 'Sign in and Settings, run to the end: one pinned ask, two live.',
        render: () => <ScriptStep state="two-sections" />,
      },
      {
        id: 'stopped',
        title: 'Stopped',
        description:
          'A take-over failed in Settings: the section says Take-over failed, and the screenshot of where it stopped shows under the recording.',
        render: () => <ScriptStep state="stopped" />,
      },
      {
        id: 'take-overs',
        title: 'Past take-overs',
        description:
          'Two agents took over and handed back, in Settings and Sign out; the run went on to the end.',
        render: () => <ScriptStep state="take-overs" />,
      },
    ],
  },
  {
    id: 'process-library-scopes',
    title: 'Processes: shared, group and project',
    component: 'ProcessesView',
    group: 'Process',
    description:
      'Story bad1678e. The Processes tab of a project in a group. Each row says where its process is kept: SHARED, the group by its name, THIS PROJECT, or which copy it overrides. A group or project copy can be removed; a shared one only copied. Editing in a project with a group offers Save to: This project or the group, and says what a save forks.',
    states: [
      {
        id: 'list',
        title: 'The list',
        description: 'Six rows, one of each kind of copy.',
        render: () => <Library />,
      },
      {
        id: 'group-copy',
        title: 'A group copy',
        description:
          'The group’s copy of a shared process: the note says removing it brings the shared one back, and Remove the group’s copy is offered.',
        render: () => <Library selected="feature" />,
      },
      {
        id: 'project-over-group',
        title: 'A project copy over the group’s',
        description: 'OVERRIDES GROUP; removing it brings the group’s one back.',
        render: () => <Library selected="hotfix" />,
      },
      {
        id: 'edit-group-copy',
        title: 'Editing a group copy',
        description:
          'Save to starts on the group. Switching to This project shows that the save makes this project its own copy.',
        render: () => <Library selected="release" open="Edit" />,
      },
      {
        id: 'edit-shared',
        title: 'Editing a shared process',
        description:
          'Save to starts on This project, and says the shared process is left as it is.',
        render: () => <Library selected="story" open="Copy from…" />,
      },
    ],
  },
]
