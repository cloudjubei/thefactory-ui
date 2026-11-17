import { describe, expect, it } from 'vitest'

import {
  processRetryDefinitionsOf,
  processRetryDefinitionsView,
  processRetryUseCurrentDefinitions,
} from './processRetryDefinitions'
import type { ProcessRetryDefinitionsOffer } from './processRetryDefinitionsTypes'

const reviewer = (version: number) => ({
  kind: 'agent-type' as const,
  id: 'reviewer',
  name: 'Reviewer',
  version,
})

const feature = (version: number) => ({
  kind: 'process' as const,
  id: 'feature-default',
  name: 'Feature',
  version,
})

const same: ProcessRetryDefinitionsOffer = { frozen: [reviewer(4), feature(2)] }
const newer: ProcessRetryDefinitionsOffer = {
  frozen: [reviewer(4), feature(2)],
  current: [reviewer(7), feature(2)],
}

describe('processRetryDefinitionsOf', () => {
  it('reads the versions a retry names', () => {
    expect(processRetryDefinitionsOf({ definitions: same })).toEqual(same)
  })

  it('reads nothing when a version is not one the card can show', () => {
    expect(
      processRetryDefinitionsOf({
        definitions: { frozen: [{ kind: 'agent-type', id: 'reviewer', name: '', version: 4 }] },
      }),
    ).toBeUndefined()
  })
})

describe('processRetryDefinitionsView', () => {
  it('names the versions the retry will run when nothing newer exists', () => {
    expect(processRetryDefinitionsView(same)).toEqual({
      heading: 'What it runs',
      runs: 'Reviewer, version 4 · Feature, version 2',
    })
  })

  it('shows both versions when a newer definition is offered', () => {
    expect(processRetryDefinitionsView(newer)).toEqual({
      heading: 'What it runs',
      frozenLabel: 'This run\u2019s',
      currentLabel: 'Current',
      frozenLine: 'Reviewer, version 4 · Feature, version 2',
      currentLine: 'Reviewer, version 7 · Feature, version 2',
    })
  })
})

describe('processRetryUseCurrentDefinitions', () => {
  it('asks for the current definitions only when those were chosen', () => {
    expect(processRetryUseCurrentDefinitions({ definitions: 'current' })).toBe(true)
    expect(processRetryUseCurrentDefinitions({ definitions: 'frozen' })).toBe(false)
    expect(processRetryUseCurrentDefinitions({})).toBe(false)
    expect(processRetryUseCurrentDefinitions(undefined)).toBe(false)
  })
})
