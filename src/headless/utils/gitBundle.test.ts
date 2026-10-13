import { describe, expect, it } from 'vitest'

import type { GitLogCommit } from '../api'
import { gitBundleQuery, gitBundleShows, nextGitBundle } from './gitBundle'
import type { GitBundle } from './gitBundleTypes'

const commit = (hash: string) => ({ hash }) as unknown as GitLogCommit
const base = { status: null, branches: [], stashes: [] }

describe('gitBundleQuery', () => {
  it('reads a page of the log while a screen shows it', () => {
    expect(gitBundleQuery(true, 300)).toEqual({ all: true, maxCount: 300 })
  })

  it('reads no log on a switch nothing shows it for — status and branches only', () => {
    expect(gitBundleQuery(false, 300)).toEqual({ all: true, maxCount: 0 })
  })
})

describe('nextGitBundle', () => {
  it('takes the log read, with more to page when the page came back full', () => {
    const full = nextGitBundle(undefined, { ...base, log: [commit('a'), commit('b')] }, 2)
    expect(full).toMatchObject({ log: [commit('a'), commit('b')], hasMoreLog: true, hasLog: true })
    const short = nextGitBundle(undefined, { ...base, log: [commit('a')] }, 2)
    expect(short).toMatchObject({ hasMoreLog: false, hasLog: true })
  })

  it('keeps the log read before when the read left it out', () => {
    const prev: GitBundle = { ...base, log: [commit('a')], hasMoreLog: false, hasLog: true }
    const next = nextGitBundle(prev, { ...base, branches: [{ name: 'main' }] as never }, 300)
    expect(next).toMatchObject({ log: [commit('a')], hasMoreLog: false, hasLog: true })
    expect(next.branches).toEqual([{ name: 'main' }])
  })

  it('holds no log until one is read', () => {
    expect(nextGitBundle(undefined, base, 300)).toMatchObject({
      log: [],
      hasMoreLog: true,
      hasLog: false,
    })
  })
})

describe('gitBundleShows', () => {
  const noLog: GitBundle = { ...base, log: [], hasMoreLog: true, hasLog: false }

  it('status and branches are enough where no screen shows the log', () => {
    expect(gitBundleShows(noLog, false)).toBe(true)
  })

  it('a screen showing the log waits for it', () => {
    expect(gitBundleShows(noLog, true)).toBe(false)
    expect(gitBundleShows({ ...noLog, hasLog: true }, true)).toBe(true)
  })

  it('nothing read shows nothing', () => {
    expect(gitBundleShows(undefined, false)).toBe(false)
  })
})
