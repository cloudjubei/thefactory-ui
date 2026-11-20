import {
  readColleagueReviewChecks,
  setColleagueReviewCheckRequired,
} from '../api/colleagueReviewSourceApi'
import { extractErrorMessage } from '../api/errorMessage'
import type { WsClient } from '../api/WsClient'
import { reviewCheckChangeNeeded, reviewMergeChecksShown } from '../utils/reviewMergeChecks'
import { REVIEW_MERGE_CHECKS_TEXT } from '../utils/reviewMergeChecksConstants'
import type {
  ReviewCheckRequirement,
  ReviewMergeChecks,
  ReviewMergeChecksSnapshot,
} from '../utils/reviewMergeChecksTypes'

type Entry = {
  checks: ReviewMergeChecks | undefined
  readError: string | undefined
  changes: readonly ReviewCheckRequirement[]
  actionError: string | undefined
  /** Reads begun so far; an answer to one begun before the last change was answered is dropped. */
  reads: number
  /** The read count when the backend last answered a change. */
  changedAt: number
  holders: number
  disconnect: (() => void) | undefined
  listeners: Set<() => void>
  shown: { key: unknown[]; snapshot: ReviewMergeChecksSnapshot } | undefined
}

const EMPTY: ReviewMergeChecksSnapshot = {
  checks: undefined,
  readError: undefined,
  changes: [],
  actionError: undefined,
}

const sameCheck = (a: ReviewCheckRequirement, b: ReviewCheckRequirement): boolean =>
  a.repository.toLowerCase() === b.repository.toLowerCase() &&
  a.check.toLowerCase() === b.check.toLowerCase()

/**
 * Each group's merge checks, shared by every view that shows them: read once
 * however many hold them, again when the socket comes back — reading them
 * reads GitHub, so a change elsewhere shows the next time they are opened.
 * A tick shows at once, is sent only when it changes something, and rolls
 * back with why; of quick changes to one check the latest stays, an answer
 * to an earlier one coming after a later one's being passed over.
 */
export class ReviewMergeChecksStore {
  private readonly _entries = new Map<string, Entry>()
  private readonly _ws: Pick<WsClient, 'onReconnect'>

  constructor(ws: Pick<WsClient, 'onReconnect'>) {
    this._ws = ws
  }

  private _entry(groupId: string): Entry {
    const held = this._entries.get(groupId)
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
    this._entries.set(groupId, entry)
    return entry
  }

  private _tell(entry: Entry, patch: Partial<Entry>): void {
    Object.assign(entry, patch)
    for (const listener of [...entry.listeners]) listener()
  }

  /** Hold a group's checks; returns the release. */
  retain = (groupId: string): (() => void) => {
    const entry = this._entry(groupId)
    entry.holders += 1
    if (entry.holders === 1) {
      entry.disconnect = this._ws.onReconnect(() => void this.refresh(groupId))
      void this.refresh(groupId)
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

  listen = (groupId: string, listener: () => void): (() => void) => {
    const entry = this._entry(groupId)
    entry.listeners.add(listener)
    return () => {
      entry.listeners.delete(listener)
    }
  }

  /** The group's checks as views draw them — the same object until something changes. */
  snapshot = (groupId: string): ReviewMergeChecksSnapshot => {
    const entry = this._entries.get(groupId)
    if (!entry) return EMPTY
    const key = [entry.checks, entry.readError, entry.changes, entry.actionError]
    if (entry.shown && entry.shown.key.every((part, at) => part === key[at])) {
      return entry.shown.snapshot
    }
    const snapshot: ReviewMergeChecksSnapshot = {
      checks: reviewMergeChecksShown(entry.checks, entry.changes),
      readError: entry.readError,
      changes: entry.changes,
      actionError: entry.actionError,
    }
    entry.shown = { key, snapshot }
    return snapshot
  }

  /** Read the group's checks again; an answer begun before the last change was answered is dropped. */
  refresh = async (groupId: string): Promise<void> => {
    const entry = this._entry(groupId)
    const read = ++entry.reads
    try {
      const checks = await readColleagueReviewChecks(groupId)
      if (read <= entry.changedAt) return
      this._tell(entry, { checks, readError: undefined })
    } catch (err) {
      if (read <= entry.changedAt) return
      this._tell(entry, {
        readError: extractErrorMessage(err, REVIEW_MERGE_CHECKS_TEXT.readFailed),
      })
    }
  }

  /** Make a check required to merge or not: shown at once, sent only when it changes something, rolled back with why. */
  setRequired = async (groupId: string, change: ReviewCheckRequirement): Promise<void> => {
    const entry = this._entry(groupId)
    const shown = reviewMergeChecksShown(entry.checks, entry.changes)
    if (!reviewCheckChangeNeeded(shown, change)) return
    this._tell(entry, { changes: [...entry.changes, change], actionError: undefined })
    try {
      const kept = await setColleagueReviewCheckRequired(groupId, change)
      const at = entry.changes.indexOf(change)
      if (at < 0) return
      this._tell(entry, {
        checks: reviewMergeChecksShown(entry.checks, [{ ...change, required: kept.required }]),
        changes: entry.changes.filter((held, i) => !(i <= at && sameCheck(held, change))),
        changedAt: entry.reads,
      })
    } catch (err) {
      if (!entry.changes.includes(change)) return
      this._tell(entry, {
        changes: entry.changes.filter((held) => held !== change),
        actionError: extractErrorMessage(err, REVIEW_MERGE_CHECKS_TEXT.setFailed),
      })
    }
  }
}
