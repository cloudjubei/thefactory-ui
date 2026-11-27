import type { RecordingSiteState, SignInSessionState } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import { listRecordingSites, startRecordingSiteSignIn } from '../api/recordingSitesApi'
import type { WsClient } from '../api/WsClient'
import {
  recordingSignInAskable,
  recordingSiteChangeOf,
  recordingSitesWith,
} from '../utils/recordingSites'
import {
  RECORDING_SIGN_IN_KIND,
  RECORDING_SITES_EVENT,
  RECORDING_SITES_TEXT,
} from '../utils/recordingSitesConstants'
import type { RecordingSitesSnapshot } from '../utils/recordingSitesTypes'
import { signInEndedNotice } from '../utils/signInSession'
import type { SignInSessionsStore } from './signInSessionsStore'

const without = (failed: Readonly<Record<string, string>>, siteId: string) =>
  Object.fromEntries(Object.entries(failed).filter(([id]) => id !== siteId))

/**
 * The person's sign-ins to the sites recordings are fetched from, shared by
 * every view that shows them: read once however many hold them, again when
 * the socket comes back, and kept to the backend's word of each site as it
 * tells it. A sign-in shows at once, is asked for once however often it is
 * pressed while the press is on its way, and rolls back with why. The session
 * the backend opens for it is handed to the app's sign-in sessions to show; a
 * press on a site whose sign-in is open shows that one again.
 */
export class RecordingSitesStore {
  private readonly _ws: Pick<WsClient, 'on' | 'onReconnect'>
  private readonly _signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'> | undefined
  private _sites: readonly RecordingSiteState[] | undefined = undefined
  private _readError: string | undefined = undefined
  private _starting: readonly string[] = []
  private _failed: Readonly<Record<string, string>> = {}
  /** Reads begun so far; an answer to one begun before the last change was told is dropped. */
  private _reads = 0
  /** The read count when the backend last told of a site. */
  private _changedAt = 0
  /** How often the backend told of each site by event. */
  private readonly _told = new Map<string, number>()
  private _holders = 0
  private _disconnect: (() => void) | undefined = undefined
  private readonly _listeners = new Set<() => void>()
  private _shown: RecordingSitesSnapshot | undefined = undefined

  constructor(
    ws: Pick<WsClient, 'on' | 'onReconnect'>,
    signIn?: Pick<SignInSessionsStore, 'show' | 'onEnded'>,
  ) {
    this._ws = ws
    this._signIn = signIn
  }

  private _tell(): void {
    this._shown = undefined
    for (const listener of [...this._listeners]) listener()
  }

  /** Hold the sites live; returns the release. */
  retain = (): (() => void) => {
    this._holders += 1
    if (this._holders === 1) {
      const offChange = this._ws.on(RECORDING_SITES_EVENT, (data: unknown) => this._changed(data))
      const offReconnect = this._ws.onReconnect(() => void this.refresh())
      const offEnded = this._signIn?.onEnded((session) => this._signInEnded(session))
      this._disconnect = () => {
        offChange()
        offReconnect()
        offEnded?.()
      }
      void this.refresh()
    }
    let released = false
    return () => {
      if (released) return
      released = true
      this._holders -= 1
      if (this._holders === 0) {
        this._disconnect?.()
        this._disconnect = undefined
      }
    }
  }

  listen = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /** The sites as views draw them — the same object until something changes. */
  snapshot = (): RecordingSitesSnapshot => {
    this._shown ??= {
      sites: this._sites,
      readError: this._readError,
      starting: this._starting,
      failed: this._failed,
    }
    return this._shown
  }

  private _changed(data: unknown): void {
    const site = recordingSiteChangeOf(data)
    if (!site) {
      void this.refresh()
      return
    }
    this._told.set(site.id, (this._told.get(site.id) ?? 0) + 1)
    this._sites = recordingSitesWith(this._sites, site)
    this._failed = without(this._failed, site.id)
    this._changedAt = this._reads
    this._tell()
  }

  /** Read the sites again; an answer begun before the last change was told is dropped. */
  refresh = async (): Promise<void> => {
    const read = ++this._reads
    try {
      const sites = await listRecordingSites()
      if (read <= this._changedAt) return
      this._sites = sites
      this._readError = undefined
    } catch (err) {
      if (read <= this._changedAt) return
      this._readError = extractErrorMessage(err, RECORDING_SITES_TEXT.readFailed)
    }
    this._tell()
  }

  private _signInEnded(session: SignInSessionState): void {
    if (session.kind !== RECORDING_SIGN_IN_KIND) return
    const why = signInEndedNotice(session)
    if (!why) return
    this._failed = { ...this._failed, [session.subject]: why }
    this._tell()
  }

  /**
   * Open a site's sign-in, or show the one already open: shown at once, sent
   * only while no press on the site is on its way, and rolled back with why.
   * What the backend told of the site meanwhile stays over the answer.
   */
  signIn = async (siteId: string): Promise<void> => {
    if (!recordingSignInAskable(this._sites, this._starting, siteId)) return
    this._starting = [...this._starting, siteId]
    this._failed = without(this._failed, siteId)
    this._tell()
    const told = this._told.get(siteId)
    try {
      const { site, session } = await startRecordingSiteSignIn(siteId)
      this._signIn?.show(session)
      if (this._told.get(siteId) === told) {
        this._sites = recordingSitesWith(this._sites, site)
        this._changedAt = this._reads
      }
    } catch (err) {
      this._failed = {
        ...this._failed,
        [siteId]: extractErrorMessage(err, RECORDING_SITES_TEXT.signInFailed),
      }
    }
    this._starting = this._starting.filter((id) => id !== siteId)
    this._tell()
  }
}
