import type { ColleagueReview } from 'thefactory-tools/types'
import { dropReviewFinding, markReviewWaitingGiven } from 'thefactory-tools/utils'
import {
  dropColleagueReviewFinding,
  markColleagueReviewWaitingGiven,
  readColleagueReview,
} from '../api/colleagueReviewApi'
import { postColleagueReviewReply } from '../api/colleagueReviewSourceApi'
import { extractErrorMessage } from '../api/errorMessage'
import type { WsClient } from '../api/WsClient'
import { COLLEAGUE_REVIEW_CARD_TEXT } from '../utils/colleagueReviewCardConstants'
import { REVIEW_POST_TEXT } from '../utils/colleagueReviewSourceConstants'
import type { ReviewPendingActions } from '../utils/colleagueReviewCardTypes'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import { LiveResourceStore } from '../utils/liveResourceStore'
import type { LiveResourceSnapshot } from '../utils/liveResourceStoreTypes'

/** How long a review stays live after its last card scrolls away. */
const REVIEW_LINGER_MS = 30_000

type PendingAction =
  | { kind: 'drop' | 'given'; id: string; note?: string }
  | { kind: 'post'; round: number; again: boolean; text?: string }

/** A review as its cards draw it: the person's own changes on their way already in it. */
export type ColleagueReviewSnapshot = {
  review: ColleagueReview | null | undefined
  settled: boolean
  readError: Error | null
  pending: ReviewPendingActions
  actionError: string | undefined
}

type Overlay = {
  pending: PendingAction[]
  actionError: string | undefined
  /** The review as the person's last change answered it, until a read is as new. */
  confirmed?: ColleagueReview
}

const NO_OVERLAY: Overlay = { pending: [], actionError: undefined }

/** One key per review: a group and a ticket. */
export const colleagueReviewKey = (groupId: string, ticketKey: string): string =>
  JSON.stringify([groupId, ticketKey])

const keyParts = (key: string): [string, string] => JSON.parse(key) as [string, string]

/** The newer of what was read and what a change answered: a read begun before the change is older. */
function newest(
  read: ColleagueReview | null | undefined,
  confirmed: ColleagueReview | undefined,
): ColleagueReview | null | undefined {
  if (!confirmed || (read && read.updatedAt >= confirmed.updatedAt)) return read
  return confirmed
}

function applyPending(
  review: ColleagueReview | null | undefined,
  pending: readonly PendingAction[],
): ColleagueReview | null | undefined {
  if (!review || pending.length === 0) return review
  const now = review.updatedAt
  return pending.reduce((current, action) => {
    if (action.kind === 'post') return current
    const changed =
      action.kind === 'drop'
        ? dropReviewFinding(current, action.id, action.note, now)
        : markReviewWaitingGiven(current, action.id, action.note, now)
    return changed.ok ? changed.review : current
  }, review)
}

const FAILED: Record<PendingAction['kind'], string> = {
  drop: COLLEAGUE_REVIEW_CARD_TEXT.dropFailed,
  given: COLLEAGUE_REVIEW_CARD_TEXT.givenFailed,
  post: REVIEW_POST_TEXT.failed,
}

/** The same change pressed again: a drop or given of one item, or a post of one round. */
function sameAction(a: PendingAction, b: PendingAction): boolean {
  if (a.kind === 'post' || b.kind === 'post') {
    return a.kind === 'post' && b.kind === 'post' && a.round === b.round
  }
  return a.kind === b.kind && a.id === b.id
}

function send(groupId: string, ticketKey: string, action: PendingAction): Promise<ColleagueReview> {
  switch (action.kind) {
    case 'drop':
      return dropColleagueReviewFinding(groupId, ticketKey, action.id, action.note)
    case 'given':
      return markColleagueReviewWaitingGiven(groupId, ticketKey, action.id, action.note)
    case 'post':
      return postColleagueReviewReply(groupId, ticketKey, action.round, {
        again: action.again,
        ...(action.text !== undefined ? { text: action.text } : {}),
      })
  }
}

/**
 * Every review a chat's cards show, kept live: one read per review however many
 * rows draw it, read again on `colleagueReviews:updated` for that review and
 * when the socket comes back. The person's drops and givens show at once over
 * whatever the latest read says, until their answer comes back or fails.
 */
export class ColleagueReviewStore {
  private readonly _live: LiveResourceStore<ColleagueReview | null>
  private readonly _overlays = new Map<string, Overlay>()
  private readonly _listeners = new Map<string, Set<() => void>>()
  private readonly _snapshots = new Map<
    string,
    {
      live: LiveResourceSnapshot<ColleagueReview | null>
      overlay: Overlay
      snapshot: ColleagueReviewSnapshot
    }
  >()

  constructor(ws: Pick<WsClient, 'on' | 'onReconnect'>) {
    this._live = new LiveResourceStore<ColleagueReview | null>({
      load: (key) => readColleagueReview(...keyParts(key)),
      connect: (key, live) => {
        const [groupId, ticketKey] = keyParts(key)
        const offUpdate = ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
          const update = data as { groupId?: string; ticketKey?: string } | undefined
          if (update?.groupId === groupId && update.ticketKey === ticketKey) void live.refresh()
        })
        const offReconnect = ws.onReconnect(() => void live.refresh())
        return () => {
          offUpdate()
          offReconnect()
        }
      },
      lingerMs: REVIEW_LINGER_MS,
    })
  }

  retain = (key: string): (() => void) => this._live.retain(key)

  listen = (key: string, listener: () => void): (() => void) => {
    const listeners = this._listeners.get(key) ?? new Set()
    listeners.add(listener)
    this._listeners.set(key, listeners)
    const offLive = this._live.listen(key, listener)
    return () => {
      offLive()
      listeners.delete(listener)
      if (listeners.size === 0) this._listeners.delete(key)
    }
  }

  /** The review as cards draw it — the same object until something changes. */
  snapshot = (key: string): ColleagueReviewSnapshot => {
    const live = this._live.snapshot(key)
    const overlay = this._overlays.get(key) ?? NO_OVERLAY
    const held = this._snapshots.get(key)
    if (held && held.live === live && held.overlay === overlay) return held.snapshot
    const snapshot: ColleagueReviewSnapshot = {
      review: applyPending(newest(live.data, overlay.confirmed), overlay.pending),
      settled: live.settled,
      readError: live.error,
      pending: {
        drops: new Set(overlay.pending.flatMap((a) => (a.kind === 'drop' ? [a.id] : []))),
        givens: new Set(overlay.pending.flatMap((a) => (a.kind === 'given' ? [a.id] : []))),
        posts: new Set(overlay.pending.flatMap((a) => (a.kind === 'post' ? [a.round] : []))),
      },
      actionError: overlay.actionError,
    }
    this._snapshots.set(key, { live, overlay, snapshot })
    return snapshot
  }

  refresh = (key: string): Promise<void> => this._live.refresh(key)

  /** The person drops a finding. Shown dropped at once; pressing it again while it goes changes nothing. */
  drop = (key: string, findingId: string, note?: string): Promise<void> =>
    this._act(key, { kind: 'drop', id: findingId, ...(note ? { note } : {}) })

  /** The person marks a waited-on item given. Shown given at once; pressing it again changes nothing. */
  markGiven = (key: string, waitingOnId: string, note?: string): Promise<void> =>
    this._act(key, { kind: 'given', id: waitingOnId, ...(note ? { note } : {}) })

  /**
   * Post a round's reply in the group's watched thread as the person. Shown
   * posting at once; pressing it again while it goes changes nothing. `again`
   * posts a reply that was posted already; `text` is the person's edit, posted
   * in place of the drafted reply.
   */
  postReply = (key: string, round: number, again: boolean, text?: string): Promise<void> =>
    this._act(key, { kind: 'post', round, again, ...(text !== undefined ? { text } : {}) })

  private _setOverlay(key: string, overlay: Overlay): void {
    if (
      overlay.pending.length === 0 &&
      overlay.actionError === undefined &&
      overlay.confirmed === undefined
    ) {
      this._overlays.delete(key)
    } else {
      this._overlays.set(key, overlay)
    }
    for (const listener of [...(this._listeners.get(key) ?? [])]) listener()
  }

  private async _act(key: string, action: PendingAction): Promise<void> {
    const overlay = this._overlays.get(key) ?? NO_OVERLAY
    if (overlay.pending.some((a) => sameAction(a, action))) return
    const { actionError: _cleared, ...kept } = overlay
    this._setOverlay(key, {
      ...kept,
      pending: [...overlay.pending, action],
      actionError: undefined,
    })
    const [groupId, ticketKey] = keyParts(key)
    const settle = (change: { confirmed: ColleagueReview } | { actionError: string }) => {
      const now = this._overlays.get(key) ?? NO_OVERLAY
      const confirmed = 'confirmed' in change ? change.confirmed : now.confirmed
      this._setOverlay(key, {
        pending: now.pending.filter((a) => a !== action),
        actionError: 'actionError' in change ? change.actionError : now.actionError,
        ...(confirmed ? { confirmed } : {}),
      })
    }
    try {
      settle({ confirmed: await send(groupId, ticketKey, action) })
    } catch (err) {
      settle({ actionError: extractErrorMessage(err, FAILED[action.kind]) })
    }
  }
}
