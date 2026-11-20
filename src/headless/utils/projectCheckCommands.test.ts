import { describe, expect, it } from 'vitest'

import {
  projectCheckCommandsError,
  projectCheckCommandsErrors,
  projectCheckCommandsFrom,
  projectCheckCommandsOf,
} from './projectCheckCommands'

describe('projectCheckCommandsOf', () => {
  it('reads both commands a project declares', () => {
    const checkCommands = { relatedTests: 'jest --findRelatedTests {files}', formatFix: 'make fmt' }
    expect(projectCheckCommandsOf({ checkCommands })).toEqual(checkCommands)
  })

  it('reads none when unset, blank or not a setting, and keeps only the commands it knows', () => {
    expect(projectCheckCommandsOf(undefined)).toBeUndefined()
    expect(projectCheckCommandsOf({ checkCommands: 'x' })).toBeUndefined()
    expect(projectCheckCommandsOf({ checkCommands: { relatedTests: '  ' } })).toBeUndefined()
    expect(projectCheckCommandsOf({ checkCommands: { formatFix: 3, lint: 'x' } })).toBeUndefined()
    expect(projectCheckCommandsOf({ checkCommands: { formatFix: 'f', lint: 'x' } })).toEqual({
      formatFix: 'f',
    })
  })
})

describe('projectCheckCommandsFrom', () => {
  it('keeps each command as typed and drops a blank one', () => {
    expect(projectCheckCommandsFrom({ relatedTests: ' jest {files} ', formatFix: '' })).toEqual({
      relatedTests: ' jest {files} ',
    })
    expect(projectCheckCommandsFrom({ relatedTests: '', formatFix: '   ' })).toBeUndefined()
  })
})

describe('projectCheckCommandsErrors', () => {
  it('says why each command cannot be saved, after its field’s name', () => {
    expect(
      projectCheckCommandsErrors({ relatedTests: 'npx jest', formatFix: 'make\nfmt' }),
    ).toEqual({
      relatedTests: 'Related tests must say where the files go: {files}.',
      formatFix: 'Format fix must be one line.',
    })
  })

  it('has nothing to say of commands that can be saved, or of none', () => {
    expect(projectCheckCommandsErrors({ relatedTests: 'jest {files}', formatFix: 'fmt' })).toEqual(
      {},
    )
    expect(projectCheckCommandsErrors(undefined)).toEqual({})
  })
})

describe('projectCheckCommandsError', () => {
  it('gives the first reason, the related tests first', () => {
    expect(projectCheckCommandsError({ relatedTests: 'jest', formatFix: 'a\nb' })).toBe(
      'Related tests must say where the files go: {files}.',
    )
    expect(projectCheckCommandsError({ formatFix: 'a\nb' })).toBe('Format fix must be one line.')
    expect(projectCheckCommandsError({ relatedTests: 'jest {files}' })).toBeUndefined()
  })
})
