import { describe, expect, it } from 'vitest'
import type { ProcessParkChoice, ProcessPreExistingBreak } from 'thefactory-tools/types'

import {
  preExistingBreakBase,
  preExistingBreakOfChoices,
  preExistingBreakView,
} from './processPreExistingBreakView'
import { PRE_EXISTING_BREAK_COPY } from './processPreExistingBreakViewConstants'

const brk: ProcessPreExistingBreak = {
  source: 'checks',
  checks: ['Unit tests', 'Typecheck'],
  files: ['Tests/RoomTests.swift', 'Sources/Room.swift'],
  baseRef: 'main',
  baseSha: '9f3c2a17be04d6',
  headline: 'Tests/RoomTests.swift:12:5: error: cannot find `Occupancy` in scope',
}

describe('preExistingBreakBase', () => {
  it('names the branch at its short commit', () => {
    expect(preExistingBreakBase({ baseRef: 'develop', baseSha: 'abcdef0123456' })).toBe(
      'develop@abcdef0',
    )
  })

  it('names the branch alone without a commit, or with a blank one', () => {
    expect(preExistingBreakBase({ baseRef: 'develop' })).toBe('develop')
    expect(preExistingBreakBase({ baseRef: 'develop', baseSha: '' })).toBe('develop')
  })
})

describe('preExistingBreakView', () => {
  it('leads with the headline, then where it already fails, the files, the checks and the failing lines', () => {
    expect(preExistingBreakView(brk)).toEqual({
      headline: PRE_EXISTING_BREAK_COPY.headline,
      base: PRE_EXISTING_BREAK_COPY.base('main@9f3c2a1'),
      files: {
        title: PRE_EXISTING_BREAK_COPY.files,
        items: ['Tests/RoomTests.swift', 'Sources/Room.swift'],
      },
      checks: { title: PRE_EXISTING_BREAK_COPY.checks, items: ['Unit tests', 'Typecheck'] },
      failing: { title: PRE_EXISTING_BREAK_COPY.failing, text: brk.headline },
    })
  })

  it('names the base by its branch alone when no commit was recorded', () => {
    const { baseSha: _sha, ...noSha } = brk
    expect(preExistingBreakView(noSha).base).toBe(PRE_EXISTING_BREAK_COPY.base('main'))
  })

  it('has no files list when the checks name no file', () => {
    expect(preExistingBreakView({ ...brk, files: [] }).files).toBeUndefined()
  })

  it('has no failing lines when the headline is blank', () => {
    expect(preExistingBreakView({ ...brk, headline: '  ' }).failing).toBeUndefined()
  })

  it('reads the same for a break the developer found', () => {
    const { headline, files, checks } = preExistingBreakView({ ...brk, source: 'developer' })
    expect({ headline, files, checks }).toEqual({
      headline: PRE_EXISTING_BREAK_COPY.headline,
      files: preExistingBreakView(brk).files,
      checks: preExistingBreakView(brk).checks,
    })
  })
})

describe('preExistingBreakOfChoices', () => {
  const stop: ProcessParkChoice = { choice: 'abandon', label: 'Stop', detail: 'd' }

  it('reads the break off the first answer that carries one', () => {
    const repair: ProcessParkChoice = {
      choice: 'send-to-developer',
      label: 'Repair it in its own commit',
      detail: 'd',
      primary: true,
      preExistingBreak: brk,
    }
    expect(preExistingBreakOfChoices([stop, repair])).toBe(brk)
  })

  it('is nothing at any other stop', () => {
    expect(preExistingBreakOfChoices([stop])).toBeUndefined()
  })
})
