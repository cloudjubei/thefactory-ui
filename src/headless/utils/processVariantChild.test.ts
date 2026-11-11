import { describe, expect, it } from 'vitest'
import type { ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import { processVariantChildView } from './processVariantChild'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

const child = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'c1',
    projectId: 'p',
    parentRunId: 'root',
    title: 'Version A',
    status: 'running',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    plan: {
      definitionId: 'try-one',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Try one',
      frozenAt: 0,
      loops: [],
      steps: [
        { id: 'prepare', name: 'Prepare', kind: 'agent', agentType: 'developer' },
        { id: 'run', name: 'Run the check', kind: 'script', script: { note: 'script' } },
        { id: 'again', name: 'Run it again', kind: 'script', script: { note: 'script' } },
      ],
    },
    ledger: [
      { id: 'e1', stepId: 'prepare', iteration: 1, startedAt: 1, endedAt: 2, status: 'done' },
      { id: 'e2', stepId: 'run', iteration: 1, startedAt: 3, endedAt: 9, status: 'done' },
    ],
    ...over,
  }) as unknown as ProcessRun

const tile = (id: string, over: Partial<ReviewEvidenceRef>, text?: string): EvidenceTile => ({
  ref: {
    id,
    runId: 'c1',
    projectId: 'p',
    kind: 'log',
    path: id,
    mediaType: 'text/plain',
    createdAt: 5,
    ...over,
  } as ReviewEvidenceRef,
  caption: over.label ?? id,
  ...(text !== undefined ? { text } : {}),
})

const LOG = [
  { at: '2026-11-10T09:00:00.000Z', section: 'Open', kind: 'step', title: 'Opened the page' },
  { at: '2026-11-10T09:01:00.000Z', section: 'Save', kind: 'step', title: 'Saved' },
]
  .map((line) => JSON.stringify(line))
  .join('\n')

describe('processVariantChildView', () => {
  it('has nothing until the run is read', () => {
    expect(processVariantChildView(undefined, [])).toEqual({ steps: [], stepLogs: [] })
  })

  it('lists the run’s steps as strip entries', () => {
    const view = processVariantChildView(child(), [])
    expect(view.steps.map((entry) => [entry.label, entry.phase])).toEqual([
      ['Prepare', 'done'],
      ['Run the check', 'done'],
      ['Run it again', 'upcoming'],
    ])
  })

  it('gives each script step it reached its step log, from what it filed then', () => {
    const tiles = [
      tile('log', { label: 'Step log' }, LOG),
      tile('rec', { kind: 'recording', label: 'Recording of the script', mediaType: 'video/mp4' }),
      tile('late', { label: 'Step log', createdAt: 600_000 }, LOG),
    ]
    const { stepLogs } = processVariantChildView(child(), tiles)
    expect(stepLogs.map((log) => [log.stepId, log.title])).toEqual([['run', 'Run the check']])
    const [log] = stepLogs
    expect(log!.view.sections.map((section) => section.title)).toEqual(['Open', 'Save'])
    expect(log!.view.recording).toBeUndefined()
    expect(log!.view.empty).toBeUndefined()
  })

  it('says a script step that filed no log has none', () => {
    const { stepLogs } = processVariantChildView(child(), [])
    expect(stepLogs[0]!.view).toMatchObject({ sections: [], empty: expect.any(String) })
  })

  it('gives a run with no script step no step logs', () => {
    const plain = child({
      plan: { ...child().plan, steps: [child().plan.steps[0]!] },
      ledger: [child().ledger[0]!],
    })
    expect(processVariantChildView(plain, []).stepLogs).toEqual([])
  })
})
