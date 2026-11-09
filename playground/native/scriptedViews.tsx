import { useEffect, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { processLaunchDrafts, processRunLaunchGrant } from 'thefactory-ui/headless'
import ProcessRunLaunchPanel from '../../src/native/compound/chat/ProcessRunLaunchPanel'
import StepScreen from '../../src/native/compound/process/pipeline/StepScreen'
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

const LAUNCH_ASKED: Record<string, Record<string, unknown>> = {
  scripted: FAKE_SCRIPTED_VALUES,
  'scripted-no-script': { ...FAKE_SCRIPTED_VALUES, journeyScript: '' },
  agent: FAKE_AGENT_VALUES,
}

function Launch({ state }: { state: string }) {
  const key = `native-scripted-${state}`
  useEffect(() => () => processLaunchDrafts.clear(key), [key])
  return (
    <OnFixtures
      routes={{
        'POST /api/v1/process-runs/preview': () => fakeScriptedPreview(),
        '/api/v1/projects/{projectId}/notes': () => FAKE_SCRIPTED_NOTES,
      }}
    >
      <Phone>
        <ProcessRunLaunchPanel
          grant={processRunLaunchGrant({
            processId: 'compare-variants',
            chatRunner: 'cli',
            agent: { inputValues: LAUNCH_ASKED[state] ?? FAKE_SCRIPTED_VALUES },
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

function ScriptStep({ state }: { state: FakeScriptedState }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/process-runs/{runId}': () => fakeScriptedRun(state),
        '/api/v1/process-runs/{runId}/evidence': () => fakeScriptedEvidence(state),
        'POST /api/v1/projects/{projectId}/review-evidence/texts': (_, __, body) =>
          ((body as { ids?: string[] })?.ids ?? []).flatMap((id) =>
            FAKE_SCRIPTED_TEXTS[id] ? [{ id, text: FAKE_SCRIPTED_TEXTS[id] }] : [],
          ),
        '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': () => '',
      }}
    >
      <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
        <StepScreen
          target={{ runId: FAKE_SCRIPTED_RUN_ID, stepId: FAKE_SCRIPTED_STEP_ID }}
          onBack={noop}
        />
      </View>
    </OnFixtures>
  )
}

/**
 * Scripted persona runs on a phone: the launch card's switch (`?state=scripted`,
 * `scripted-no-script` or `agent`) and a script step's days (`?state=lived` or `stopped`).
 */
export const SCRIPTED_VIEWS: NativeView[] = [
  {
    id: 'scripted-launch',
    title: 'Start a run: how the days are lived',
    render: (address) => <Launch state={address.get('state') ?? 'scripted'} />,
  },
  {
    id: 'scripted-step',
    title: 'A script step’s days',
    render: (address) => (
      <ScriptStep state={address.get('state') === 'stopped' ? 'stopped' : 'lived'} />
    ),
  },
]
