import { describe, expect, it } from 'vitest'
import {
  PROCESS_FEATURE_CLOSURE_LABELS,
  PROCESS_RUN_CLOSURE_REASON_REQUIRED,
} from 'thefactory-tools/constants'

import {
  processRunClosureOfRows,
  processRunClosureOptions,
  processRunClosureRows,
  processRunClosureRowsProblem,
  withProcessRunClosurePick,
} from './processRunClosureView'

const candidates = [
  {
    featureId: 'f1',
    title: 'Read PDFs',
    status: 'in_progress',
    suggested: 'pending' as const,
    why: 'unfinished',
    work: ['Implement ran once.'],
  },
]

describe('processRunClosureRows', () => {
  it('starts each feature on its suggestion', () => {
    expect(processRunClosureRows(candidates)).toEqual([
      {
        featureId: 'f1',
        title: 'Read PDFs',
        currentStatus: 'in_progress',
        suggested: 'pending',
        why: 'unfinished',
        work: ['Implement ran once.'],
        status: 'pending',
        reason: '',
      },
    ])
  })
})

describe('processRunClosureOptions', () => {
  it('offers every status with its words', () => {
    expect(processRunClosureOptions()[1]).toEqual({
      status: 'blocked',
      label: PROCESS_FEATURE_CLOSURE_LABELS.blocked,
    })
  })
})

describe('withProcessRunClosurePick', () => {
  it('changes only the feature picked', () => {
    const rows = withProcessRunClosurePick(processRunClosureRows(candidates), 'f1', {
      status: 'done',
    })
    expect(rows[0]!.status).toBe('done')
  })

  it('leaves the other features alone', () => {
    const rows = withProcessRunClosurePick(processRunClosureRows(candidates), 'x', {
      status: 'done',
    })
    expect(rows[0]!.status).toBe('pending')
  })
})

describe('processRunClosureOfRows', () => {
  it('sends a block with its reason', () => {
    const rows = withProcessRunClosurePick(processRunClosureRows(candidates), 'f1', {
      status: 'blocked',
      reason: ' Needs the key. ',
    })
    expect(processRunClosureOfRows(rows)).toEqual([
      { featureId: 'f1', status: 'blocked', reason: 'Needs the key.' },
    ])
  })

  it('sends no reason with another status', () => {
    const rows = withProcessRunClosurePick(processRunClosureRows(candidates), 'f1', {
      status: 'done',
      reason: 'x',
    })
    expect(processRunClosureOfRows(rows)).toEqual([{ featureId: 'f1', status: 'done' }])
  })
})

describe('processRunClosureRowsProblem', () => {
  it('asks for the reason of a block', () => {
    const rows = withProcessRunClosurePick(processRunClosureRows(candidates), 'f1', {
      status: 'blocked',
    })
    expect(processRunClosureRowsProblem(rows)).toBe(PROCESS_RUN_CLOSURE_REASON_REQUIRED('f1'))
  })

  it('lets the suggestions through', () => {
    expect(processRunClosureRowsProblem(processRunClosureRows(candidates))).toBeUndefined()
  })
})
