import { describe, expect, it } from 'vitest'

import type { VerificationCheckResult } from '../api/generated'
import { checkTestResults } from './testResults'
import {
  TEST_SUITES_NOT_RECORDED_FAILURES,
  TEST_SUITES_NOT_RECORDED_TOTALS,
} from './testResultsConstants'

function check(over: Partial<VerificationCheckResult> = {}): VerificationCheckResult {
  return {
    id: 'test',
    label: 'Unit tests',
    kind: 'command',
    status: 'passed',
    durationMs: 1500,
    summary: 'Command succeeded',
    ...over,
  }
}

describe('checkTestResults', () => {
  it('lists each kept suite under module › name, with its counts, time and failing tests', () => {
    const view = checkTestResults(
      check({
        status: 'failed',
        testCount: { total: 7, passed: 5, failed: 1, skipped: 1 },
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
          { name: 'RepoTest', tests: 2, passed: 2, failed: 0, skipped: 0 },
        ],
      }),
    )
    expect(view).toEqual({
      results: {
        status: 'fail',
        summary: { total: 7, passed: 5, failed: 1, skipped: 1, durationMs: 1500 },
        tests: [
          {
            filePath: 'app › com.acme.LoginTest',
            status: 'fail',
            summary: { total: 5, passed: 3, failed: 1, skipped: 1, durationMs: 250 },
            failures: [{ testName: 'rejectsEmpty', message: 'expected:<4> but was:<5>' }],
            passes: [],
            skips: [],
          },
          {
            filePath: 'RepoTest',
            status: 'ok',
            summary: { total: 2, passed: 2, failed: 0, skipped: 0, durationMs: null },
            failures: [],
            passes: [],
            skips: [],
          },
        ],
      },
      omittedLabel: undefined,
      unrecordedNote: undefined,
      unfinished: undefined,
    })
  })

  it('reads a suite whose every test skipped, or that ran none, as skipped — never passed', () => {
    const view = checkTestResults(
      check({
        testSuites: [
          { name: 'A', tests: 2, passed: 0, failed: 0, skipped: 2 },
          { name: 'B', tests: 0, passed: 0, failed: 0, skipped: 0 },
        ],
      }),
    )
    expect(view?.results?.tests.map((t) => t.status)).toEqual(['skipped', 'skipped'])
    expect(view?.results?.summary).toMatchObject({ total: 2, passed: 0, skipped: 2 })
  })

  it('says how many suites the record left out, in the singular for one', () => {
    const suite = { name: 'A', tests: 1, passed: 1, failed: 0, skipped: 0 }
    expect(
      checkTestResults(check({ testSuites: [suite], testSuitesOmitted: 12 }))?.omittedLabel,
    ).toBe('12 more suites not kept')
    expect(
      checkTestResults(check({ testSuites: [suite], testSuitesOmitted: 1 }))?.omittedLabel,
    ).toBe('1 more suite not kept')
  })

  it('says a counted run kept no suites instead of restating its totals as a one-row group', () => {
    const view = checkTestResults(
      check({
        command: 'npm run test',
        summary: '13111/13111 passed',
        durationMs: 205027,
        testCount: { total: 13111, passed: 13111, failed: 0, skipped: 0 },
        details:
          'Output (last lines):\n \u001b[32m✓\u001b[39m src/index.test.ts (1 test) 2ms\n Test Files  427 passed (427)\n      Tests\n… [truncated]',
      }),
    )
    expect(view).toEqual({
      results: undefined,
      omittedLabel: undefined,
      unrecordedNote: TEST_SUITES_NOT_RECORDED_TOTALS,
      unfinished: undefined,
    })
  })

  it('reads an older record’s count from its summary, and still lists no invented group', () => {
    const view = checkTestResults(check({ summary: '128/132 passed, 1 failed, 3 skipped' }))
    expect(view).toEqual({
      results: undefined,
      omittedLabel: undefined,
      unrecordedNote: TEST_SUITES_NOT_RECORDED_TOTALS,
      unfinished: undefined,
    })
  })

  it('groups the failing tests the runner named by file, without escape codes', () => {
    const view = checkTestResults(
      check({
        kind: 'tests',
        status: 'failed',
        testCount: { total: 5, passed: 2, failed: 3, skipped: 0 },
        details: [
          'src/a.test.ts › adds\n\u001b[31mexpected 1 to be 2\u001b[39m',
          'src/a.test.ts › subtracts\nexpected 0 to be 1',
          'src/b.test.ts › multiplies',
        ].join('\n\n'),
      }),
    )
    expect(view?.results?.tests).toEqual([
      {
        filePath: 'src/a.test.ts',
        status: 'fail',
        summary: { total: 2, passed: 0, failed: 2, skipped: 0 },
        failures: [
          { testName: 'adds', message: 'expected 1 to be 2' },
          { testName: 'subtracts', message: 'expected 0 to be 1' },
        ],
        passes: [],
        skips: [],
      },
      {
        filePath: 'src/b.test.ts',
        status: 'fail',
        summary: { total: 1, passed: 0, failed: 1, skipped: 0 },
        failures: [{ testName: 'multiplies' }],
        passes: [],
        skips: [],
      },
    ])
    expect(view?.results?.summary).toMatchObject({ total: 5, passed: 2, failed: 3 })
    expect(view?.unrecordedNote).toBe(TEST_SUITES_NOT_RECORDED_FAILURES)
  })

  it('counts the named failures when the run kept no count', () => {
    const view = checkTestResults(
      check({ kind: 'tests', status: 'failed', summary: 'Tests failed', details: '› it\nboom' }),
    )
    expect(view?.results?.summary).toMatchObject({ total: 1, passed: 0, failed: 1 })
    expect(view?.results?.tests).toEqual([
      expect.objectContaining({
        filePath: 'Unit tests',
        failures: [{ testName: 'it', message: 'boom' }],
      }),
    ])
  })

  it('never reads unstructured output as a failing test', () => {
    expect(
      checkTestResults(
        check({
          category: 'build',
          status: 'failed',
          summary: 'Command failed',
          details: 'Failing lines:\nerror TS2322\n\nOutput (last lines):\nexit 1',
        }),
      ),
    ).toBeUndefined()
  })

  it('reads a run that errored as an error', () => {
    const view = checkTestResults(
      check({ kind: 'tests', status: 'error', summary: 'Crashed', details: '› it\nboom' }),
    )
    expect(view?.results?.status).toBe('error')
  })

  it('is nothing for a check that counted no test and named none', () => {
    expect(checkTestResults(check())).toBeUndefined()
    expect(checkTestResults(check({ testSuites: [] }))).toBeUndefined()
    expect(
      checkTestResults(
        check({ status: 'error', testCount: { total: 0, passed: 0, failed: 0, skipped: 0 } }),
      ),
    ).toBeUndefined()
  })

  describe('a run that left files unfinished', () => {
    const stopped = {
      path: 'src/completion/CompletionTools.test.ts',
      reason: 'stopped after 30 s',
      timedOutAfterMs: 30_000,
      outputTail: 'waiting on the stream…',
    }
    const unfinishedRun = (over: Partial<VerificationCheckResult> = {}) =>
      check({
        kind: 'tests',
        status: 'error',
        summary: "1 file didn't finish (stopped after 30 s) — 132/132 passed in the other 2",
        testCount: { total: 132, passed: 132, failed: 0, skipped: 0 },
        unfinishedFiles: [stopped],
        ...over,
      })

    it('lists each file that stopped, with its last output, and the others as one passed row', () => {
      expect(checkTestResults(unfinishedRun())).toEqual({
        results: undefined,
        omittedLabel: undefined,
        unrecordedNote: undefined,
        unfinished: {
          files: [
            {
              path: stopped.path,
              reason: 'stopped after 30 s',
              stopped: true,
              outputTail: 'waiting on the stream…',
            },
          ],
          finished: {
            label: 'The other 2 files',
            countLabel: '132 tests',
            files: 2,
            passed: 132,
            listed: false,
          },
        },
      })
    })

    it('names the files that finished when the record kept their suites', () => {
      const view = checkTestResults(
        unfinishedRun({
          testSuites: [
            { name: 'McpServer.test.ts', tests: 100, passed: 100, failed: 0, skipped: 0 },
            { name: 'ToolLoopDetector.test.ts', tests: 32, passed: 32, failed: 0, skipped: 0 },
          ],
        }),
      )
      expect(view?.unfinished?.finished).toEqual({
        label: 'McpServer.test.ts · ToolLoopDetector.test.ts',
        countLabel: '132 tests',
        files: 2,
        passed: 132,
        listed: true,
      })
      expect(view?.results?.tests).toHaveLength(2)
      expect(view?.unrecordedNote).toBeUndefined()
    })

    it('says the other file in the singular, and a file that crashed was not stopped', () => {
      const view = checkTestResults(
        unfinishedRun({
          summary: "1 file didn't finish (crashed: boom) — 1/1 passed in the other file",
          testCount: { total: 1, passed: 1, failed: 0, skipped: 0 },
          unfinishedFiles: [{ path: 'b.test.ts', reason: 'crashed: boom' }],
        }),
      )
      expect(view?.unfinished).toEqual({
        files: [
          { path: 'b.test.ts', reason: 'crashed: boom', stopped: false, outputTail: undefined },
        ],
        finished: {
          label: 'The other file',
          countLabel: '1 test',
          files: 1,
          passed: 1,
          listed: false,
        },
      })
    })

    it('lists the files even when every one stopped and no test was counted', () => {
      const view = checkTestResults(
        unfinishedRun({
          summary: "1 file didn't finish (stopped after 30 s)",
          testCount: { total: 0, passed: 0, failed: 0, skipped: 0 },
        }),
      )
      expect(view?.unfinished?.files).toHaveLength(1)
      expect(view?.unfinished?.finished).toBeUndefined()
      expect(view?.unrecordedNote).toBeUndefined()
    })
  })
})
