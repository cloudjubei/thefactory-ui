import { describe, expect, it } from 'vitest'

import {
  projectStableBranchError,
  projectStableBranchField,
  projectStableBranchOf,
} from './projectStableBranch'
import {
  PROJECT_STABLE_BRANCH_HINT,
  PROJECT_STABLE_BRANCH_INVALID,
} from './projectStableBranchConstants'

describe('projectStableBranchOf', () => {
  it('reads a set branch, trimmed', () => {
    expect(projectStableBranchOf({ stableBranch: ' release/2.0 ' })).toBe('release/2.0')
  })

  it('reads none when unset, blank or not text', () => {
    expect(projectStableBranchOf({})).toBeUndefined()
    expect(projectStableBranchOf({ stableBranch: '  ' })).toBeUndefined()
    expect(projectStableBranchOf({ stableBranch: 7 })).toBeUndefined()
    expect(projectStableBranchOf(undefined)).toBeUndefined()
  })
})

describe('projectStableBranchError', () => {
  it('accepts a branch name, or nothing', () => {
    expect(projectStableBranchError('main')).toBeUndefined()
    expect(projectStableBranchError(' release/2.0 ')).toBeUndefined()
    expect(projectStableBranchError(undefined)).toBeUndefined()
    expect(projectStableBranchError('   ')).toBeUndefined()
  })

  it('refuses what git would not take as a branch', () => {
    expect(projectStableBranchError('my branch')).toBe(PROJECT_STABLE_BRANCH_INVALID('my branch'))
    expect(projectStableBranchError('a..b')).toBe(PROJECT_STABLE_BRANCH_INVALID('a..b'))
  })
})

describe('projectStableBranchField', () => {
  it('explains the setting while the value is fine', () => {
    expect(projectStableBranchField('release')).toEqual({
      value: 'release',
      hint: PROJECT_STABLE_BRANCH_HINT,
    })
    expect(projectStableBranchField(undefined)).toEqual({
      value: '',
      hint: PROJECT_STABLE_BRANCH_HINT,
    })
  })

  it('says why a value cannot be saved', () => {
    expect(projectStableBranchField('bad name')).toEqual({
      value: 'bad name',
      hint: PROJECT_STABLE_BRANCH_HINT,
      error: PROJECT_STABLE_BRANCH_INVALID('bad name'),
    })
  })
})
