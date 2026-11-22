import { describe, expect, it } from 'vitest'

import { CHECK_RUN_WORKING } from './checkMethodConstants'
import { checkRunButton, checkRunWorkingLabel, runningCheckMethod } from './checkRunButton'
import type { CheckMethodRow } from './checkMethodTypes'

function method(over: Partial<CheckMethodRow> & Pick<CheckMethodRow, 'id'>): CheckMethodRow {
  return {
    label: over.id,
    noun: over.id,
    setupVerb: over.id,
    state: 'passed',
    tone: 'positive',
    detail: '',
    durationLabel: undefined,
    output: undefined,
    fill: 'run',
    action: { kind: 'open-proof', tab: 'build' },
    checkIds: [],
    ...over,
  }
}

describe('checkRunButton', () => {
  it('offers nothing when the block has no check to run', () => {
    expect(checkRunButton([], 'Lint', undefined)).toBeUndefined()
    expect(checkRunButton(['', '  '], 'Lint', undefined)).toBeUndefined()
  })

  it('targets that block alone while nothing is running', () => {
    expect(checkRunButton([' unit ', 'unit'], 'Unit tests', undefined)).toEqual({
      checkIds: ['unit'],
      label: 'Run Unit tests',
      running: false,
      blocked: false,
    })
  })

  it('marks the block running when its check is in flight, and the others waiting', () => {
    expect(checkRunButton(['unit'], 'Unit tests', ['unit'])).toMatchObject({
      running: true,
      blocked: false,
    })
    expect(checkRunButton(['lint'], 'Lint', ['unit'])).toMatchObject({
      running: false,
      blocked: true,
    })
  })

  it('marks every block running while the whole pass is in flight', () => {
    expect(checkRunButton(['lint'], 'Lint', [])).toMatchObject({ running: true, blocked: false })
  })
})

describe('checkRunWorkingLabel', () => {
  const checks = [
    { id: 'unit', label: 'Unit tests' },
    { id: 'lint', label: 'Lint' },
  ]

  it('keeps the whole-pass line when no check was named', () => {
    expect(checkRunWorkingLabel(undefined, checks)).toBe(CHECK_RUN_WORKING)
    expect(checkRunWorkingLabel([], checks)).toBe(CHECK_RUN_WORKING)
  })

  it('names the checks that were asked for', () => {
    expect(checkRunWorkingLabel(['unit'], checks)).toBe('Running Unit tests')
    expect(checkRunWorkingLabel(['unit', 'missing'], checks)).toBe('Running Unit tests, missing')
  })
})

describe('runningCheckMethod', () => {
  const rows = [
    method({
      id: 'lint',
      state: 'unchecked',
      action: { kind: 'run' },
      checkIds: [],
    }),
    method({ id: 'types', checkIds: ['typecheck'] }),
    method({ id: 'tests', checkIds: ['unit', 'test:integration'] }),
  ]

  it('marks the method that owns the checks in flight', () => {
    expect(runningCheckMethod(rows, ['test:integration'])).toBe('tests')
    expect(runningCheckMethod(rows, ['nowhere'])).toBeUndefined()
  })

  it('marks the first unrun method during a whole pass', () => {
    expect(runningCheckMethod(rows, [])).toBe('lint')
    expect(runningCheckMethod(rows, undefined)).toBe('lint')
    expect(
      runningCheckMethod(
        [method({ id: 'types', state: 'passed', action: { kind: 'open-proof', tab: 'build' } })],
        [],
      ),
    ).toBe('types')
  })
})
