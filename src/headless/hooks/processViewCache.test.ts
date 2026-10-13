import { beforeEach, describe, expect, it } from 'vitest'
import type { ProcessIntegrationOptions, ProcessRun } from 'thefactory-tools/types'

import {
  cachedProcessRun,
  clearProcessViewCaches,
  integrationOptionsCache,
  processRunCache,
  processRunListCache,
  processRunListKey,
  storySignoffSourceCache,
} from './processViewCache'
import { ALL_PROJECTS_PROCESS_RUN_LIST_KEY } from '../utils/processViewCacheConstants'

const run = (id: string, title = id): ProcessRun => ({ id, title }) as unknown as ProcessRun

beforeEach(() => clearProcessViewCaches())

describe('processRunListKey', () => {
  it('keys a project’s list by its id', () => {
    expect(processRunListKey('p1')).toBe('p1')
  })

  it('keys the all-projects list apart from any project', () => {
    expect(processRunListKey(undefined)).toBe(ALL_PROJECTS_PROCESS_RUN_LIST_KEY)
  })
})

describe('cachedProcessRun', () => {
  it('is undefined without a run id', () => {
    expect(cachedProcessRun(undefined)).toBeUndefined()
  })

  it('prefers the run’s own read over a list’s copy', () => {
    processRunListCache.set('p1', [run('r1', 'from list')])
    processRunCache.set('r1', run('r1', 'own read'))
    expect(cachedProcessRun('r1')?.title).toBe('own read')
  })

  it('falls back to the row a list held', () => {
    processRunListCache.set('p1', [run('r0'), run('r1', 'from list')])
    expect(cachedProcessRun('r1')?.title).toBe('from list')
  })

  it('is undefined for a run nothing has read', () => {
    processRunListCache.set('p1', [run('r0')])
    expect(cachedProcessRun('r9')).toBeUndefined()
  })
})

describe('clearProcessViewCaches', () => {
  it('forgets every cache', () => {
    processRunListCache.set('p1', [run('r1')])
    processRunCache.set('r1', run('r1'))
    storySignoffSourceCache.set('p1|s1', { processRuns: [], cliRuns: [] })
    integrationOptionsCache.set('r1', {} as ProcessIntegrationOptions)
    clearProcessViewCaches()
    expect(cachedProcessRun('r1')).toBeUndefined()
    expect(storySignoffSourceCache.get('p1|s1')).toBeUndefined()
    expect(integrationOptionsCache.get('r1')).toBeUndefined()
  })
})
