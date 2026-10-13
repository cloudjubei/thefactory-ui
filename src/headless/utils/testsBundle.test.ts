import { describe, expect, it } from 'vitest'

import type { TestsResult } from '../api'
import { nextTestsBundle, testsBundleShows } from './testsBundle'
import type { TestsBundle, TestsDetail } from './testsBundleTypes'

const run = (id: string) => ({ id }) as unknown as TestsResult
const detail: TestsDetail = { available: ['a.test.ts'], lastCustomRun: null, lastCoverage: null }

describe('nextTestsBundle', () => {
  it('takes the last run read, and the detail when it was read', () => {
    expect(nextTestsBundle(undefined, { lastRun: run('r1'), detail })).toEqual({
      lastRun: run('r1'),
      detail,
    })
  })

  it('keeps the detail read before when only the last run was read again', () => {
    const prev: TestsBundle = { lastRun: run('r1'), detail }
    expect(nextTestsBundle(prev, { lastRun: run('r2') })).toEqual({ lastRun: run('r2'), detail })
  })

  it('holds no detail until it is read', () => {
    expect(nextTestsBundle(undefined, { lastRun: null })).toEqual({ lastRun: null, detail: null })
  })
})

describe('testsBundleShows', () => {
  const lastRunOnly: TestsBundle = { lastRun: run('r1'), detail: null }

  it('a last run is enough where only the badge reads it', () => {
    expect(testsBundleShows(lastRunOnly, false)).toBe(true)
  })

  it('the Tests screen waits for the detail', () => {
    expect(testsBundleShows(lastRunOnly, true)).toBe(false)
    expect(testsBundleShows({ lastRun: null, detail }, true)).toBe(true)
  })

  it('nothing read shows nothing', () => {
    expect(testsBundleShows(undefined, false)).toBe(false)
  })
})
