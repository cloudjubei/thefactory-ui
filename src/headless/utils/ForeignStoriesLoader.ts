import { storyLookup } from './storyDependency'
import type { FetchProjectStories, ForeignStoriesState } from './storyDependencyTypes'

/**
 * Other projects' stories, fetched for the dependency chips that name them:
 * each project once until it is stale or changes, still shown while it is
 * fetched again. Asking never notifies at once — listeners hear only when a
 * fetch settles — so a render may ask.
 */
export class ForeignStoriesLoader {
  private readonly _fetch: FetchProjectStories
  private readonly _ttlMs: number
  private readonly _now: () => number
  private readonly _states = new Map<string, ForeignStoriesState>()
  private readonly _inFlight = new Set<string>()
  private readonly _changed = new Set<string>()
  private readonly _listeners = new Set<() => void>()

  constructor(fetch: FetchProjectStories, ttlMs: number, now: () => number = Date.now) {
    this._fetch = fetch
    this._ttlMs = ttlMs
    this._now = now
  }

  /** Where the project's stories have got to; `undefined` when they were never asked for. */
  state(projectId: string): ForeignStoriesState | undefined {
    return this._states.get(projectId)
  }

  /** Fetch the project's stories unless they are fresh or already on their way. */
  request(projectId: string): void {
    if (this._inFlight.has(projectId)) return
    const current = this._states.get(projectId)
    if (current && current.status !== 'loading' && this._now() - current.at < this._ttlMs) return
    if (!current) this._states.set(projectId, { status: 'loading' })
    this._inFlight.add(projectId)
    this._fetch(projectId)
      .then(
        (stories) => {
          this._states.set(projectId, {
            status: 'loaded',
            lookup: storyLookup(stories),
            at: this._now(),
          })
        },
        () => {
          if (this._states.get(projectId)?.status === 'loaded') return
          this._states.set(projectId, { status: 'failed', at: this._now() })
        },
      )
      .finally(() => {
        this._inFlight.delete(projectId)
        if (this._changed.delete(projectId)) this.invalidate(projectId)
        for (const listener of this._listeners) listener()
      })
  }

  /**
   * The project's stories changed: fetch them again, if they were ever
   * fetched — after the fetch on its way, which may predate the change.
   */
  invalidate(projectId: string): void {
    const current = this._states.get(projectId)
    if (!current) return
    if (this._inFlight.has(projectId)) {
      this._changed.add(projectId)
      return
    }
    if (current.status === 'loading') return
    this._states.set(projectId, { ...current, at: Number.NEGATIVE_INFINITY })
    this.request(projectId)
  }

  /** Hear when a fetch settles. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }
}
