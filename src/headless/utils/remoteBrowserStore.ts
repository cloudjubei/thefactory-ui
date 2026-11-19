import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatAppNote } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import {
  canGoBack,
  canGoForward,
  driverOf,
  normalizeAddress,
  pickRing,
  shownSession,
  toChatAppNote,
} from './remoteBrowser'
import {
  REMOTE_BROWSER_EMPTY_STATE,
  REMOTE_BROWSER_EVENT,
  REMOTE_BROWSER_MESSAGE,
  REMOTE_BROWSER_TEXT,
} from './remoteBrowserConstants'
import type {
  RemoteBrowserBox,
  RemoteBrowserFrame,
  RemoteBrowserInput,
  RemoteBrowserMode,
  RemoteBrowserNote,
  RemoteBrowserNoteResult,
  RemoteBrowserPoint,
  RemoteBrowserSession,
  RemoteBrowserSize,
  RemoteBrowserState,
  RemoteBrowserStoreOptions,
} from './remoteBrowserTypes'

type SessionEvent = { projectId: string; sessionId: string }

const newest = (sessions: RemoteBrowserSession[]) =>
  sessions.reduce<RemoteBrowserSession | undefined>(
    (best, session) => (!best || session.createdAt > best.createdAt ? session : best),
    undefined,
  )

/**
 * The browsers beside one chat, as the person sees and drives them: which one is shown, its live
 * frames over the socket (watched only while shown), the page's address and history, and the
 * picks and marks on their way to the chat. Every change shows at once and goes back when the
 * backend refuses it; a request already on its way is never sent twice.
 */
export class RemoteBrowserStore {
  private state: RemoteBrowserState = REMOTE_BROWSER_EMPTY_STATE
  private readonly listeners = new Set<() => void>()
  private readonly offs: (() => void)[] = []
  private started = false
  private visible = true
  private connected = true
  private watching: string | null = null
  private opening: string | null = null
  private closing: string | null = null
  private readonly sizes = new Map<string, string>()
  private nextNote = 0

  private readonly options: RemoteBrowserStoreOptions

  constructor(options: RemoteBrowserStoreOptions) {
    this.options = options
  }

  getState = (): RemoteBrowserState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): void {
    const { socket } = this.options
    this.started = true
    this.offs.push(
      socket.on<SessionEvent & { frame: RemoteBrowserFrame }>(REMOTE_BROWSER_EVENT.frame, (data) =>
        this.onFrame(data),
      ),
      socket.on<SessionEvent>(REMOTE_BROWSER_EVENT.ended, (data) => this.onEnded(data)),
      socket.on<SessionEvent & { error: string }>(REMOTE_BROWSER_EVENT.refused, (data) =>
        this.onRefused(data),
      ),
      socket.on<{ projectId: string; chatKey: string }>(REMOTE_BROWSER_EVENT.changed, (data) => {
        if (
          data.projectId === this.options.projectId &&
          data.chatKey === getChatContextKey(this.options.context)
        )
          void this.refresh()
      }),
      socket.onReconnect(() => {
        this.watching = null
        void this.refresh()
      }),
    )
    void this.refresh()
  }

  stop(): void {
    this.started = false
    this.sync()
    this.offs.splice(0).forEach((off) => off())
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.sync()
  }

  setConnected(connected: boolean): void {
    this.connected = connected
    if (!connected) {
      this.watching = null
      if (this.state.shownId && (this.state.status === 'live' || this.state.status === 'opening'))
        this.set({ status: 'reconnecting' })
      return
    }
    this.sync()
  }

  async refresh(): Promise<void> {
    const { api, projectId, context } = this.options
    let sessions: RemoteBrowserSession[]
    try {
      sessions = await api.list(projectId, context)
    } catch (err) {
      this.set({ error: extractErrorMessage(err, REMOTE_BROWSER_TEXT.openFailed) })
      return
    }
    const known = new Set(this.state.sessions.map((session) => session.sessionId))
    const shared = newest(
      sessions.filter(
        (session) => session.holder?.kind === 'agent' && !known.has(session.sessionId),
      ),
    )
    const kept = sessions.find((session) => session.sessionId === this.state.shownId)
    const shown = shared ?? kept ?? newest(sessions)
    this.set({ sessions })
    if (shown && shown.sessionId !== this.state.shownId) this.showSession(shown)
    this.sync()
  }

  show(sessionId: string): void {
    const session = this.state.sessions.find((s) => s.sessionId === sessionId)
    if (!session) return
    this.showSession(session)
    this.sync()
  }

  async open(typed: string, viewport?: RemoteBrowserSize): Promise<void> {
    await this.go(typed, 'push', viewport)
  }

  async reload(): Promise<void> {
    if (this.state.address) await this.go(this.state.address, 'stay')
  }

  canGoBack = (): boolean => canGoBack(this.state)

  canGoForward = (): boolean => canGoForward(this.state)

  async back(): Promise<void> {
    if (this.canGoBack()) await this.go(this.state.history[this.state.historyAt - 1], -1)
  }

  async forward(): Promise<void> {
    if (this.canGoForward()) await this.go(this.state.history[this.state.historyAt + 1], 1)
  }

  async close(): Promise<void> {
    const session = shownSession(this.state)
    if (!session || session.holder?.kind === 'agent' || this.closing === session.sessionId) return
    const before = this.state
    this.closing = session.sessionId
    const sessions = before.sessions.filter((s) => s.sessionId !== session.sessionId)
    const next = newest(sessions)
    this.set({ sessions, draft: null })
    if (next) this.showSession(next)
    else this.set({ shownId: null, status: 'idle', frame: null, address: '', title: '' })
    this.sync()
    try {
      await this.options.api.close(this.options.projectId, this.options.context, session.sessionId)
    } catch {
      this.set({
        sessions: before.sessions,
        shownId: before.shownId,
        status: before.status,
        frame: before.frame,
        address: before.address,
        title: before.title,
        error: REMOTE_BROWSER_TEXT.closeFailed,
      })
      this.sync()
    } finally {
      this.closing = null
    }
  }

  setMode(mode: RemoteBrowserMode): void {
    this.set({ mode, draft: null })
  }

  takeOver(): void {
    this.set({ takenOver: true })
  }

  handBack(): void {
    this.set({ takenOver: false })
  }

  async send(input: RemoteBrowserInput): Promise<void> {
    const sessionId = this.state.shownId
    if (!sessionId || this.state.status !== 'live' || driverOf(this.state) === 'agent') return
    const { api, projectId, context } = this.options
    try {
      const result = await api.input(projectId, context, sessionId, input)
      if (!result.ok) {
        this.set({ error: result.error ?? REMOTE_BROWSER_TEXT.inputFailed })
        return
      }
      this.reached(sessionId, result.url, result.title)
    } catch (err) {
      this.set({ error: extractErrorMessage(err, REMOTE_BROWSER_TEXT.inputFailed) })
    }
  }

  async resize(size: RemoteBrowserSize): Promise<void> {
    const sessionId = this.state.shownId
    const viewport = { width: Math.round(size.width), height: Math.round(size.height) }
    if (!sessionId || driverOf(this.state) === 'agent' || viewport.width < 1 || viewport.height < 1)
      return
    const key = `${viewport.width}x${viewport.height}`
    if (this.sizes.get(sessionId) === key) return
    this.sizes.set(sessionId, key)
    try {
      await this.options.api.resize(
        this.options.projectId,
        this.options.context,
        sessionId,
        viewport,
      )
    } catch {
      this.sizes.delete(sessionId)
    }
  }

  async pick(point: RemoteBrowserPoint): Promise<void> {
    await this.note('pick', pickRing(point), (api, sessionId) =>
      api.pick(this.options.projectId, this.options.context, sessionId, point),
    )
  }

  async mark(box: RemoteBrowserBox): Promise<void> {
    await this.note('mark', box, (api, sessionId) =>
      api.mark(this.options.projectId, this.options.context, sessionId, box),
    )
  }

  addDraft(comment: string): void {
    const draft = this.state.draft
    if (!draft) return
    const note = { ...draft, comment }
    this.set({ draft: null, mode: 'browse' })
    if (!this.handOver(note)) this.set({ notes: [...this.state.notes, note] })
  }

  cancelDraft(): void {
    this.set({ draft: null, mode: 'browse' })
  }

  editNote(id: string, comment: string): void {
    this.set({ notes: this.state.notes.map((n) => (n.id === id ? { ...n, comment } : n)) })
  }

  removeNote(id: string): void {
    this.set({ notes: this.state.notes.filter((n) => n.id !== id) })
  }

  clearNotes(): void {
    this.set({ notes: [] })
  }

  /** The staged notes the browser has answered for, as the chat sends them. */
  appNotes(): ChatAppNote[] {
    return this.state.notes.flatMap((note) => {
      const appNote = toChatAppNote(note, this.options.projectId)
      return appNote ? [appNote] : []
    })
  }

  async retry(): Promise<void> {
    if (this.state.status === 'ended') {
      if (this.state.address) await this.go(this.state.address, 'stay')
      return
    }
    this.watching = null
    await this.refresh()
  }

  dismissError(): void {
    this.set({ error: null })
  }

  private set(patch: Partial<RemoteBrowserState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  private showSession(session: RemoteBrowserSession): void {
    this.set({
      shownId: session.sessionId,
      address: session.url,
      title: session.title,
      status: 'opening',
      frame: null,
      takenOver: false,
      draft: null,
    })
  }

  private sync(): void {
    const { socket, projectId } = this.options
    const wanted =
      this.started && this.visible && this.connected && this.state.shownId
        ? this.state.shownId
        : null
    if (wanted === this.watching) return
    if (this.watching)
      socket.send({ type: REMOTE_BROWSER_MESSAGE.unwatch, projectId, sessionId: this.watching })
    this.watching =
      wanted && socket.send({ type: REMOTE_BROWSER_MESSAGE.watch, projectId, sessionId: wanted })
        ? wanted
        : null
  }

  private async go(
    typed: string,
    step: 'push' | 'stay' | -1 | 1,
    viewport?: RemoteBrowserSize,
  ): Promise<void> {
    const url = normalizeAddress(typed)
    if (!url) {
      this.set({ error: REMOTE_BROWSER_TEXT.badAddress })
      return
    }
    if (this.opening === url) return
    const before = this.state
    this.opening = url
    this.set({ address: url, status: 'opening', error: null, draft: null })
    try {
      const session = await this.options.api.open(this.options.projectId, this.options.context, {
        url,
        ...(viewport ? { viewport } : {}),
      })
      if (this.opening !== url) return
      const sessions = [
        ...this.state.sessions.filter((s) => s.sessionId !== session.sessionId),
        session,
      ]
      const moved =
        step === 'push'
          ? this.pushed(session.url)
          : step === 'stay'
            ? {}
            : { historyAt: this.state.historyAt + step }
      this.set({
        sessions,
        shownId: session.sessionId,
        address: session.url,
        title: session.title,
        takenOver: false,
        ...moved,
      })
      this.sync()
    } catch (err) {
      if (this.opening !== url) return
      this.set({
        address: before.address,
        title: before.title,
        status: before.status,
        error: extractErrorMessage(err, REMOTE_BROWSER_TEXT.openFailed),
      })
    } finally {
      if (this.opening === url) this.opening = null
    }
  }

  private pushed(url: string): Pick<RemoteBrowserState, 'history' | 'historyAt'> {
    const { history, historyAt } = this.state
    if (history[historyAt] === url) return { history, historyAt }
    const next = [...history.slice(0, historyAt + 1), url]
    return { history: next, historyAt: next.length - 1 }
  }

  private reached(sessionId: string, url: string, title: string): void {
    if (sessionId !== this.state.shownId || url === this.state.address) return
    this.set({ address: url, title, ...this.pushed(url) })
  }

  private async note(
    kind: RemoteBrowserNote['kind'],
    box: RemoteBrowserBox,
    take: (
      api: RemoteBrowserStoreOptions['api'],
      sessionId: string,
    ) => Promise<RemoteBrowserNoteResult>,
  ): Promise<void> {
    const sessionId = this.state.shownId
    if (!sessionId || this.state.status !== 'live') return
    const metadata = this.state.frame?.metadata
    const id = `remote-browser-note-${++this.nextNote}`
    this.set({
      draft: {
        id,
        kind,
        box,
        scroll: { x: metadata?.scrollOffsetX ?? 0, y: metadata?.scrollOffsetY ?? 0 },
        url: this.state.address,
        comment: '',
      },
    })
    try {
      const result = await take(this.options.api, sessionId)
      if (!result.ok || !result.target) {
        this.dropNote(id, result.error ?? REMOTE_BROWSER_TEXT.noteFailed)
        return
      }
      const target = result.target
      const found =
        target.kind === 'element' && target.rect
          ? {
              x: target.rect.x,
              y: target.rect.y,
              width: target.rect.width,
              height: target.rect.height,
            }
          : undefined
      this.fillNote(id, {
        target,
        url: result.url,
        ...(found ? { box: found } : {}),
        ...(result.screenshotFile ? { screenshotFile: result.screenshotFile } : {}),
      })
    } catch (err) {
      this.dropNote(id, extractErrorMessage(err, REMOTE_BROWSER_TEXT.noteFailed))
    }
  }

  private fillNote(id: string, patch: Partial<RemoteBrowserNote>): void {
    if (this.state.draft?.id === id) {
      this.set({ draft: { ...this.state.draft, ...patch } })
      return
    }
    const staged = this.state.notes.find((n) => n.id === id)
    if (!staged) return
    const note = { ...staged, ...patch }
    if (this.handOver(note)) this.set({ notes: this.state.notes.filter((n) => n.id !== id) })
    else this.set({ notes: this.state.notes.map((n) => (n.id === id ? note : n)) })
  }

  private dropNote(id: string, error: string): void {
    if (this.state.draft?.id === id) this.set({ draft: null, error })
    else if (this.state.notes.some((n) => n.id === id))
      this.set({ notes: this.state.notes.filter((n) => n.id !== id), error })
  }

  private handOver(note: RemoteBrowserNote): boolean {
    const take = this.options.onAddNotes
    const appNote = toChatAppNote(note, this.options.projectId)
    if (!take || !appNote) return false
    take([appNote])
    return true
  }

  private onFrame(data: SessionEvent & { frame: RemoteBrowserFrame }): void {
    if (data.projectId !== this.options.projectId || data.sessionId !== this.state.shownId) return
    this.set({ frame: data.frame, status: 'live' })
  }

  private onEnded(data: SessionEvent): void {
    if (data.projectId !== this.options.projectId) return
    const sessions = this.state.sessions.filter((s) => s.sessionId !== data.sessionId)
    if (data.sessionId !== this.state.shownId) {
      this.set({ sessions })
      return
    }
    this.watching = null
    this.set({ sessions, status: 'ended', draft: null })
  }

  private onRefused(data: SessionEvent & { error: string }): void {
    if (data.projectId !== this.options.projectId || data.sessionId !== this.state.shownId) return
    this.watching = null
    this.set({ status: 'ended', error: data.error, draft: null })
  }
}
