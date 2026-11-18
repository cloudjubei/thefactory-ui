import {
  clearColleagueReviewThread,
  readColleagueReviewSource,
  setColleagueReviewSettings,
  watchColleagueReviewThread,
} from '../api/colleagueReviewSourceApi'
import { extractErrorMessage } from '../api/errorMessage'
import type { WsClient } from '../api/WsClient'
import {
  reviewSettingsChangeNeeded,
  reviewSettingsShown,
  reviewSourceShown,
} from '../utils/colleagueReviewSource'
import { SLACK_SETTINGS_TEXT } from '../utils/colleagueReviewSourceConstants'
import type {
  ReviewSettingsChange,
  ReviewSourcePending,
  ReviewSourceSnapshot,
  ReviewSourceStatus,
  ReviewThreadWatch,
} from '../utils/colleagueReviewSourceTypes'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import { PROVIDER_CONNECTIONS_EVENT } from '../utils/credentialStoreEventConstants'

type Entry = {
  status: ReviewSourceStatus | undefined
  readError: string | undefined
  pending: ReviewSourcePending | undefined
  /** The person's settings changes on their way, in the order made. */
  settingChanges: readonly ReviewSettingsChange[]
  actionError: string | undefined
  /** Reads begun so far; an answer to an older one than the last change is dropped. */
  reads: number
  /** The read count when the backend's last answer to a change came. */
  changedAt: number
  /** The updates the person settled, and the read count once the backend had each. */
  settled: Map<string, { after?: number }>
  holders: number
  disconnect: (() => void) | undefined
  listeners: Set<() => void>
  shown: { key: unknown[]; snapshot: ReviewSourceSnapshot } | undefined
}

const EMPTY: ReviewSourceSnapshot = {
  status: undefined,
  readError: undefined,
  pending: undefined,
  actionError: undefined,
}

/**
 * Each group's watched Slack thread, shared by every view that shows it — the
 * Settings block, the review card's Post in thread, the Tickets tab's badge.
 * Read once however many hold it, again when the group's thread changes, a
 * connection changes, or the socket comes back. Watching, clearing and the
 * review settings show at once and roll back with why; updates the person settled leave the waiting
 * count at once, until a read begun after the backend had them.
 */
export class ColleagueReviewSourceStore {
  private readonly _entries = new Map<string, Entry>()
  private readonly _ws: Pick<WsClient, 'on' | 'onReconnect'>

  constructor(ws: Pick<WsClient, 'on' | 'onReconnect'>) {
    this._ws = ws
  }

  private _entry(groupId: string): Entry {
    const held = this._entries.get(groupId)
    if (held) return held
    const entry: Entry = {
      status: undefined,
      readError: undefined,
      pending: undefined,
      settingChanges: [],
      actionError: undefined,
      reads: 0,
      changedAt: 0,
      settled: new Map(),
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

  /** Hold a group's thread live; returns the release. */
  retain = (groupId: string): (() => void) => {
    const entry = this._entry(groupId)
    entry.holders += 1
    if (entry.holders === 1) {
      const offUpdate = this._ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
        const update = data as { groupId?: string; ticketKey?: string } | undefined
        if (update?.groupId === groupId && !update.ticketKey) void this.refresh(groupId)
      })
      const offConnections = this._ws.on(PROVIDER_CONNECTIONS_EVENT, () => {
        void this.refresh(groupId)
      })
      const offReconnect = this._ws.onReconnect(() => void this.refresh(groupId))
      entry.disconnect = () => {
        offUpdate()
        offConnections()
        offReconnect()
      }
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

  /** The group's thread as views draw it — the same object until something changes. */
  snapshot = (groupId: string): ReviewSourceSnapshot => {
    const entry = this._entries.get(groupId)
    if (!entry) return EMPTY
    const settling = [...entry.settled.values()].filter(
      ({ after }) => after === undefined || entry.changedAt <= after,
    ).length
    const key = [
      entry.status,
      entry.readError,
      entry.pending,
      entry.settingChanges,
      entry.actionError,
      settling,
    ]
    if (entry.shown && entry.shown.key.every((part, at) => part === key[at])) {
      return entry.shown.snapshot
    }
    const snapshot: ReviewSourceSnapshot = {
      status: reviewSourceShown(entry.status, entry.pending, settling, entry.settingChanges),
      readError: entry.readError,
      pending: entry.pending,
      actionError: entry.actionError,
    }
    entry.shown = { key, snapshot }
    return snapshot
  }

  /** Read the group's thread again; an answer older than the last change is dropped. */
  refresh = async (groupId: string): Promise<void> => {
    const entry = this._entry(groupId)
    const read = ++entry.reads
    try {
      const status = await readColleagueReviewSource(groupId)
      if (read <= entry.changedAt) return
      this._tell(entry, { status, readError: undefined, changedAt: read })
    } catch (err) {
      if (read <= entry.changedAt) return
      this._tell(entry, { readError: extractErrorMessage(err, SLACK_SETTINGS_TEXT.readFailed) })
    }
  }

  private async _change(
    groupId: string,
    pending: ReviewSourcePending,
    send: () => Promise<ReviewSourceStatus>,
    failed: string,
  ): Promise<void> {
    const entry = this._entry(groupId)
    if (entry.pending) return
    this._tell(entry, { pending, actionError: undefined })
    try {
      const status = await send()
      this._tell(entry, { status, pending: undefined, changedAt: entry.reads })
    } catch (err) {
      this._tell(entry, { pending: undefined, actionError: extractErrorMessage(err, failed) })
    }
  }

  /** Watch a thread: shown at once, once however often it is pressed, rolled back with why. */
  watch = (groupId: string, watch: ReviewThreadWatch): Promise<void> =>
    this._change(
      groupId,
      { kind: 'watch', connectionId: watch.connectionId, permalink: watch.permalink },
      () => watchColleagueReviewThread(groupId, watch),
      SLACK_SETTINGS_TEXT.watchFailed,
    )

  /** Stop watching the thread: gone at once, back with why when the backend refuses. */
  clear = (groupId: string): Promise<void> =>
    this._change(
      groupId,
      { kind: 'clear' },
      () => clearColleagueReviewThread(groupId),
      SLACK_SETTINGS_TEXT.clearFailed,
    )

  /**
   * Change the group's review settings: shown at once over whatever is read,
   * sent only when it changes something — pressing it again sends nothing —
   * and rolled back with why when the backend refuses.
   */
  setSettings = async (groupId: string, change: ReviewSettingsChange): Promise<void> => {
    const entry = this._entry(groupId)
    const shown = reviewSettingsShown(entry.status?.settings, entry.settingChanges)
    if (!reviewSettingsChangeNeeded(shown, change)) return
    this._tell(entry, { settingChanges: [...entry.settingChanges, change], actionError: undefined })
    const without = () => entry.settingChanges.filter((held) => held !== change)
    try {
      const status = await setColleagueReviewSettings(groupId, change)
      this._tell(entry, { status, settingChanges: without(), changedAt: entry.reads })
    } catch (err) {
      this._tell(entry, {
        settingChanges: without(),
        actionError: extractErrorMessage(err, SLACK_SETTINGS_TEXT.settingsFailed),
      })
    }
  }

  /**
   * An update the person dismissed or started from leaves the waiting count at
   * once, while `done` says whether the backend settled it; counted again when not.
   */
  settleOffer = async (groupId: string, offerId: string, done: Promise<boolean>): Promise<void> => {
    const entry = this._entry(groupId)
    if (entry.settled.has(offerId)) return
    entry.settled.set(offerId, {})
    this._tell(entry, {})
    if (await done.catch(() => false)) entry.settled.set(offerId, { after: entry.reads })
    else entry.settled.delete(offerId)
    this._tell(entry, {})
  }
}
