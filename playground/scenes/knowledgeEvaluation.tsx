import { useState, type ReactNode } from 'react'
import { ProjectEvaluationDefaultsField } from 'thefactory-ui/web'
import type {
  KnowledgeEvaluationDefaults,
  KnowledgeEvaluationSettings,
  PendingToolGrant,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the chat renders it itself. The showcase reaches into the
// source for it, as the playground renders the library from source anyway.
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import type { Scene } from '../showcase/types'

const noop = () => {}

const FOCUS = [
  'constellation',
  'cross-subsystem-trace',
  'dev-action',
  'dev-set',
  'feature-synthesis',
  'grow',
  'held-out',
  'history-value',
  'issues',
]

const CAPABILITIES = [
  { capability: 'constellation', label: 'Constellation', scenarios: 24 },
  { capability: 'cross-subsystem-trace', label: 'Cross-subsystem trace', scenarios: 18 },
  { capability: 'dev-action', label: 'Dev action', scenarios: 30 },
  { capability: 'dev-set', label: 'Dev set', scenarios: 12 },
  { capability: 'feature-synthesis', label: 'Feature synthesis', scenarios: 16 },
  { capability: 'grow', label: 'Grow', scenarios: 20 },
  { capability: 'held-out', label: 'Held out', scenarios: 14 },
  { capability: 'history-value', label: 'History value', scenarios: 10 },
  { capability: 'issues', label: 'Issues', scenarios: 22 },
  { capability: 'locate', label: 'Locate', scenarios: 28 },
  { capability: 'impact', label: 'Impact', scenarios: 19 },
]

const ARMS = 2

const WORK = CAPABILITIES.filter((c) => FOCUS.includes(c.capability)).map((c) => ({
  ...c,
  agentRuns: c.scenarios * ARMS,
}))

const SCENARIOS = WORK.reduce((n, c) => n + c.scenarios, 0)

const PARAMS = {
  stage: 'saturate',
  preset: 'small-clean',
  llm: true,
  promptMode: 'neutral',
  buildMode: 'heuristic',
  concurrency: 10,
  focusCapabilities: FOCUS,
}

const CURSOR = {
  kind: 'cli',
  cli: 'cursor-agent',
  modelId: 'composer-2.5',
  label: 'cursor-agent/composer-2.5',
}

const MATCHED_SOURCES = {
  stage: 'explicit',
  preset: 'matched',
  promptMode: 'matched',
  buildMode: 'matched',
  concurrency: 'matched',
  focusCapabilities: 'matched',
  model: 'matched',
}

const BUILD = {
  code: '8e21c0d4f9a17b3e',
  packageVersion: '0.9.3',
  gitBranch: 'dev',
  gitHead: 'a1b2c3d4e5f60718293a4b5c',
  gitDirty: false,
  packageRoot: '/Users/me/Work/thefactory-knowledge',
  processStartedAt: '2026-10-20T08:00:00.000Z',
}

function preview(over: Record<string, unknown> = {}) {
  return {
    stage: 'saturate',
    preset: 'small-clean',
    model: 'cursor-agent/composer-2.5',
    standardTools: true,
    promptMode: 'neutral',
    buildMode: 'heuristic',
    concurrency: 10,
    focus: { capabilities: FOCUS },
    omitTools: [],
    ablateRawSource: false,
    comparePromptGenerations: false,
    ledger: {
      action: 'resume',
      snapshotsPrevious: false,
      priorBuilds: { builds: [BUILD.code], unstampedRuns: 0 },
      mixedBuilds: false,
    },
    work: {
      capabilities: WORK,
      scenarios: SCENARIOS,
      armsPerRun: ARMS,
      agentRuns: SCENARIOS * ARMS,
      alreadyCovered: false,
    },
    unavailableTargets: [],
    build: BUILD,
    unknownFocus: { capabilities: [], fixtures: [], excludeCapabilities: [] },
    ...over,
  }
}

/** An `evaluateKnowledge` ask whose decision goes nowhere — the panel stays as it is drawn. */
function launch(id: string, detail: Record<string, unknown>, reason: string): PendingToolGrant {
  const args = {
    stage: 'saturate',
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    reason,
  }
  return {
    id: `grant-evaluate-${id}`,
    chatRunner: 'cli',
    label: 'evaluateKnowledge',
    toolName: 'evaluateKnowledge',
    args,
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    detail: {
      tool: 'evaluateKnowledge',
      args,
      detail: { kind: 'knowledge-evaluation-launch', ...detail },
    },
    decide: () => new Promise<void>(noop),
  }
}

const MATCHED = launch(
  'matched',
  {
    params: PARAMS,
    model: CURSOR,
    sources: MATCHED_SOURCES,
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    preview: preview(),
  },
  'Re-measure the nine focused capabilities on the same settings as the last saturate run.',
)

const RESET = launch(
  'reset',
  {
    params: { ...PARAMS, reset: true },
    model: CURSOR,
    sources: {
      stage: 'explicit',
      reset: 'explicit',
      preset: 'project-defaults',
      focusCapabilities: 'project-defaults',
      promptMode: 'project-defaults',
      buildMode: 'tab-defaults',
      concurrency: 'tab-defaults',
      model: 'project-defaults',
    },
    preview: preview({
      ledger: {
        action: 'reset',
        snapshotsPrevious: true,
        priorBuilds: { builds: [BUILD.code], unstampedRuns: 0 },
        mixedBuilds: false,
      },
    }),
  },
  'The scoring rules changed, so the old samples no longer compare.',
)

const MIXED = launch(
  'mixed',
  {
    params: PARAMS,
    model: CURSOR,
    sources: MATCHED_SOURCES,
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    preview: preview({
      ledger: {
        action: 'resume',
        snapshotsPrevious: false,
        priorBuilds: { builds: ['3a9f0c1e22b4', '77be2d4f0091'], unstampedRuns: 3 },
        mixedBuilds: true,
      },
      build: {
        ...BUILD,
        gitDirty: true,
        linked: [
          {
            name: 'thefactory-db',
            root: '/Users/me/Work/thefactory-db',
            packageVersion: '1.4.0',
            gitBranch: 'main',
            gitHead: '3161c83a5b6c7d8e',
            gitDirty: true,
          },
        ],
      },
    }),
  },
  'Carry on the saturate sweep where it stopped.',
)

const UNAVAILABLE = launch(
  'unavailable',
  {
    params: PARAMS,
    model: CURSOR,
    sources: MATCHED_SOURCES,
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    previewError:
      'The knowledge package could not read its ledger: the evaluation folder is locked.',
  },
  'Re-measure the nine focused capabilities on the same settings as the last saturate run.',
)

const CLI_BRAKE = "the host's CLI evaluation limit (THEFACTORY_EVAL_CLI_CONCURRENCY)"

const CAPPED = launch(
  'capped',
  {
    params: { ...PARAMS, concurrency: 4 },
    model: CURSOR,
    sources: MATCHED_SOURCES,
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    preview: preview({ concurrency: 4 }),
    concurrencyCap: { requested: 10, effective: 4, cappedBy: CLI_BRAKE },
  },
  'Re-measure the nine focused capabilities on the same settings as the last saturate run.',
)

const NOT_CAPPED = launch(
  'not-capped',
  {
    params: { ...PARAMS, concurrency: 4 },
    model: CURSOR,
    sources: { ...MATCHED_SOURCES, concurrency: 'explicit' },
    matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
    preview: preview({ concurrency: 4 }),
  },
  'Re-measure the nine focused capabilities on the same settings as the last saturate run.',
)

/** Sized like the dock it replaces the composer in. */
function DockPanel({ of }: { of: PendingToolGrant }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      <ApprovalPanel grant={of} onDecideLater={noop} />
    </div>
  )
}

const SETTINGS: Pick<KnowledgeEvaluationSettings, 'tabDefaults' | 'choices'> = {
  tabDefaults: {
    preset: 'small-clean',
    promptMode: 'production',
    buildMode: 'heuristic',
    concurrency: 4,
  },
  choices: {
    stages: ['smoke', 'sample', 'full', 'deepen', 'saturate', 'drill'],
    presets: ['small-clean', 'medium', 'wide'],
    capabilities: CAPABILITIES,
    fixtures: ['small-clean', 'monorepo', 'android-app'],
    promptModes: ['neutral', 'production'],
    buildModes: ['heuristic', 'llm'],
    clis: ['claude-code', 'cursor-agent', 'codex'],
    concurrencyMax: 16,
  },
}

function frame(children: ReactNode): ReactNode {
  return (
    <div className="w-[560px] max-w-full rounded-md border border-(--border-subtle) bg-(--surface-base) p-4">
      {children}
    </div>
  )
}

/** The field as the project editor holds it: edits change what it shows, from fixed defaults. */
function Defaults({ start }: { start: KnowledgeEvaluationDefaults | undefined }) {
  const [value, setValue] = useState(start)
  return frame(
    <ProjectEvaluationDefaultsField settings={SETTINGS} value={value} onChange={setValue} />,
  )
}

const CLI_DEFAULTS: KnowledgeEvaluationDefaults = {
  stage: 'saturate',
  preset: 'small-clean',
  focusCapabilities: FOCUS,
  promptMode: 'neutral',
  buildMode: 'heuristic',
  concurrency: 10,
  cli: 'cursor-agent',
  modelId: 'composer-2.5',
}

const API_DEFAULTS: KnowledgeEvaluationDefaults = {
  stage: 'full',
  focusFixtures: ['monorepo'],
  concurrency: 6,
  llmConfigId: 'openai-gpt-5',
}

export const KNOWLEDGE_EVALUATION_SCENES: Scene[] = [
  {
    id: 'evaluation-launch-card',
    title: 'Knowledge evaluation launch',
    component: 'EvaluationLaunchAskBody',
    group: 'Chat',
    description:
      'The approval card for an evaluateKnowledge launch: every resolved setting and where it came from, the model, the run it matched, and what its dry run says it would do.',
    states: [
      {
        id: 'matched-resume',
        title: 'Matched saturate run, resumes the ledger',
        description:
          'Settings taken from run d9056233 on cursor-agent/composer-2.5, nine focused capabilities.',
        render: () => <DockPanel of={MATCHED} />,
      },
      {
        id: 'reset-keeps-copy',
        title: 'Resets the ledger, keeps a copy first',
        description: 'A danger card: resetting rewrites the ledger.',
        render: () => <DockPanel of={RESET} />,
      },
      {
        id: 'mixed-builds',
        title: 'Mixed builds',
        description:
          'The ledger already holds runs from other builds; this build and a linked one have uncommitted changes.',
        render: () => <DockPanel of={MIXED} />,
      },
      {
        id: 'concurrency-capped',
        title: 'Concurrency capped by the host',
        description:
          'Matched run asked for 10 concurrent runs; a CLI evaluation runs at 4 under the host’s limit, and the card says so.',
        render: () => <DockPanel of={CAPPED} />,
      },
      {
        id: 'concurrency-not-capped',
        title: 'Concurrency as asked',
        description:
          'The look-alike of the capped card: 4 concurrent runs asked in the call, 4 run, no cap line.',
        render: () => <DockPanel of={NOT_CAPPED} />,
      },
      {
        id: 'preview-unavailable',
        title: 'Preview unavailable',
        description: 'The host could not dry-run the launch; the settings still show.',
        render: () => <DockPanel of={UNAVAILABLE} />,
      },
    ],
  },
  {
    id: 'project-evaluation-defaults',
    title: 'Project evaluation defaults',
    component: 'ProjectEvaluationDefaultsField',
    group: 'Settings',
    description:
      'The project editor’s evaluation defaults, shown when the project’s agents hold the evaluation tools. Every unset control says what it falls back to.',
    states: [
      {
        id: 'tab-fallbacks',
        title: 'No defaults — tab fallbacks',
        render: () => <Defaults start={undefined} />,
      },
      {
        id: 'cli-model',
        title: 'Defaults with a CLI model',
        render: () => <Defaults start={CLI_DEFAULTS} />,
      },
      {
        id: 'api-model',
        title: 'Defaults with an API config',
        render: () => <Defaults start={API_DEFAULTS} />,
      },
    ],
  },
]
