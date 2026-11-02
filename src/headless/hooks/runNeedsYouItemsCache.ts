import type { ProcessNeedsYouItem } from 'thefactory-tools/types'

import { extractServerError } from '../api/helpers'
import { RUN_NEEDS_YOU_ITEMS_LOAD_FAILED } from '../utils/runNeedsYouItemsConstants'
import type { RunNeedsYouItemsResult } from '../utils/runNeedsYouItemsTypes'

/**
 * Runs' "Needs you" items read for their chips: one read per run however many
 * chips point into it, kept until the run changes ({@link forget}); a failed
 * read is not kept, so the next ask tries again.
 */
export class RunNeedsYouItemsCache {
  private readonly _load: (runId: string) => Promise<ProcessNeedsYouItem[]>
  private readonly _pending = new Map<string, Promise<RunNeedsYouItemsResult>>()
  private readonly _settled = new Map<string, RunNeedsYouItemsResult>()

  constructor(load: (runId: string) => Promise<ProcessNeedsYouItem[]>) {
    this._load = load
  }

  peek(runId: string): RunNeedsYouItemsResult | undefined {
    return this._settled.get(runId)
  }

  forget(runId: string): void {
    this._settled.delete(runId)
  }

  get(runId: string): Promise<RunNeedsYouItemsResult> {
    const settled = this._settled.get(runId)
    if (settled) return Promise.resolve(settled)
    const pending = this._pending.get(runId)
    if (pending) return pending
    const read = this._load(runId)
      .then(
        (items): RunNeedsYouItemsResult => ({ status: 'ready', items }),
        (err: unknown): RunNeedsYouItemsResult => ({
          status: 'failed',
          message: extractServerError(err, RUN_NEEDS_YOU_ITEMS_LOAD_FAILED).message,
        }),
      )
      .then((result) => {
        this._pending.delete(runId)
        if (result.status === 'ready') this._settled.set(runId, result)
        return result
      })
    this._pending.set(runId, read)
    return read
  }
}
