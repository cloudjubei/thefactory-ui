import { errorStatus } from './errorMessage'
import {
  BACKEND_STARTUP_FAILURE_NOTICE_MS,
  BACKEND_STARTUP_POLL_INTERVAL_MS,
} from './backendStartupConstants'
import type {
  BackendKnowledgeMapsStartup,
  BackendStartup,
  BackendStartupLine,
  BackendStartupPass,
  BackendStartupStatus,
} from './backendStartupTypes'

/**
 * While the backend runs its initial search-index pass it serves nothing: every route answers 503
 * `{ status: 'starting', searchIndex, knowledgeMaps }`. `GET /health/startup` reports
 * `{ serving, ready, searchIndex, knowledgeMaps }`; `ready` comes with serving, while the knowledge maps'
 * startup pass may still build. The apps hold their data layer behind a loading screen until it is ready.
 */

type Body = Record<string, unknown>

const isBody = (value: unknown): value is Body => typeof value === 'object' && value !== null

const countOf = (value: unknown): number => (typeof value === 'number' ? value : 0)

function readPass(progress: unknown): BackendStartupPass {
  const pass = isBody(progress) ? progress : {}
  return {
    done: pass.state === 'ready',
    projectsDone: countOf(pass.projectsDone),
    projectsTotal: countOf(pass.projectsTotal),
  }
}

function readKnowledgeMaps(progress: unknown): BackendKnowledgeMapsStartup | undefined {
  if (!isBody(progress) || progress.state === 'not-started') return undefined
  const current = isBody(progress.current) ? progress.current : undefined
  return {
    ...readPass(progress),
    ...(current && typeof current.projectId === 'string'
      ? {
          current: {
            projectId: current.projectId,
            ...(typeof current.percent === 'number' ? { percent: current.percent } : {}),
          },
        }
      : {}),
    failed: Array.isArray(progress.failed)
      ? progress.failed.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

function readStartup(body: Body): BackendStartup {
  const knowledgeMaps = readKnowledgeMaps(body.knowledgeMaps)
  return { searchIndex: readPass(body.searchIndex), ...(knowledgeMaps ? { knowledgeMaps } : {}) }
}

/** The startup progress a failed call carries when the backend is still starting, else `undefined`. */
export function readBackendStarting(err: unknown): BackendStartup | undefined {
  if (!isBody(err)) return undefined
  const response = (err as { response?: { status?: number; data?: unknown } }).response
  if (response?.status !== 503 || !isBody(response.data) || response.data.status !== 'starting')
    return undefined
  return readStartup(response.data)
}

/**
 * Reads a `GET /health/startup` answer. Anything unrecognised reads as ready, so a backend without
 * the endpoint never holds the app.
 */
export function readStartupStatus(body: unknown): BackendStartupStatus {
  if (!isBody(body)) return { ready: true, startup: null }
  return {
    ready: body.ready !== false,
    startup: isBody(body.searchIndex) ? readStartup(body) : null,
  }
}

/**
 * One `GET /health/startup` through `get` (the SDK client, throwing on error): the body of a 2xx,
 * nothing for an error answer (a backend without the endpoint, which {@link readStartupStatus} reads
 * as serving), and a throw only when no answer came back at all.
 */
export async function askStartupStatus(get: () => Promise<{ data: unknown }>): Promise<unknown> {
  try {
    return (await get()).data
  } catch (err) {
    if (errorStatus(err) !== undefined) return undefined
    throw err
  }
}

function knowledgeMapsDetail(maps: BackendKnowledgeMapsStartup): string | undefined {
  const parts = [
    ...(maps.current
      ? [
          `building ${maps.current.projectId}${
            maps.current.percent !== undefined ? ` ${maps.current.percent}%` : ''
          }`,
        ]
      : []),
    ...(maps.failed.length ? [`${maps.failed.length} failed: ${maps.failed.join(', ')}`] : []),
  ]
  if (parts.length) return parts.join(' · ')
  return maps.done ? 'done' : undefined
}

/** The loading screen's progress rows while the backend starts: the search index, then the knowledge maps. */
export function describeBackendStartup(startup: BackendStartup): BackendStartupLine[] {
  const { searchIndex, knowledgeMaps } = startup
  const mapsDetail = knowledgeMaps ? knowledgeMapsDetail(knowledgeMaps) : undefined
  return [
    {
      label: 'Indexing projects',
      completed: searchIndex.projectsDone,
      total: searchIndex.projectsTotal,
      ...(searchIndex.done ? { detail: 'done' } : {}),
    },
    ...(knowledgeMaps
      ? [
          {
            label: 'Knowledge maps',
            completed: knowledgeMaps.projectsDone,
            total: knowledgeMaps.projectsTotal,
            ...(mapsDetail ? { detail: mapsDetail } : {}),
          },
        ]
      : []),
  ]
}

export interface BackendStartupProbe {
  start(): void
  stop(): void
}

/**
 * Asks the backend every `intervalMs` whether it is ready yet, reporting each answer, until it is.
 * A failed ask reads as ready while nothing says the backend is starting — an unreachable backend
 * is the app's own error screen to show. Once it has said so (or `knownStarting`, when a call was
 * just refused as starting), a failed ask is only asked again: letting the app through would have
 * its calls refused and close the gate again, over and over. When a startup it watched ends with
 * knowledge maps that failed, the ready answer waits {@link BACKEND_STARTUP_FAILURE_NOTICE_MS}, the
 * final progress showing meanwhile, so the failures are seen.
 */
export function createBackendStartupProbe({
  fetchStatus,
  onChange,
  intervalMs = BACKEND_STARTUP_POLL_INTERVAL_MS,
  knownStarting = false,
}: {
  fetchStatus: () => Promise<unknown>
  onChange: (status: BackendStartupStatus) => void
  intervalMs?: number
  knownStarting?: boolean
}): BackendStartupProbe {
  let running = false
  let starting = knownStarting
  let timer: ReturnType<typeof setTimeout> | undefined

  const askAgain = () => {
    timer = setTimeout(() => void ask(), intervalMs)
  }

  const finish = (status: BackendStartupStatus) => {
    running = false
    onChange(status)
  }

  const ask = async () => {
    let status: BackendStartupStatus | undefined
    try {
      status = readStartupStatus(await fetchStatus())
    } catch {
      status = starting ? undefined : { ready: true, startup: null }
    }
    if (!running) return
    if (!status) return askAgain()
    if (!status.ready) {
      onChange(status)
      starting = true
      return askAgain()
    }
    const ready = status
    if (!starting || !ready.startup?.knowledgeMaps?.failed.length) return finish(ready)
    onChange({ ...ready, ready: false })
    timer = setTimeout(() => finish(ready), BACKEND_STARTUP_FAILURE_NOTICE_MS)
  }

  return {
    start() {
      if (running) return
      running = true
      void ask()
    },
    stop() {
      running = false
      if (timer) clearTimeout(timer)
      timer = undefined
    },
  }
}
