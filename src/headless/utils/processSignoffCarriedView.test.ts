import { describe, expect, it } from 'vitest'
import type {
  ProcessLedgerEntry,
  ProcessPreExistingBreak,
  ProcessRun,
} from 'thefactory-tools/types'

import { signoffCarriedView } from './processSignoffCarriedView'
import { SIGNOFF_CARRIED_COPY } from './processSignoffCarriedViewConstants'

type CarriedRun = Pick<ProcessRun, 'id' | 'featureId' | 'ledger' | 'plan'>

const brk: ProcessPreExistingBreak = {
  source: 'checks',
  checks: ['Unit tests'],
  files: ['Tests/RoomTests.swift'],
  baseRef: 'main',
  baseSha: '9f3c2a17be04d6',
  headline: 'Tests/RoomTests.swift:12:5: error',
}

function verifyEntry(over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry {
  return {
    id: 'v1',
    stepId: 'verify',
    iteration: 1,
    status: 'done',
    outcome: 'unchecked',
    startedAt: 3,
    proof: {
      pairs: [
        { beforeId: 'b1', afterId: 'a1', subject: 'Dashboard tile', counted: true },
        { beforeId: 'b2', afterId: 'a2', subject: 'Old list', counted: false },
      ],
      newScreenIds: [],
      recordingIds: [],
      outcome: 'unchecked',
      notShown: ['Push when the room fills', 'Badge count'],
    },
    override: { choice: 'continue', at: 10 },
    ...over,
  }
}

function run(id: string, ledger: ProcessLedgerEntry[], featureId?: string): CarriedRun {
  return {
    id,
    ...(featureId ? { featureId } : {}),
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Feature',
      frozenAt: 0,
      loops: [],
      steps: [
        { id: 'checks', name: 'Checks', kind: 'check' },
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      ],
    },
    ledger,
  }
}

const checksLeftOut: ProcessLedgerEntry = {
  id: 'c1',
  stepId: 'checks',
  iteration: 1,
  status: 'done',
  outcome: 'failed',
  startedAt: 1,
  preExistingBreak: brk,
  override: { choice: 'continue', at: 5 },
}

describe('signoffCarriedView', () => {
  it('lists the points carried onto the sign-off, with what was shown, and the targets left out', () => {
    expect(signoffCarriedView([run('r1', [checksLeftOut, verifyEntry()], 'f1')])).toEqual({
      tryThese: {
        title: SIGNOFF_CARRIED_COPY.tryTitle,
        note: SIGNOFF_CARRIED_COPY.tryNote,
        groups: [
          {
            key: 'r1:v1',
            shown: SIGNOFF_CARRIED_COPY.shown(['Dashboard tile']),
            points: ['Push when the room fills', 'Badge count'],
          },
        ],
      },
      leftOut: {
        title: SIGNOFF_CARRIED_COPY.leftOutTitle,
        rows: [
          {
            key: 'r1:c1',
            target: 'Tests/RoomTests.swift',
            detail: SIGNOFF_CARRIED_COPY.leftOutDetail('main@9f3c2a1', ['Unit tests']),
          },
        ],
      },
    })
  })

  it('reads every run of the tree, each once', () => {
    const parent = run('story', [checksLeftOut])
    const child = run('feature', [verifyEntry({ id: 'v9' })], 'f2')
    const view = signoffCarriedView([parent, child, child])
    expect(view?.tryThese?.groups.map((g) => g.key)).toEqual(['feature:v9'])
    expect(view?.leftOut?.rows.map((r) => r.key)).toEqual(['story:c1'])
  })

  it('skips a run read without its plan', () => {
    const planless = { ...run('r1', [checksLeftOut]), plan: undefined } as unknown as CarriedRun
    expect(signoffCarriedView([planless])).toBeUndefined()
  })

  it('names a left-out target by its checks when no file was read', () => {
    const entry = { ...checksLeftOut, preExistingBreak: { ...brk, files: [] } }
    expect(signoffCarriedView([run('r1', [entry])])?.leftOut?.rows[0]?.target).toBe('Unit tests')
  })

  it('takes a waiting developer told to leave its break out', () => {
    const waiting: ProcessLedgerEntry = {
      id: 'i1',
      stepId: 'implement',
      iteration: 1,
      status: 'done',
      outcome: 'waiting',
      startedAt: 1,
      ask: {
        kind: 'blocker',
        agent: 'developer',
        title: 't',
        detail: 'd',
        preExistingBreak: { ...brk, source: 'developer', baseSha: undefined },
      },
      override: { choice: 'resolved', at: 4 },
    }
    expect(signoffCarriedView([run('r1', [waiting])])?.leftOut?.rows).toEqual([
      {
        key: 'r1:i1',
        target: 'Tests/RoomTests.swift',
        detail: SIGNOFF_CARRIED_COPY.leftOutDetail('main', ['Unit tests']),
      },
    ])
  })

  it('has no shown line when nothing counted', () => {
    const entry = verifyEntry()
    const proof = { ...entry.proof!, pairs: [] }
    expect(signoffCarriedView([run('r1', [{ ...entry, proof }])])?.tryThese?.groups[0]).toEqual({
      key: 'r1:v1',
      points: ['Push when the room fills', 'Badge count'],
    })
  })

  it('leaves out a section with nothing in it', () => {
    expect(signoffCarriedView([run('r1', [checksLeftOut])])?.tryThese).toBeUndefined()
    expect(signoffCarriedView([run('r1', [verifyEntry()])])?.leftOut).toBeUndefined()
  })

  it('is nothing when no point was carried and nothing left out', () => {
    expect(signoffCarriedView([])).toBeUndefined()
    expect(signoffCarriedView([run('r1', [verifyEntry({ override: undefined })])])).toBeUndefined()
    expect(
      signoffCarriedView([
        run('r1', [{ ...checksLeftOut, override: { choice: 'send-to-developer', at: 1 } }]),
      ]),
    ).toBeUndefined()
  })
})
