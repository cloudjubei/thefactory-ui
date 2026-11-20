import type { ProcessDecisionClient } from 'thefactory-tools/types'
import {
  askColleagueReviewDeveloper,
  readColleagueReviewMerge,
  resolveColleagueReviewMergeHere,
  startColleagueReviewMerge,
} from '../api/colleagueReviewMergeApi'
import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import type { WsClient } from '../api/WsClient'
import { REVIEW_MERGE_STOP_TEXT, REVIEW_MERGE_TEXT } from '../utils/colleagueReviewMergeConstants'
import type {
  ReviewMergeChoosing,
  ReviewMergeJob,
  ReviewMergeSnapshot,
  ReviewMergeStart,
} from '../utils/colleagueReviewMergeTypes'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'

type Key = { groupId: string; ticketKey: string }

type Entry = ReviewMergeSnapshot & {
  /** Reads begun so far; an answer to an older one than the last start is dropped. */
  reads: number
  /** The read count when the backend's last answer to a start came. */
  changedAt: number
  holders: number
  disconnect: (() => void) | undefined
  listeners: Set<() => void>
  shown: ReviewMergeSnapshot | undefined
}

const EMPTY: ReviewMergeSnapshot = {
  job: undefined,
  readError: undefined,
  starting: undefined,
  refusal: undefined,
  actionError: undefined,
  choosing: undefined,
}

const idOf = ({ groupId, ticketKey }: Key) => JSON.stringify([groupId, ticketKey])

/**
 * Each ticket review's approve-and-merge, shared by every card that shows it:
 * read once however many hold it, again when the ticket's review changes or
 * the socket comes back. Starting shows at once with the round's pull
 * requests waiting, once however often it is pressed and never while one
 * runs; a round that asked for changes is held with the backend's words until
 * it is merged anyway.
 */
export class ColleagueReviewMergeStore {
  private readonly _entries = new Map<string, Entry>()
  private readonly _ws: Pick<WsClient, 'on' | 'onReconnect'>

  constructor(ws: Pick<WsClient, 'on' | 'onReconnect'>) {
    this._ws = ws
  }

  private _entry(key: Key): Entry {
    const id = idOf(key)
    const held = this._entries.get(id)
    if (held) return held
    const entry: Entry = {
      ...EMPTY,
      reads: 0,
      changedAt: 0,
      holders: 0,
      disconnect: undefined,
      listeners: new Set(),
      shown: undefined,
    }
    this._entries.set(id, entry)
    return entry
  }

  private _tell(entry: Entry, patch: Partial<Entry>): void {
    Object.assign(entry, patch)
    entry.shown = undefined
    for (const listener of [...entry.listeners]) listener()
  }

  /** Hold a review's merge live; returns the release. */
  retain = (key: Key): (() => void) => {
    const entry = this._entry(key)
    entry.holders += 1
    if (entry.holders === 1) {
      const offUpdate = this._ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
        const update = data as Partial<Key> | undefined
        if (update?.groupId === key.groupId && update.ticketKey === key.ticketKey) {
          void this.refresh(key)
        }
      })
      const offReconnect = this._ws.onReconnect(() => void this.refresh(key))
      entry.disconnect = () => {
        offUpdate()
        offReconnect()
      }
      void this.refresh(key)
    }
    let released = false
    return () => {
      if (released) return
      released = true
      entry.holders -= 1
      if (entry.holders === 0) {
        entry.disconnect?.()
        entry.disconnect = undefined
      }
    }
  }

  listen = (key: Key, listener: () => void): (() => void) => {
    const entry = this._entry(key)
    entry.listeners.add(listener)
    return () => {
      entry.listeners.delete(listener)
    }
  }

  /** The review's merge as cards draw it — the same object until something changes. */
  snapshot = (key: Key): ReviewMergeSnapshot => {
    const entry = this._entries.get(idOf(key))
    if (!entry) return EMPTY
    entry.shown ??= {
      job: entry.job,
      readError: entry.readError,
      starting: entry.starting,
      refusal: entry.refusal,
      actionError: entry.actionError,
      choosing: entry.choosing,
    }
    return entry.shown
  }

  /** Read the review's merge again; an answer older than the last start is dropped. */
  refresh = async (key: Key): Promise<void> => {
    const entry = this._entry(key)
    const read = ++entry.reads
    try {
      const job = await readColleagueReviewMerge(key.groupId, key.ticketKey)
      if (read <= entry.changedAt) return
      this._tell(entry, { job, readError: undefined })
    } catch (err) {
      if (read <= entry.changedAt) return
      this._tell(entry, { readError: extractErrorMessage(err, REVIEW_MERGE_TEXT.readFailed) })
    }
  }

  /**
   * Approve the round's pull requests and merge them: starting at once, once
   * however often it is pressed and never while a merge runs; a round that
   * asked for changes is held with why, to be merged anyway with `override`.
   */
  start = async (key: Key, body: ReviewMergeStart): Promise<void> => {
    const entry = this._entry(key)
    if (entry.starting || entry.job?.state === 'running') return
    this._tell(entry, { starting: body, refusal: undefined, actionError: undefined })
    try {
      const job: ReviewMergeJob = await startColleagueReviewMerge(key.groupId, key.ticketKey, body)
      this._tell(entry, { job, starting: undefined, changedAt: entry.reads })
    } catch (err) {
      const why = extractErrorMessage(err, REVIEW_MERGE_TEXT.failed)
      const held = errorStatus(err) === 409 && !body.override
      this._tell(entry, {
        starting: undefined,
        ...(held ? { refusal: why } : { actionError: why }),
      })
    }
  }

  /** Resolve a merge stopped on a pull request's base here: shown at once, once however often pressed, rolled back with why when refused. */
  resolveHere = (key: Key, decidedVia: ProcessDecisionClient): Promise<void> =>
    this._choose(key, { kind: 'resolve' }, () =>
      resolveColleagueReviewMergeHere(key.groupId, key.ticketKey, decidedVia),
    )

  /** Ask the developer to bring the base in, with the person's words: shown at once, once however often pressed, rolled back with why when refused. */
  askDeveloper = (key: Key, text: string, decidedVia: ProcessDecisionClient): Promise<void> =>
    this._choose(key, { kind: 'ask', text }, () =>
      askColleagueReviewDeveloper(key.groupId, key.ticketKey, text, decidedVia),
    )

  private async _choose(
    key: Key,
    choosing: ReviewMergeChoosing,
    send: () => Promise<ReviewMergeJob>,
  ): Promise<void> {
    const entry = this._entry(key)
    const stop = entry.job?.state === 'failed' ? entry.job.baseConflict : undefined
    if (!stop || entry.choosing || stop.resolving || stop.asked) return
    this._tell(entry, { choosing, actionError: undefined })
    try {
      const job: ReviewMergeJob = await send()
      this._tell(entry, { job, choosing: undefined, changedAt: entry.reads })
    } catch (err) {
      this._tell(entry, {
        choosing: undefined,
        actionError: extractErrorMessage(err, REVIEW_MERGE_STOP_TEXT.failed),
      })
    }
  }
}
