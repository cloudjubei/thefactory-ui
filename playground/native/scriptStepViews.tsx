import { useEffect, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { processLaunchDrafts, processRunLaunchGrant, useProjects } from 'thefactory-ui/headless'
import ProcessRunLaunchPanel from '../../src/native/compound/chat/ProcessRunLaunchPanel'
import StepScreen from '../../src/native/compound/process/pipeline/StepScreen'
import ProcessesView from '../../src/native/screens/ProcessesView'
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
import { Click } from '../scenes/clickOnce'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%' }}>{children}</View>
    </ScrollView>
  )
}

function InProject({ children }: { children: ReactNode }) {
  const { projects, activeProjectId, setActiveProjectId } = useProjects()
  useEffect(() => {
    if (projects.length > 0 && activeProjectId !== FAKE_PROJECT_ID) {
      setActiveProjectId(FAKE_PROJECT_ID)
    }
  }, [projects, activeProjectId, setActiveProjectId])
  return activeProjectId === FAKE_PROJECT_ID ? children : null
}

const LAUNCH_ASKED: Record<string, Record<string, unknown>> = {
  script: FAKE_SCRIPT_VALUES,
  'script-missing': { ...FAKE_SCRIPT_VALUES, scriptNote: '' },
  agent: FAKE_AGENT_VALUES,
}

function Launch({ state }: { state: string }) {
  const key = `native-choice-${state}`
  useEffect(() => () => processLaunchDrafts.clear(key), [key])
  return (
    <OnFixtures
      routes={{
        'POST /api/v1/process-runs/preview': () => fakeScriptPreview(),
        '/api/v1/projects/{projectId}/notes': () => FAKE_SCRIPT_NOTES,
      }}
    >
      <Phone>
        <ProcessRunLaunchPanel
          grant={processRunLaunchGrant({
            processId: 'check-a-flow',
            chatRunner: 'cli',
            agent: { inputValues: LAUNCH_ASKED[state] ?? FAKE_SCRIPT_VALUES },
            onLaunch: async () => {},
            onCancel: noop,
          })}
          projectId={FAKE_PROJECT_ID}
          launchKey={key}
          onDecideLater={noop}
        />
      </Phone>
    </OnFixtures>
  )
}

function ScriptStep({ state }: { state: FakeScriptStepState }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/process-runs/{runId}': () => fakeScriptRun(state),
        '/api/v1/process-runs/{runId}/evidence': () => fakeScriptEvidence(state),
        'POST /api/v1/projects/{projectId}/review-evidence/texts': (_, __, body) =>
          ((body as { ids?: string[] })?.ids ?? []).flatMap((id) =>
            FAKE_SCRIPT_TEXTS[id] ? [{ id, text: FAKE_SCRIPT_TEXTS[id] }] : [],
          ),
        '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': () => '',
      }}
    >
      <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
        <StepScreen
          target={{ runId: FAKE_SCRIPT_RUN_ID, stepId: FAKE_SCRIPT_STEP_ID }}
          onBack={noop}
        />
      </View>
    </OnFixtures>
  )
}

const LIBRARY_STATES: Record<string, { selected?: string; open?: string }> = {
  list: {},
  'group-copy': { selected: 'feature' },
  'project-over-group': { selected: 'hotfix' },
  'edit-group-copy': { selected: 'release', open: 'Edit' },
  'edit-shared': { selected: 'story', open: 'Copy from…' },
}

function Library({ state }: { state: string }) {
  const { selected, open } = LIBRARY_STATES[state] ?? {}
  return (
    <OnFixtures
      routes={{
        '/api/v1/processes': () => FAKE_PROCESS_LIBRARY,
        '/api/v1/process-runs/statistics': () => [],
      }}
    >
      <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
        <InProject>
          <Click label={open}>
            <ProcessesView {...(selected ? { selectedProcessId: selected } : {})} />
          </Click>
        </InProject>
      </View>
    </OnFixtures>
  )
}

const SCRIPT_STATES: readonly FakeScriptStepState[] = ['two-sections', 'stopped', 'take-overs']

/**
 * Script steps and the process library on a phone: the launch card's choice
 * (`?state=script`, `script-missing` or `agent`), a script step's log
 * (`?state=two-sections`, `stopped` or `take-overs`) and the Processes tab of
 * a project in a group (`?state=list`, `group-copy`, `project-over-group`,
 * `edit-group-copy` or `edit-shared`).
 */
export const SCRIPT_STEP_VIEWS: NativeView[] = [
  {
    id: 'choice-launch',
    title: 'Start a run: a choice input',
    render: (address) => <Launch state={address.get('state') ?? 'script'} />,
  },
  {
    id: 'script-step',
    title: 'A script step’s log',
    render: (address) => (
      <ScriptStep
        state={SCRIPT_STATES.find((state) => state === address.get('state')) ?? 'two-sections'}
      />
    ),
  },
  {
    id: 'process-library-scopes',
    title: 'Processes: shared, group and project',
    render: (address) => <Library state={address.get('state') ?? 'list'} />,
  },
]
