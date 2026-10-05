import { describe, expect, it } from 'vitest'

import { testSuitesView } from './testSuites'
import { TEST_SUITE_NO_TESTS } from './testSuitesConstants'

describe('testSuitesView', () => {
  it('lists each suite with its module, its non-zero counts, its time and its mark', () => {
    expect(
      testSuitesView({
        testSuites: [
          {
            name: 'com.acme.LoginTest',
            module: 'app',
            tests: 5,
            passed: 3,
            failed: 1,
            skipped: 1,
            durationMs: 250,
            failures: [{ name: 'rejectsEmpty', message: 'expected:<4> but was:<5>' }],
          },
          {
            name: 'com.acme.RepoTest',
            module: 'library',
            tests: 2,
            passed: 2,
            failed: 0,
            skipped: 0,
          },
        ],
      }),
    ).toEqual({
      rows: [
        {
          key: 'app:com.acme.LoginTest:0',
          module: 'app',
          name: 'com.acme.LoginTest',
          countsLabel: '3 passed · 1 failed · 1 skipped',
          outcome: 'failed',
          mark: '✗',
          durationLabel: '250ms',
          failures: [{ path: '', name: 'rejectsEmpty', message: 'expected:<4> but was:<5>' }],
        },
        {
          key: 'library:com.acme.RepoTest:1',
          module: 'library',
          name: 'com.acme.RepoTest',
          countsLabel: '2 passed',
          outcome: 'passed',
          mark: '✓',
          durationLabel: undefined,
          failures: [],
        },
      ],
      omittedLabel: undefined,
    })
  })

  it('reads a suite whose every test skipped, or that ran none, as skipped — never passed', () => {
    const { rows } = testSuitesView({
      testSuites: [
        { name: 'A', tests: 2, passed: 0, failed: 0, skipped: 2 },
        { name: 'B', tests: 0, passed: 0, failed: 0, skipped: 0 },
      ],
    })!
    expect(rows.map((r) => [r.outcome, r.mark, r.countsLabel, r.module])).toEqual([
      ['skipped', '○', '2 skipped', undefined],
      ['skipped', '○', TEST_SUITE_NO_TESTS, undefined],
    ])
  })

  it('keeps a failure the record kept no message for', () => {
    const { rows } = testSuitesView({
      testSuites: [
        { name: 'A', tests: 1, passed: 0, failed: 1, skipped: 0, failures: [{ name: 'x' }] },
      ],
    })!
    expect(rows[0]?.failures).toEqual([{ path: '', name: 'x', message: '' }])
  })

  it('says how many suites the record left out, in the singular for one', () => {
    const suite = { name: 'A', tests: 1, passed: 1, failed: 0, skipped: 0 }
    expect(testSuitesView({ testSuites: [suite], testSuitesOmitted: 12 })?.omittedLabel).toBe(
      '12 more suites not kept',
    )
    expect(testSuitesView({ testSuites: [suite], testSuitesOmitted: 1 })?.omittedLabel).toBe(
      '1 more suite not kept',
    )
  })

  it('is nothing for a check whose suites were not read', () => {
    expect(testSuitesView({})).toBeUndefined()
    expect(testSuitesView({ testSuites: [] })).toBeUndefined()
  })
})
