import { extractServerError } from '../api/helpers'
import { COMMIT_DETAILS_TEXT } from '../utils/commitDetailsConstants'
import type { CommitDetailsState } from '../utils/commitDetailsTypes'

export type CommitDetailsResult = Exclude<CommitDetailsState, { status: 'loading' }>

export type CommitDetailsLoad = (projectId: string, sha: string) => Promise<CommitDetailsResult>

/**
 * Commits read for their chips, each at most once per project. A commit is
 * immutable, so what was read — or that it is not here — is kept; a failed read
 * is forgotten so the next ask tries again.
 */
export class CommitDetailsCache {
  private readonly _load: CommitDetailsLoad
  private readonly _pending = new Map<string, Promise<CommitDetailsResult>>()
  private readonly _settled = new Map<string, CommitDetailsResult>()

  constructor(load: CommitDetailsLoad) {
    this._load = load
  }

  peek(projectId: string, sha: string): CommitDetailsResult | undefined {
    return this._settled.get(`${projectId}:${sha}`)
  }

  get(projectId: string, sha: string): Promise<CommitDetailsResult> {
    const key = `${projectId}:${sha}`
    const settled = this._settled.get(key)
    if (settled) return Promise.resolve(settled)
    const pending = this._pending.get(key)
    if (pending) return pending
    const read = this._load(projectId, sha)
      .catch(
        (err: unknown): CommitDetailsResult => ({
          status: 'failed',
          message: extractServerError(err, COMMIT_DETAILS_TEXT.failed).message,
        }),
      )
      .then((result) => {
        this._pending.delete(key)
        if (result.status !== 'failed') this._settled.set(key, result)
        return result
      })
    this._pending.set(key, read)
    return read
  }
}
