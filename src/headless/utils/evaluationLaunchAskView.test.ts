import { describe, expect, it } from 'vitest'

import { evaluationLaunchAskView } from './evaluationLaunchAskView'
import { EVALUATION_LAUNCH_ASK } from './evaluationLaunchAskViewConstants'
import { toolAskCardView } from './toolAskCard'

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

const PARAMS = {
  stage: 'saturate',
  preset: 'small-clean',
  llm: true,
  promptMode: 'neutral',
  buildMode: 'heuristic',
  concurrency: 10,
  focusCapabilities: FOCUS,
}

const SOURCES = {
  stage: 'explicit',
  preset: 'matched',
  promptMode: 'matched',
  buildMode: 'tab-defaults',
  concurrency: 'project-defaults',
  focusCapabilities: 'matched',
  model: 'matched',
}

const MODEL = {
  kind: 'cli',
  cli: 'cursor-agent',
  modelId: 'composer-2.5',
  label: 'cursor-agent/composer-2.5',
}

const BUILD = {
  code: '8e21c0d4f9a1',
  packageVersion: '0.9.3',
  gitBranch: 'dev',
  gitHead: 'a1b2c3d4e5f60718',
  gitDirty: false,
  linked: [
    {
      name: 'thefactory-db',
      root: '/w/db',
      packageVersion: '1.4.0',
      gitBranch: 'main',
      gitHead: '3161c83a5b6c',
      gitDirty: true,
    },
  ],
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
      priorBuilds: { builds: ['8e21c0d4f9a1'], unstampedRuns: 0 },
      mixedBuilds: false,
    },
    work: {
      capabilities: [
        { capability: 'constellation', label: 'Constellation', scenarios: 1200, agentRuns: 2400 },
        { capability: 'grow', label: 'Grow', scenarios: 1, agentRuns: 2 },
      ],
      scenarios: 1201,
      armsPerRun: 2,
      agentRuns: 2402,
      alreadyCovered: false,
    },
    unavailableTargets: [],
    build: BUILD,
    unknownFocus: { capabilities: [], fixtures: [], excludeCapabilities: [] },
    ...over,
  }
}

const detail = (over: Record<string, unknown> = {}) => ({
  kind: 'knowledge-evaluation-launch',
  params: PARAMS,
  model: MODEL,
  sources: SOURCES,
  matchActivityId: 'd9056233-b815-419a-9117-d50d40414078',
  preview: preview(),
  ...over,
})

describe('evaluationLaunchAskView — header', () => {
  it('asks to run the evaluation by stage and agent runs, on the model it spends', () => {
    const view = evaluationLaunchAskView(detail(), {})
    expect(view).toMatchObject({
      icon: 'run',
      tone: 'ask',
      ask: 'The agent wants to run a knowledge evaluation',
      tag: 'Evaluation',
      headline: 'Saturate evaluation · 2,402 agent runs',
      consequence: 'Every agent run spends model time on cursor-agent/composer-2.5.',
      verb: 'Run evaluation',
    })
  })

  it('names one agent run in the singular', () => {
    const one = preview({ work: { capabilities: [], scenarios: 1, agentRuns: 1 } })
    expect(evaluationLaunchAskView(detail({ preview: one }), {}).headline).toBe(
      'Saturate evaluation · 1 agent run',
    )
  })

  it('leaves the count out without a preview, and the model out without a label', () => {
    const view = evaluationLaunchAskView(
      detail({ preview: undefined, model: { kind: 'api', llmConfigId: 'x' } }),
      {},
    )
    expect(view.headline).toBe('Saturate evaluation')
    expect(view.consequence).toBe('Every agent run spends model time.')
  })

  it('says a covered stage runs nothing and spends nothing', () => {
    const covered = preview({
      work: { capabilities: [], scenarios: 40, agentRuns: 80, alreadyCovered: true },
    })
    const view = evaluationLaunchAskView(detail({ preview: covered }), {})
    expect(view.headline).toBe('Saturate evaluation · already covered')
    expect(view.consequence).toBe(EVALUATION_LAUNCH_ASK.coveredConsequence)
    expect(view.body).toMatchObject({ preview: { covered: 'Already covered — runs nothing' } })
  })

  it('is a danger card only when it resets or replaces a ledger', () => {
    for (const action of ['reset', 'replace']) {
      const p = preview({ ledger: { action, snapshotsPrevious: true, mixedBuilds: false } })
      expect(evaluationLaunchAskView(detail({ preview: p }), {}).tone).toBe('danger')
    }
    for (const action of ['resume', 'fresh']) {
      const p = preview({ ledger: { action, snapshotsPrevious: false, mixedBuilds: false } })
      expect(evaluationLaunchAskView(detail({ preview: p }), {}).tone).toBe('ask')
    }
  })

  it('reads a reset from the launch itself when no preview came', () => {
    const view = evaluationLaunchAskView(
      detail({ preview: undefined, params: { ...PARAMS, reset: true } }),
      {},
    )
    expect(view.tone).toBe('danger')
  })

  it('calls an evaluation with no stage a knowledge evaluation', () => {
    expect(evaluationLaunchAskView(detail({ params: { preset: 'p' } }), {}).headline).toBe(
      'Knowledge evaluation · 2,402 agent runs',
    )
  })
})

describe('evaluationLaunchAskView — settings', () => {
  it('lists every resolved setting with where it came from', () => {
    const view = evaluationLaunchAskView(detail(), {})
    if (view.body.kind !== 'evaluation-launch') throw new Error('not an evaluation launch')
    expect(view.body.settings).toEqual([
      { key: 'stage', label: 'Stage', value: 'Saturate', source: 'in the call' },
      { key: 'preset', label: 'Preset', value: 'small-clean', source: 'matched run' },
      { key: 'model', label: 'Model', value: 'cursor-agent/composer-2.5', source: 'matched run' },
      {
        key: 'focusCapabilities',
        label: 'Focus',
        value: '9 capabilities',
        detail: FOCUS.join(', '),
        source: 'matched run',
      },
      { key: 'promptMode', label: 'Steering', value: 'Neutral', source: 'matched run' },
      { key: 'buildMode', label: 'Map build', value: 'Heuristic', source: 'tab default' },
      { key: 'concurrency', label: 'Concurrency', value: '10', source: 'project default' },
    ])
    expect(view.body.model).toBe('cursor-agent/composer-2.5')
    expect(view.body.matchActivityId).toBe('d9056233-b815-419a-9117-d50d40414078')
  })

  it('shows the rarer settings, a short list by name, and no source the host did not give', () => {
    const view = evaluationLaunchAskView(
      detail({
        params: {
          stage: 'drill',
          promptMode: 'production',
          buildMode: 'llm',
          focusFixtures: ['small-clean'],
          focusExcludeCapabilities: ['grow', 'issues'],
          llmFixtures: ['a', 'b', 'c'],
          omitTools: ['grep', 'readFile'],
          ablateRawSource: true,
          comparePromptGenerations: true,
          codeRef: 'release/2.0',
          reset: true,
        },
        sources: { stage: 'host-default', reset: 'unknown-source' },
      }),
      {},
    )
    if (view.body.kind !== 'evaluation-launch') throw new Error('not an evaluation launch')
    expect(view.body.settings.map((r) => [r.label, r.value, r.detail, r.source])).toEqual([
      ['Stage', 'Drill', undefined, 'host default'],
      ['Model', 'cursor-agent/composer-2.5', undefined, undefined],
      ['Fixtures', 'small-clean', undefined, undefined],
      ['Left out', 'grow, issues', undefined, undefined],
      ['LLM fixtures', '3 fixtures', 'a, b, c', undefined],
      ['Tools left out', 'grep, readFile', undefined, undefined],
      ['Steering', 'Production', undefined, undefined],
      ['Map build', 'LLM', undefined, undefined],
      ['Raw source', 'Left out', undefined, undefined],
      ['Prompt generations', 'Compared', undefined, undefined],
      ['Code', 'release/2.0', undefined, undefined],
      ['Ledger', 'Start over', undefined, undefined],
    ])
  })

  it('falls back to the agent’s own arguments when the host sent no launch', () => {
    const view = evaluationLaunchAskView(undefined, {
      stage: 'smoke',
      concurrency: 2,
      matchActivityId: 'act-1',
    })
    expect(view.headline).toBe('Smoke evaluation')
    if (view.body.kind !== 'evaluation-launch') throw new Error('not an evaluation launch')
    expect(view.body.settings).toEqual([
      { key: 'stage', label: 'Stage', value: 'Smoke' },
      { key: 'concurrency', label: 'Concurrency', value: '2' },
    ])
    expect(view.body.matchActivityId).toBe('act-1')
    expect(view.body.previewUnavailable).toBe('Preview unavailable')
  })

  it('shows an unknown stage or steering by its own name', () => {
    const view = evaluationLaunchAskView(
      detail({ params: { stage: 'marathon', promptMode: 'loud' } }),
      {},
    )
    if (view.body.kind !== 'evaluation-launch') throw new Error('not an evaluation launch')
    expect(view.body.settings.find((r) => r.key === 'stage')?.value).toBe('marathon')
    expect(view.body.settings.find((r) => r.key === 'promptMode')?.value).toBe('loud')
  })
})

describe('evaluationLaunchAskView — preview', () => {
  const previewOf = (over: Record<string, unknown>) => {
    const view = evaluationLaunchAskView(detail({ preview: preview(over) }), {})
    if (view.body.kind !== 'evaluation-launch' || !view.body.preview) throw new Error('no preview')
    return view.body.preview
  }

  it('reads the ledger, the totals, each capability and the build that would run', () => {
    expect(previewOf({})).toEqual({
      ledger: 'Resumes the ledger',
      rewritesLedger: false,
      totals: '1,201 scenarios · 2,402 agent runs',
      capabilities: [
        {
          capability: 'constellation',
          label: 'Constellation',
          scenarios: 1200,
          agentRuns: 2400,
          work: '1,200 scenarios · 2,400 agent runs',
        },
        {
          capability: 'grow',
          label: 'Grow',
          scenarios: 1,
          agentRuns: 2,
          work: '1 scenario · 2 agent runs',
        },
      ],
      buildHeading: 'Build',
      builds: [
        { name: 'This build 0.9.3', at: 'dev · a1b2c3d', dirty: false },
        { name: 'thefactory-db 1.4.0', at: 'main · 3161c83', dirty: true },
      ],
    })
  })

  it('says what each ledger action does, and that a copy is kept first when it is', () => {
    const line = (action: string, snapshotsPrevious: boolean) =>
      previewOf({ ledger: { action, snapshotsPrevious, mixedBuilds: false } }).ledger
    expect(line('fresh', false)).toBe('Starts a fresh ledger')
    expect(line('replace', true)).toBe('Replaces the ledger — keeps a copy first')
    expect(line('reset', true)).toBe('Resets the ledger — keeps a copy first')
    expect(line('reset', false)).toBe('Resets the ledger')
    expect(line('mystery', false)).toBe('Resumes the ledger')
  })

  it('warns of mixed builds by the builds the ledger holds and its unstamped runs', () => {
    const mixed = previewOf({
      ledger: {
        action: 'resume',
        snapshotsPrevious: false,
        priorBuilds: { builds: ['3a9f0c1e22', '77be2d4f00'], unstampedRuns: 1 },
        mixedBuilds: true,
      },
    })
    expect(mixed.mixedBuilds).toEqual({
      title: 'Mixed builds',
      detail:
        'The ledger already holds runs from 3a9f0c1, 77be2d4, 1 run with no build recorded. Their scores would mix with this build’s.',
    })
    const bare = previewOf({ ledger: { action: 'resume', mixedBuilds: true } })
    expect(bare.mixedBuilds?.detail).toBe(
      'The ledger already holds runs from other builds. Their scores would mix with this build’s.',
    )
  })

  it('names targets missing here, focus the battery lacks, and a partial preview', () => {
    const p = previewOf({
      unavailableTargets: ['android-emulator', 'gradle'],
      unknownFocus: { capabilities: ['gro'], fixtures: ['tiny'], excludeCapabilities: ['x'] },
      error: 'codeRef names no commit',
    })
    expect(p.unavailable).toBe(
      'Not on this machine: android-emulator, gradle — their scenarios are dropped.',
    )
    expect(p.unknownFocus).toBe('Not in the battery: gro, tiny, x')
    expect(p.error).toBe('Preview incomplete: codeRef names no commit')
  })

  it('shows the commit measured in place of the running build', () => {
    const p = previewOf({
      build: undefined,
      measuredCode: { ref: 'release/2.0', sha: 'f00dbabe1234', targetsRoot: '/w' },
    })
    expect(p.buildHeading).toBe('Measures')
    expect(p.builds).toEqual([{ name: 'release/2.0', at: 'f00dbab', dirty: false }])
  })

  it('reads a build with no git state, and skips a linked build without a name', () => {
    const p = previewOf({
      build: { code: 'c', packageVersion: '', linked: [{ root: '/x' }, 'junk'] },
    })
    expect(p.builds).toEqual([{ name: 'This build', at: '', dirty: false }])
  })

  it('reads nothing from a malformed preview it cannot trust', () => {
    const p = previewOf({
      ledger: 'resume',
      work: { capabilities: [{ label: 'No id' }, 7], scenarios: -3, agentRuns: 'many' },
      unavailableTargets: 'gradle',
      build: undefined,
    })
    expect(p).toEqual({
      ledger: 'Resumes the ledger',
      rewritesLedger: false,
      totals: '0 scenarios · 0 agent runs',
      capabilities: [],
      builds: [],
    })
  })

  it('says why there is no preview', () => {
    const view = evaluationLaunchAskView(
      detail({ preview: undefined, previewError: 'The project has no knowledge map yet.' }),
      {},
    )
    if (view.body.kind !== 'evaluation-launch') throw new Error('not an evaluation launch')
    expect(view.body.preview).toBeUndefined()
    expect(view.body.previewUnavailable).toBe(
      'Preview unavailable: The project has no knowledge map yet.',
    )
  })
})

describe('toolAskCardView — evaluateKnowledge', () => {
  it('reads the launch from the payload’s detail, with the agent’s reason', () => {
    const view = toolAskCardView({
      label: 'evaluateKnowledge',
      detail: {
        tool: 'evaluateKnowledge',
        args: { stage: 'saturate', reason: 'Measure the new trace tool.' },
        detail: detail(),
      },
    })
    expect(view).toMatchObject({
      why: 'Measure the new trace tool.',
      headline: 'Saturate evaluation · 2,402 agent runs',
      body: { kind: 'evaluation-launch', model: 'cursor-agent/composer-2.5' },
    })
  })
})
