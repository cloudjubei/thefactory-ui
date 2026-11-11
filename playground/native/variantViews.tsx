import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import {
  processLaunchDraft,
  processLaunchDrafts,
  processLaunchRepos,
  processLaunchVariants,
  processRunLaunchGrant,
  processVariantLanes,
  processVariantReport,
  toEvidenceTile,
  type ProcessRunEvidenceGroupView,
} from 'thefactory-ui/headless'
import ProcessLaunchFields, {
  ProcessLaunchVariantForm,
} from '../../src/native/compound/chat/ProcessLaunchFields'
import ProcessRunLaunchPanel from '../../src/native/compound/chat/ProcessRunLaunchPanel'
import ProcessVariantLanes from '../../src/native/compound/process/ProcessVariantLanes'
import ProcessVariantReport, {
  ProcessVariantPage,
} from '../../src/native/compound/process/ProcessVariantReport'
import { RunReportDecision } from '../../src/native/compound/process/RunReportReview'
import ProcessInputsEditor from '../../src/native/compound/process/ProcessInputsEditor'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_VARIANT_INPUTS,
  FAKE_VARIANT_NOTES,
  FAKE_VARIANT_PROCESS,
  FAKE_VARIANT_RUN_ID,
  FAKE_VARIANT_TEXTS,
  FAKE_VARIANT_VALUES,
  fakeVariantChildRun,
  fakeVariantEvidence,
  fakeVariantPreview,
  fakeVariantRun,
  type FakeVariantRunState,
} from '../../src/fakeBackend/fixtures/variantRun'
import { processRunParkChoices } from 'thefactory-tools/utils'
import { OnFixtures, type FixtureRoutes } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}
const NOW = 0

const groupsOf = (state: FakeVariantRunState): ProcessRunEvidenceGroupView[] =>
  fakeVariantEvidence(state).groups.map((group) => ({
    ...(group as Omit<ProcessRunEvidenceGroupView, 'tiles'>),
    tiles: group.evidence.map((ref) => {
      const text = FAKE_VARIANT_TEXTS[ref.id]
      return { ...toEvidenceTile(ref), ...(text ? { text } : {}) }
    }),
  }))

const stateOf = (address: URLSearchParams): FakeVariantRunState =>
  (address.get('state') ?? 'running') as FakeVariantRunState

/** The runs a lane or a variant's page reads: each variant's own run. */
const childRoutes = (state: FakeVariantRunState): FixtureRoutes => ({
  '/api/v1/process-runs/{runId}': ({ runId }) =>
    runId === FAKE_VARIANT_RUN_ID
      ? fakeVariantRun(state)
      : fakeVariantChildRun(
          state,
          (runId ?? '').replace('run-variant-', '') as 'current' | 'short' | 'morning',
        ),
})

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%' }}>{children}</View>
    </ScrollView>
  )
}

function Lanes({ state }: { state: FakeVariantRunState }) {
  return (
    <OnFixtures routes={childRoutes(state)}>
      <Phone>
        <ProcessVariantLanes
          view={processVariantLanes(fakeVariantRun(state), groupsOf(state), NOW)}
          onOpen={noop}
          onOpenReport={noop}
        />
      </Phone>
    </OnFixtures>
  )
}

function Report({ state, decision }: { state: FakeVariantRunState; decision: boolean }) {
  const run = fakeVariantRun(state)
  const view = processVariantReport(run, groupsOf(state), NOW)
  return (
    <OnFixtures
      routes={{
        '/api/v1/process-runs/{runId}/integration-options': () => ({
          title: 'Sign-up trial',
          commits: [],
          fastForward: true,
          identities: [],
          accounts: [],
          defaults: {},
          nothingToMerge: true,
        }),
      }}
    >
      <Phone>
        <View style={{ padding: 12 }}>
          <ProcessVariantReport
            view={view}
            projectId={FAKE_PROJECT_ID}
            onOpenVariant={noop}
            {...(decision
              ? {
                  top: (
                    <RunReportDecision
                      run={run}
                      now={NOW}
                      view={view}
                      choices={processRunParkChoices(run)}
                      workBranch={run.workBranch!}
                      onChoose={async () => true}
                      onOpenVariant={noop}
                    />
                  ),
                }
              : {})}
          />
        </View>
      </Phone>
    </OnFixtures>
  )
}

function VariantPage({ state }: { state: FakeVariantRunState }) {
  const view = processVariantReport(fakeVariantRun(state), groupsOf(state), NOW)
  const section = view.sections[1]
  return (
    <OnFixtures routes={childRoutes(state)}>
      <Phone>
        {section ? <ProcessVariantPage section={section} projectId={FAKE_PROJECT_ID} /> : null}
      </Phone>
    </OnFixtures>
  )
}

const REPOS = processLaunchRepos(FAKE_PROJECT_ID, {
  parts: [
    { role: 'backend', serve: ['serve'] },
    { role: 'web', serve: ['serve'] },
  ],
})
const NOTES = FAKE_VARIANT_NOTES

function Form({ filled, bad }: { filled: boolean; bad: boolean }) {
  const asked = bad
    ? {
        ...FAKE_VARIANT_VALUES,
        variants: FAKE_VARIANT_VALUES.variants.map((one, at) =>
          at === 2 ? { ...one, id: 'short', label: 'Short sign-up' } : one,
        ),
      }
    : FAKE_VARIANT_VALUES
  const [draft, setDraft] = useState(() =>
    processLaunchDraft(FAKE_VARIANT_INPUTS, REPOS, filled ? asked : undefined),
  )
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <ProcessLaunchFields
          inputs={FAKE_VARIANT_INPUTS}
          draft={draft}
          repos={REPOS}
          problem={undefined}
          marked={bad}
          notes={NOTES}
          busy={false}
          onChange={setDraft}
          onOpenVariant={noop}
        />
      </View>
    </Phone>
  )
}

function VariantForm() {
  const [draft, setDraft] = useState(() =>
    processLaunchDraft(FAKE_VARIANT_INPUTS, REPOS, FAKE_VARIANT_VALUES),
  )
  const input = FAKE_VARIANT_INPUTS[3]!
  const variant = processLaunchVariants(draft, input.name)[1]!
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <ProcessLaunchVariantForm
          input={input}
          variant={variant}
          props={{
            inputs: FAKE_VARIANT_INPUTS,
            draft,
            repos: REPOS,
            problem: undefined,
            marked: false,
            notes: NOTES,
            busy: false,
            onChange: setDraft,
          }}
        />
      </View>
    </Phone>
  )
}

function Card() {
  useEffect(() => () => processLaunchDrafts.clear('native-card'), [])
  return (
    <OnFixtures
      routes={{
        'POST /api/v1/process-runs/preview': () => fakeVariantPreview(),
        '/api/v1/projects/{projectId}/notes': () => FAKE_VARIANT_NOTES,
      }}
    >
      <Phone>
        <ProcessRunLaunchPanel
          grant={processRunLaunchGrant({
            processId: 'try-variants',
            chatRunner: 'cli',
            agent: { inputValues: FAKE_VARIANT_VALUES },
            onLaunch: async () => {},
            onCancel: noop,
          })}
          projectId={FAKE_PROJECT_ID}
          launchKey="native-card"
          onDecideLater={noop}
        />
      </Phone>
    </OnFixtures>
  )
}

function Editor() {
  const [definition, setDefinition] = useState(FAKE_VARIANT_PROCESS)
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <ProcessInputsEditor definition={definition} onChange={setDefinition as never} />
      </View>
    </Phone>
  )
}

/** The screens of a run of variants on a phone, each at its address. */
export const VARIANT_VIEWS: NativeView[] = [
  {
    id: 'launch-form',
    title: 'Start a run: form',
    render: (address) => (
      <Form filled={address.get('state') !== 'blank'} bad={address.get('state') === 'problem'} />
    ),
  },
  { id: 'launch-variant', title: 'Start a run: a variant', render: () => <VariantForm /> },
  { id: 'launch-card', title: 'Start a run: card in a chat', render: () => <Card /> },
  {
    id: 'variant-lanes',
    title: 'Variant lanes',
    render: (address) => <Lanes state={stateOf(address)} />,
  },
  {
    id: 'variant-report',
    title: 'Report by variant',
    render: (address) => (
      <Report state={stateOf(address)} decision={address.get('state') === 'done'} />
    ),
  },
  {
    id: 'variant-page',
    title: 'A variant’s page',
    render: (address) => <VariantPage state={stateOf(address)} />,
  },
  { id: 'process-inputs', title: 'Process editor: inputs', render: () => <Editor /> },
]
