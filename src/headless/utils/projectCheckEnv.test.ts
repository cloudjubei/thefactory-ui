import { describe, expect, it } from 'vitest'

import {
  projectCheckEnvError,
  projectCheckEnvFromRows,
  projectCheckEnvOf,
  projectCheckEnvRowErrors,
  projectCheckEnvRows,
} from './projectCheckEnv'
import { PROJECT_CHECK_ENV_ERRORS } from './projectCheckEnvConstants'

const secret = { name: 'OPENAI_API_KEY', noteId: 'n1' }

describe('projectCheckEnvOf', () => {
  it('reads the values and secrets a project sets', () => {
    expect(
      projectCheckEnvOf({ checkEnv: { values: { LIVE_TESTS: '1' }, secrets: [secret] } }),
    ).toEqual({ values: { LIVE_TESTS: '1' }, secrets: [secret] })
  })

  it('reads none when unset, empty or not a setting', () => {
    expect(projectCheckEnvOf(undefined)).toBeUndefined()
    expect(projectCheckEnvOf({})).toBeUndefined()
    expect(projectCheckEnvOf({ checkEnv: {} })).toBeUndefined()
    expect(projectCheckEnvOf({ checkEnv: 'LIVE=1' })).toBeUndefined()
    expect(projectCheckEnvOf({ checkEnv: { values: {}, secrets: [] } })).toBeUndefined()
  })

  it('drops parts it cannot read and keeps the rest', () => {
    expect(
      projectCheckEnvOf({
        checkEnv: { values: { LIVE_TESTS: '1', BAD: 2 }, secrets: [secret, { name: 'X' }, null] },
      }),
    ).toEqual({ values: { LIVE_TESTS: '1' }, secrets: [secret] })
  })
})

describe('projectCheckEnvRows and projectCheckEnvFromRows', () => {
  it('round-trips a setting through the editor’s rows', () => {
    const setting = { values: { A: '1', B: '' }, secrets: [secret] }
    expect(projectCheckEnvRows(setting)).toEqual({
      values: [
        { name: 'A', value: '1' },
        { name: 'B', value: '' },
      ],
      secrets: [secret],
    })
    expect(projectCheckEnvFromRows(projectCheckEnvRows(setting))).toEqual(setting)
  })

  it('has no rows for no setting', () => {
    expect(projectCheckEnvRows(undefined)).toEqual({ values: [], secrets: [] })
  })

  it('trims names, drops wholly blank rows, and is none once nothing is left', () => {
    expect(
      projectCheckEnvFromRows({
        values: [
          { name: ' A ', value: '1' },
          { name: '  ', value: '' },
        ],
        secrets: [{ name: '', noteId: '' }],
      }),
    ).toEqual({ values: { A: '1' } })
    expect(
      projectCheckEnvFromRows({ values: [{ name: '', value: '' }], secrets: [] }),
    ).toBeUndefined()
  })

  it('keeps an incomplete row, so a save is refused rather than losing it', () => {
    expect(projectCheckEnvFromRows({ values: [], secrets: [{ name: 'KEY', noteId: '' }] })).toEqual(
      { secrets: [{ name: 'KEY', noteId: '' }] },
    )
  })
})

describe('projectCheckEnvRowErrors', () => {
  it('passes a complete env and blank rows', () => {
    expect(
      projectCheckEnvRowErrors({
        values: [
          { name: 'LIVE_TESTS', value: '1' },
          { name: '', value: '' },
        ],
        secrets: [secret, { name: '', noteId: '' }],
      }),
    ).toEqual({ values: [undefined, undefined], secrets: [undefined, undefined] })
  })

  it('names what is wrong with each row', () => {
    expect(
      projectCheckEnvRowErrors({
        values: [
          { name: '', value: 'x' },
          { name: '1BAD', value: 'x' },
          { name: 'PATH', value: '/tmp' },
          { name: 'OPENAI_API_KEY', value: 'sk-1' },
          { name: 'LIVE', value: '1' },
        ],
        secrets: [
          { name: 'LIVE', noteId: 'n1' },
          { name: 'KEY', noteId: '' },
        ],
      }),
    ).toEqual({
      values: [
        PROJECT_CHECK_ENV_ERRORS.noName,
        PROJECT_CHECK_ENV_ERRORS.badName('1BAD'),
        PROJECT_CHECK_ENV_ERRORS.hostName('PATH'),
        PROJECT_CHECK_ENV_ERRORS.secretValue('OPENAI_API_KEY'),
        undefined,
      ],
      secrets: [PROJECT_CHECK_ENV_ERRORS.twice('LIVE'), PROJECT_CHECK_ENV_ERRORS.noNote],
    })
  })

  it('lets a secret-looking name be a secret', () => {
    expect(projectCheckEnvRowErrors({ values: [], secrets: [secret] }).secrets).toEqual([undefined])
  })
})

describe('projectCheckEnvError', () => {
  it('is the first reason a setting cannot be saved', () => {
    expect(
      projectCheckEnvError({ values: { TOKEN: 'x' }, secrets: [{ name: 'K', noteId: '' }] }),
    ).toBe(PROJECT_CHECK_ENV_ERRORS.secretValue('TOKEN'))
    expect(projectCheckEnvError({ secrets: [{ name: 'K', noteId: '' }] })).toBe(
      PROJECT_CHECK_ENV_ERRORS.noNote,
    )
  })

  it('is none for a setting that can be saved, or none at all', () => {
    expect(projectCheckEnvError({ values: { LIVE: '1' }, secrets: [secret] })).toBeUndefined()
    expect(projectCheckEnvError(undefined)).toBeUndefined()
  })
})
