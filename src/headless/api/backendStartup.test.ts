import type { AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  askStartupStatus,
  createBackendStartupProbe,
  describeBackendStartup,
  readBackendStarting,
  readStartupStatus,
} from './backendStartup'
import { BACKEND_STARTUP_FAILURE_NOTICE_MS } from './backendStartupConstants'
import type { BackendStartup, BackendStartupStatus } from './backendStartupTypes'
import { client } from './generated/client.gen'

const progress = { state: 'indexing', projectsDone: 7, projectsTotal: 20 }
const mapsBuilding = {
  state: 'building',
  projectsDone: 3,
  projectsTotal: 20,
  current: { projectId: 'thefactory-tools', elapsedMs: 40_000, percent: 35 },
  queued: 16,
  failed: ['broken'],
}
const indexingStartup: BackendStartup = {
  searchIndex: { done: false, projectsDone: 7, projectsTotal: 20 },
  knowledgeMaps: {
    done: false,
    projectsDone: 3,
    projectsTotal: 20,
    current: { projectId: 'thefactory-tools', percent: 35 },
    failed: ['broken'],
  },
}
const indexDone = { state: 'ready', projectsDone: 20, projectsTotal: 20 }
const mapsDone = { state: 'ready', projectsDone: 20, projectsTotal: 20, queued: 0, failed: [] }
const mapsDoneWithFailures = { ...mapsDone, failed: ['broken', 'huge'] }

describe('readBackendStarting', () => {
  it('reads the indexing and knowledge-map progress from a "starting" 503', () => {
    expect(
      readBackendStarting({
        isAxiosError: true,
        response: {
          status: 503,
          data: { status: 'starting', searchIndex: progress, knowledgeMaps: mapsBuilding },
        },
      }),
    ).toEqual(indexingStartup)
  })

  it('reads missing progress as zero of zero, with no knowledge maps', () => {
    expect(
      readBackendStarting({
        isAxiosError: true,
        response: { status: 503, data: { status: 'starting' } },
      }),
    ).toEqual({ searchIndex: { done: false, projectsDone: 0, projectsTotal: 0 } })
  })

  it('is undefined for any other failure', () => {
    expect(
      readBackendStarting({
        isAxiosError: true,
        response: { status: 503, data: { error: 'down' } },
      }),
    ).toBeUndefined()
    expect(
      readBackendStarting({
        isAxiosError: true,
        response: { status: 500, data: { status: 'starting' } },
      }),
    ).toBeUndefined()
    expect(readBackendStarting({ isAxiosError: true })).toBeUndefined()
    expect(readBackendStarting(new Error('boom'))).toBeUndefined()
    expect(readBackendStarting(undefined)).toBeUndefined()
  })
})

describe('readStartupStatus', () => {
  it('reads a backend that is still indexing and building maps', () => {
    expect(
      readStartupStatus({
        serving: false,
        ready: false,
        searchIndex: progress,
        knowledgeMaps: mapsBuilding,
      }),
    ).toEqual({ ready: false, startup: indexingStartup })
  })

  it('reads a backend that serves while its maps still build as not ready', () => {
    expect(
      readStartupStatus({
        serving: true,
        ready: false,
        searchIndex: indexDone,
        knowledgeMaps: mapsBuilding,
      }),
    ).toMatchObject({ ready: false, startup: { searchIndex: { done: true } } })
  })

  it('reads a ready backend, keeping how its startup ended', () => {
    expect(
      readStartupStatus({
        serving: true,
        ready: true,
        searchIndex: indexDone,
        knowledgeMaps: mapsDoneWithFailures,
      }),
    ).toEqual({
      ready: true,
      startup: {
        searchIndex: { done: true, projectsDone: 20, projectsTotal: 20 },
        knowledgeMaps: {
          done: true,
          projectsDone: 20,
          projectsTotal: 20,
          failed: ['broken', 'huge'],
        },
      },
    })
  })

  it('leaves out the knowledge maps when the backend builds none at startup', () => {
    const notStarted = { state: 'not-started', projectsDone: 0, projectsTotal: 0, failed: [] }
    expect(
      readStartupStatus({
        serving: true,
        ready: true,
        searchIndex: indexDone,
        knowledgeMaps: notStarted,
      }).startup,
    ).toEqual({ searchIndex: { done: true, projectsDone: 20, projectsTotal: 20 } })
  })

  it('drops knowledge-map fields it cannot read instead of trusting them', () => {
    expect(
      readStartupStatus({
        serving: false,
        ready: false,
        searchIndex: progress,
        knowledgeMaps: { state: 'building', current: { percent: 5 }, failed: 'many' },
      }).startup?.knowledgeMaps,
    ).toEqual({ done: false, projectsDone: 0, projectsTotal: 0, failed: [] })
  })

  it('keeps only the project ids among the failed projects', () => {
    expect(
      readStartupStatus({
        ready: false,
        searchIndex: progress,
        knowledgeMaps: { ...mapsBuilding, failed: ['broken', 7, null] },
      }).startup?.knowledgeMaps?.failed,
    ).toEqual(['broken'])
  })

  it('takes an answer it does not recognise as ready, so an older backend is never held', () => {
    expect(readStartupStatus(undefined)).toEqual({ ready: true, startup: null })
    expect(readStartupStatus({ status: 'ok' })).toEqual({ ready: true, startup: null })
  })
})

describe('describeBackendStartup', () => {
  it('counts the projects indexed so far', () => {
    expect(
      describeBackendStartup({ searchIndex: { done: false, projectsDone: 7, projectsTotal: 20 } }),
    ).toEqual([{ label: 'Indexing projects', completed: 7, total: 20 }])
  })

  it('says the index is done once its pass has settled', () => {
    expect(
      describeBackendStartup({ searchIndex: { done: true, projectsDone: 20, projectsTotal: 20 } }),
    ).toEqual([{ label: 'Indexing projects', completed: 20, total: 20, detail: 'done' }])
  })

  it('names the map being built, its progress and the projects that failed so far', () => {
    expect(describeBackendStartup(indexingStartup)[1]).toEqual({
      label: 'Knowledge maps',
      completed: 3,
      total: 20,
      detail: 'building thefactory-tools 35% · 1 failed: broken',
    })
  })

  it('names the map being built before the pipeline reports progress', () => {
    const startup: BackendStartup = {
      searchIndex: { done: true, projectsDone: 1, projectsTotal: 1 },
      knowledgeMaps: {
        done: false,
        projectsDone: 0,
        projectsTotal: 1,
        current: { projectId: 'p1' },
        failed: [],
      },
    }
    expect(describeBackendStartup(startup)[1]?.detail).toBe('building p1')
  })

  it('lists the failed projects once the map pass has settled with failures', () => {
    const startup: BackendStartup = {
      searchIndex: { done: true, projectsDone: 20, projectsTotal: 20 },
      knowledgeMaps: { done: true, projectsDone: 20, projectsTotal: 20, failed: ['a', 'b'] },
    }
    expect(describeBackendStartup(startup)[1]?.detail).toBe('2 failed: a, b')
  })

  it('says the maps are done once their pass has settled cleanly', () => {
    const startup: BackendStartup = {
      searchIndex: { done: true, projectsDone: 20, projectsTotal: 20 },
      knowledgeMaps: { done: true, projectsDone: 20, projectsTotal: 20, failed: [] },
    }
    expect(describeBackendStartup(startup)[1]?.detail).toBe('done')
  })

  it('says nothing more of a pass that is waiting for its first project', () => {
    const startup: BackendStartup = {
      searchIndex: { done: false, projectsDone: 0, projectsTotal: 0 },
      knowledgeMaps: { done: false, projectsDone: 0, projectsTotal: 0, failed: [] },
    }
    expect(describeBackendStartup(startup)[1]).toEqual({
      label: 'Knowledge maps',
      completed: 0,
      total: 0,
    })
  })
})

describe('createBackendStartupProbe', () => {
  afterEach(() => vi.useRealTimers())

  function probeWith(answers: Array<unknown | Error>, knownStarting = false) {
    const changes: BackendStartupStatus[] = []
    let calls = 0
    const probe = createBackendStartupProbe({
      knownStarting,
      fetchStatus: async () => {
        const answer = answers[Math.min(calls++, answers.length - 1)]
        if (answer instanceof Error) throw answer
        return answer
      },
      onChange: (status) => changes.push(status),
      intervalMs: 1_000,
    })
    return { probe, changes, calls: () => calls }
  }

  const indexing = (projectsDone: number) => ({
    serving: false,
    ready: false,
    searchIndex: { projectsDone, projectsTotal: 20 },
  })
  const pass = (projectsDone: number) => ({ done: false, projectsDone, projectsTotal: 20 })

  it('asks once a second until the backend is ready, not merely serving', async () => {
    vi.useFakeTimers()
    const { probe, changes, calls } = probeWith([
      indexing(3),
      { serving: true, ready: false, searchIndex: indexDone, knowledgeMaps: mapsBuilding },
      { serving: true, ready: true, searchIndex: indexDone, knowledgeMaps: mapsDone },
    ])

    probe.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(changes.at(-1)).toEqual({ ready: false, startup: { searchIndex: pass(3) } })
    await vi.advanceTimersByTimeAsync(1_000)
    expect(changes.at(-1)).toMatchObject({
      ready: false,
      startup: { knowledgeMaps: { current: { projectId: 'thefactory-tools' } } },
    })
    await vi.advanceTimersByTimeAsync(1_000)
    expect(changes.at(-1)).toMatchObject({ ready: true })

    await vi.advanceTimersByTimeAsync(5_000)
    expect(calls()).toBe(3)
  })

  it('holds a ready answer for a moment when the map pass it watched ended with failures', async () => {
    vi.useFakeTimers()
    const finished = {
      serving: true,
      ready: true,
      searchIndex: indexDone,
      knowledgeMaps: mapsDoneWithFailures,
    }
    const { probe, changes, calls } = probeWith([indexing(3), finished])

    probe.start()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(changes.at(-1)).toEqual({ ...readStartupStatus(finished), ready: false })
    await vi.advanceTimersByTimeAsync(BACKEND_STARTUP_FAILURE_NOTICE_MS - 1)
    expect(changes.at(-1)?.ready).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(changes.at(-1)).toEqual(readStartupStatus(finished))
    expect(calls()).toBe(2)
  })

  it('lets a ready backend straight through when it never showed the app a startup, failures or not', async () => {
    vi.useFakeTimers()
    const finished = {
      serving: true,
      ready: true,
      searchIndex: indexDone,
      knowledgeMaps: mapsDoneWithFailures,
    }
    const { probe, changes } = probeWith([finished])

    probe.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(changes).toEqual([readStartupStatus(finished)])
  })

  it('cancels a failure notice when stopped', async () => {
    vi.useFakeTimers()
    const { probe, changes } = probeWith([
      indexing(3),
      { serving: true, ready: true, searchIndex: indexDone, knowledgeMaps: mapsDoneWithFailures },
    ])

    probe.start()
    await vi.advanceTimersByTimeAsync(1_000)
    probe.stop()
    await vi.advanceTimersByTimeAsync(BACKEND_STARTUP_FAILURE_NOTICE_MS)

    expect(changes.map((c) => c.ready)).toEqual([false, false])
  })

  it('lets the app through when the backend cannot answer, so its own error screen shows', async () => {
    vi.useFakeTimers()
    const { probe, changes } = probeWith([new Error('Network Error')])

    probe.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(changes).toEqual([{ ready: true, startup: null }])
  })

  it('keeps waiting through a failed ask once the backend has said it is starting', async () => {
    vi.useFakeTimers()
    const { probe, changes } = probeWith([
      indexing(3),
      new Error('Network Error'),
      indexing(9),
      { ready: true },
    ])

    probe.start()
    await vi.advanceTimersByTimeAsync(3_000)

    expect(changes).toEqual([
      { ready: false, startup: { searchIndex: pass(3) } },
      { ready: false, startup: { searchIndex: pass(9) } },
      { ready: true, startup: null },
    ])
  })

  it('keeps waiting through a failed first ask when a call was already refused as starting', async () => {
    vi.useFakeTimers()
    const { probe, changes } = probeWith(
      [new Error('Network Error'), indexing(5), { ready: true }],
      true,
    )

    probe.start()
    await vi.advanceTimersByTimeAsync(2_000)

    expect(changes).toEqual([
      { ready: false, startup: { searchIndex: pass(5) } },
      { ready: true, startup: null },
    ])
  })

  it('reports nothing and asks no more once stopped', async () => {
    vi.useFakeTimers()
    const { probe, changes, calls } = probeWith([indexing(7)])

    probe.start()
    await vi.advanceTimersByTimeAsync(0)
    probe.stop()
    await vi.advanceTimersByTimeAsync(5_000)

    expect(calls()).toBe(1)
    expect(changes).toHaveLength(1)
  })

  it('drops an answer that arrives after it was stopped', async () => {
    vi.useFakeTimers()
    let release!: (v: unknown) => void
    const changes: BackendStartupStatus[] = []
    const probe = createBackendStartupProbe({
      fetchStatus: () => new Promise((r) => (release = r)),
      onChange: (s) => changes.push(s),
      intervalMs: 1_000,
    })

    probe.start()
    probe.stop()
    release({ ready: true })
    await vi.advanceTimersByTimeAsync(0)

    expect(changes).toEqual([])
  })
})

describe('askStartupStatus', () => {
  /** Answers every request through the real SDK client with `reply`, or fails it with no answer. */
  function answer(reply: { status: number; data?: unknown } | 'no-answer') {
    const adapter: AxiosAdapter = async (config) => {
      if (reply === 'no-answer') {
        throw Object.assign(new Error('Network Error'), { isAxiosError: true, config })
      }
      const response = {
        status: reply.status,
        statusText: '',
        data: reply.data,
        headers: {},
        config,
      }
      if (reply.status >= 400) {
        throw Object.assign(new Error(`status ${reply.status}`), {
          isAxiosError: true,
          response,
          config,
        })
      }
      return response
    }
    client.setConfig({ baseURL: 'http://backend:7001', adapter } as Parameters<
      typeof client.setConfig
    >[0])
    return () => client.get({ url: '/health/startup', throwOnError: true })
  }

  it('returns the body of a 200', async () => {
    const body = { serving: false, ready: false, searchIndex: progress }
    expect(await askStartupStatus(answer({ status: 200, data: body }))).toEqual(body)
  })

  it('returns nothing for an error answer, so a backend without the endpoint reads as ready', async () => {
    const status = await askStartupStatus(answer({ status: 404, data: { error: 'Not Found' } }))
    expect(readStartupStatus(status)).toEqual({ ready: true, startup: null })
  })

  it('throws when the backend gave no answer at all', async () => {
    await expect(askStartupStatus(answer('no-answer'))).rejects.toThrow('Network Error')
  })
})
