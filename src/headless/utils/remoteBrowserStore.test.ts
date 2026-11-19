import { getChatContextKey } from 'thefactory-tools/utils'
import { describe, expect, it, vi } from 'vitest'
import type { ChatContext } from '../api/generated'
import { REMOTE_BROWSER_EVENT, REMOTE_BROWSER_TEXT } from './remoteBrowserConstants'
import { RemoteBrowserStore } from './remoteBrowserStore'
import type {
  RemoteBrowserApi,
  RemoteBrowserFrame,
  RemoteBrowserNoteResult,
  RemoteBrowserSession,
  RemoteBrowserSocket,
} from './remoteBrowserTypes'

const CONTEXT = { type: 'PROJECT', projectId: 'p1' } as ChatContext
const OTHER_CONTEXT = { type: 'PROJECT', projectId: 'p2' } as ChatContext

const PERSON: RemoteBrowserSession = {
  sessionId: 'mine',
  url: 'https://acme.dev/pricing',
  title: 'Pricing',
  holder: { kind: 'person' },
  createdAt: 1,
}
const AGENT: RemoteBrowserSession = {
  sessionId: 'agent',
  url: 'https://acme.dev/pricing?plan=team',
  title: 'Pricing',
  holder: { kind: 'agent', runId: 'r1' },
  createdAt: 2,
}
const FRAME: RemoteBrowserFrame = {
  data: 'iVBOR',
  metadata: {
    deviceWidth: 800,
    deviceHeight: 600,
    pageScaleFactor: 1,
    offsetTop: 0,
    scrollOffsetX: 0,
    scrollOffsetY: 40,
  },
}
const ok = (patch: Partial<RemoteBrowserNoteResult> = {}): RemoteBrowserNoteResult => ({
  sessionId: 'mine',
  ok: true,
  url: 'https://acme.dev/pricing',
  title: 'Pricing',
  ...patch,
})
const ELEMENT = {
  kind: 'element' as const,
  selector: 'div.plan > a.plan-cta',
  outerHtml: '<a class="plan-cta">Start trial</a>',
  rect: { x: 300, y: 500, width: 84, height: 31, space: 'app-viewport' as const },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function axiosError(status: number, error: string) {
  return { isAxiosError: true, response: { status, data: { error } } }
}

function fakeSocket() {
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  const reconnects = new Set<() => void>()
  const sent: object[] = []
  let open = true
  const socket: RemoteBrowserSocket = {
    on: <T>(event: string, handler: (data: T) => void) => {
      const set = handlers.get(event) ?? new Set()
      set.add(handler as (data: unknown) => void)
      handlers.set(event, set)
      return () => set.delete(handler as (data: unknown) => void)
    },
    onReconnect: (handler) => {
      reconnects.add(handler)
      return () => reconnects.delete(handler)
    },
    send: (message) => {
      if (!open) return false
      sent.push(message)
      return true
    },
  }
  return {
    socket,
    sent,
    emit: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
    setOpen: (value: boolean) => {
      open = value
    },
    listeners: () => [...handlers.values()].reduce((n, set) => n + set.size, 0) + reconnects.size,
  }
}

function fakeApi(sessions: RemoteBrowserSession[] = []): RemoteBrowserApi & {
  [K in keyof RemoteBrowserApi]: ReturnType<typeof vi.fn>
} {
  return {
    list: vi.fn(async () => sessions),
    open: vi.fn(async (_p, _c, body: { url: string }) => ({ ...PERSON, url: body.url })),
    close: vi.fn(async () => undefined),
    input: vi.fn(async () => ok()),
    resize: vi.fn(async () => ok()),
    pick: vi.fn(async () => ok({ target: ELEMENT, screenshotFile: 'pick.png' })),
    mark: vi.fn(async (_p, _c, _s, box) =>
      ok({ target: { kind: 'area', rect: { ...box, space: 'app-viewport' } } }),
    ),
  }
}

async function started(sessions: RemoteBrowserSession[] = [PERSON], onAddNotes?: () => void) {
  const api = fakeApi(sessions)
  const ws = fakeSocket()
  const store = new RemoteBrowserStore({
    projectId: 'p1',
    context: CONTEXT,
    api,
    socket: ws.socket,
    onAddNotes,
  })
  store.start()
  await vi.waitFor(() => expect(api.list).toHaveBeenCalled())
  await flush()
  return { api, ws, store }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function live(sessions: RemoteBrowserSession[] = [PERSON], onAddNotes?: () => void) {
  const ctx = await started(sessions, onAddNotes)
  ctx.ws.emit(REMOTE_BROWSER_EVENT.frame, {
    projectId: 'p1',
    sessionId: ctx.store.getState().shownId,
    frame: FRAME,
  })
  return ctx
}

describe('RemoteBrowserStore: showing the chat’s browsers', () => {
  it('shows the newest browser and watches it on the socket', async () => {
    const { store, ws, api } = await started([PERSON, AGENT])
    expect(api.list).toHaveBeenCalledWith('p1', CONTEXT)
    expect(store.getState()).toMatchObject({
      shownId: 'agent',
      address: AGENT.url,
      status: 'opening',
    })
    expect(ws.sent).toEqual([{ type: 'remoteBrowser:watch', projectId: 'p1', sessionId: 'agent' }])
  })

  it('has nothing to show when the chat has no browser', async () => {
    const { store, ws } = await started([])
    expect(store.getState()).toMatchObject({ shownId: null, status: 'idle' })
    expect(ws.sent).toEqual([])
  })

  it('goes live on the shown browser’s first frame, ignoring other browsers’ frames', async () => {
    const { store, ws } = await started([PERSON])
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'other', frame: FRAME })
    expect(store.getState().frame).toBeNull()
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'mine', frame: FRAME })
    expect(store.getState()).toMatchObject({ status: 'live', frame: FRAME })
  })

  it('tells subscribers of every change until they leave', async () => {
    const { store, ws } = await started([PERSON])
    const seen = vi.fn()
    const off = store.subscribe(seen)
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'mine', frame: FRAME })
    expect(seen).toHaveBeenCalledTimes(1)
    off()
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'mine', frame: FRAME })
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('reads the list again when this chat’s browsers change, and shows a browser the agent shares', async () => {
    const { store, ws, api } = await live([PERSON])
    api.list.mockResolvedValueOnce([PERSON, AGENT])
    ws.emit(REMOTE_BROWSER_EVENT.changed, { projectId: 'p1', chatKey: getChatContextKey(CONTEXT) })
    await flush()
    expect(store.getState()).toMatchObject({ shownId: 'agent', status: 'opening', frame: null })
    expect(ws.sent.at(-2)).toEqual({
      type: 'remoteBrowser:unwatch',
      projectId: 'p1',
      sessionId: 'mine',
    })
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'agent',
    })
  })

  it('keeps the shown browser when the list changes around it', async () => {
    const { store, ws, api } = await live([PERSON, AGENT])
    store.show('mine')
    api.list.mockResolvedValueOnce([PERSON, AGENT])
    ws.emit(REMOTE_BROWSER_EVENT.changed, { projectId: 'p1', chatKey: getChatContextKey(CONTEXT) })
    await flush()
    expect(store.getState().shownId).toBe('mine')
  })

  it('ignores another chat’s or project’s change', async () => {
    const { ws, api } = await started([PERSON])
    ws.emit(REMOTE_BROWSER_EVENT.changed, {
      projectId: 'p1',
      chatKey: getChatContextKey(OTHER_CONTEXT),
    })
    ws.emit(REMOTE_BROWSER_EVENT.changed, { projectId: 'p2', chatKey: getChatContextKey(CONTEXT) })
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('says why the list did not come', async () => {
    const api = fakeApi()
    api.list.mockRejectedValueOnce(axiosError(404, 'No such project'))
    const ws = fakeSocket()
    const store = new RemoteBrowserStore({
      projectId: 'p1',
      context: CONTEXT,
      api,
      socket: ws.socket,
    })
    await store.refresh()
    expect(store.getState().error).toBe('No such project')
  })

  it('stops watching while hidden and watches again once shown', async () => {
    const { store, ws } = await live([PERSON])
    store.setVisible(false)
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:unwatch',
      projectId: 'p1',
      sessionId: 'mine',
    })
    store.setVisible(true)
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'mine',
    })
  })

  it('unwatches and lets go of the socket when stopped', async () => {
    const { store, ws } = await live([PERSON])
    store.stop()
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:unwatch',
      projectId: 'p1',
      sessionId: 'mine',
    })
    expect(ws.listeners()).toBe(0)
  })

  it('switches to another of the chat’s browsers', async () => {
    const { store, ws } = await live([PERSON, AGENT])
    store.show('mine')
    expect(store.getState()).toMatchObject({
      shownId: 'mine',
      address: PERSON.url,
      status: 'opening',
    })
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'mine',
    })
    store.show('gone')
    expect(store.getState().shownId).toBe('mine')
  })
})

describe('RemoteBrowserStore: losing the socket and the browser', () => {
  it('reconnects: the page waits, then comes back where it was on the next frame', async () => {
    const { store, ws } = await live([PERSON])
    ws.setOpen(false)
    store.setConnected(false)
    expect(store.getState().status).toBe('reconnecting')
    ws.setOpen(true)
    ws.reconnect()
    await flush()
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'mine',
    })
    store.setConnected(true)
    expect(store.getState().status).toBe('reconnecting')
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'mine', frame: FRAME })
    expect(store.getState().status).toBe('live')
  })

  it('watches once the socket opens when it was down at the start', async () => {
    const api = fakeApi([PERSON])
    const ws = fakeSocket()
    ws.setOpen(false)
    const store = new RemoteBrowserStore({
      projectId: 'p1',
      context: CONTEXT,
      api,
      socket: ws.socket,
    })
    store.start()
    await flush()
    expect(ws.sent).toEqual([])
    ws.setOpen(true)
    store.setConnected(true)
    expect(ws.sent).toEqual([{ type: 'remoteBrowser:watch', projectId: 'p1', sessionId: 'mine' }])
  })

  it('does not say reconnecting with no browser shown', async () => {
    const { store } = await started([])
    store.setConnected(false)
    expect(store.getState().status).toBe('idle')
  })

  it('Try now watches again and reads the list', async () => {
    const { store, ws, api } = await live([PERSON])
    store.setConnected(false)
    store.setConnected(true)
    const before = ws.sent.length
    await store.retry()
    expect(api.list).toHaveBeenCalledTimes(2)
    expect(ws.sent.length).toBeGreaterThan(before)
  })

  it('ends when the shown browser closes, keeping the notes', async () => {
    const { store, ws } = await live([PERSON])
    await store.mark({ x: 0, y: 0, width: 50, height: 50 })
    store.addDraft('Space')
    ws.emit(REMOTE_BROWSER_EVENT.ended, { projectId: 'p1', sessionId: 'mine' })
    expect(store.getState()).toMatchObject({ status: 'ended', sessions: [] })
    expect(store.getState().notes).toHaveLength(1)
  })

  it('drops another browser that closes without changing the shown one', async () => {
    const { store, ws } = await live([PERSON, AGENT])
    store.show('mine')
    ws.emit(REMOTE_BROWSER_EVENT.ended, { projectId: 'p1', sessionId: 'agent' })
    expect(store.getState()).toMatchObject({ shownId: 'mine', sessions: [PERSON] })
  })

  it('ends with the reason when the socket may not watch it', async () => {
    const { store, ws } = await live([PERSON])
    ws.emit(REMOTE_BROWSER_EVENT.refused, { projectId: 'p1', sessionId: 'mine', error: 'Gone' })
    expect(store.getState()).toMatchObject({ status: 'ended', error: 'Gone' })
    ws.emit(REMOTE_BROWSER_EVENT.refused, { projectId: 'p1', sessionId: 'x', error: 'Other' })
    expect(store.getState().error).toBe('Gone')
  })

  it('Open again opens the page the closed browser was on', async () => {
    const { store, ws, api } = await live([PERSON])
    ws.emit(REMOTE_BROWSER_EVENT.ended, { projectId: 'p1', sessionId: 'mine' })
    await store.retry()
    expect(api.open).toHaveBeenCalledWith('p1', CONTEXT, { url: PERSON.url })
    expect(store.getState()).toMatchObject({ shownId: 'mine', status: 'opening' })
  })
})

describe('RemoteBrowserStore: opening a page', () => {
  it('shows the page on its way at once, then the browser it opened in', async () => {
    const { store, api, ws } = await started([])
    const answer = deferred<RemoteBrowserSession>()
    api.open.mockReturnValueOnce(answer.promise)
    const opening = store.open('acme.dev/pricing', { width: 780, height: 600 })
    expect(store.getState()).toMatchObject({
      address: 'https://acme.dev/pricing',
      status: 'opening',
    })
    expect(api.open).toHaveBeenCalledWith('p1', CONTEXT, {
      url: 'https://acme.dev/pricing',
      viewport: { width: 780, height: 600 },
    })
    answer.resolve(PERSON)
    await opening
    expect(store.getState()).toMatchObject({
      shownId: 'mine',
      sessions: [PERSON],
      status: 'opening',
    })
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'mine',
    })
  })

  it('opens an address once however often it is asked while on its way', async () => {
    const { store, api } = await started([])
    const answer = deferred<RemoteBrowserSession>()
    api.open.mockReturnValueOnce(answer.promise)
    const first = store.open('acme.dev/pricing')
    void store.open('https://acme.dev/pricing')
    answer.resolve(PERSON)
    await first
    expect(api.open).toHaveBeenCalledTimes(1)
  })

  it('refuses what is no web address without asking the backend', async () => {
    const { store, api } = await started([])
    await store.open('javascript:alert(1)')
    expect(api.open).not.toHaveBeenCalled()
    expect(store.getState().error).toBe(REMOTE_BROWSER_TEXT.badAddress)
  })

  it('goes back to the page it showed when the page does not open', async () => {
    const { store, api } = await live([PERSON])
    api.open.mockRejectedValueOnce(axiosError(502, 'The page didn’t open: timeout'))
    await store.open('acme.dev/slow')
    expect(store.getState()).toMatchObject({
      address: PERSON.url,
      status: 'live',
      shownId: 'mine',
      error: 'The page didn’t open: timeout',
    })
  })

  it('drops the answer to an address the person moved on from', async () => {
    const { store, api } = await started([])
    const slow = deferred<RemoteBrowserSession>()
    api.open.mockReturnValueOnce(slow.promise)
    const first = store.open('acme.dev/a')
    await store.open('acme.dev/b')
    slow.resolve({ ...PERSON, url: 'https://acme.dev/a' })
    await first
    expect(store.getState().address).toBe('https://acme.dev/b')
    const failing = deferred<RemoteBrowserSession>()
    api.open.mockReturnValueOnce(failing.promise)
    const third = store.open('acme.dev/c')
    await store.open('acme.dev/d')
    failing.reject(new Error('late'))
    await third
    expect(store.getState()).toMatchObject({ address: 'https://acme.dev/d', error: null })
  })

  it('goes Back and Forward through the addresses opened, and reloads the one shown', async () => {
    const { store, api } = await live([PERSON])
    await store.open('acme.dev/a')
    await store.open('acme.dev/b')
    expect(store.canGoBack()).toBe(true)
    expect(store.canGoForward()).toBe(false)
    await store.back()
    expect(store.getState().address).toBe('https://acme.dev/a')
    expect(store.canGoForward()).toBe(true)
    await store.forward()
    expect(store.getState().address).toBe('https://acme.dev/b')
    await store.reload()
    expect(api.open).toHaveBeenLastCalledWith('p1', CONTEXT, { url: 'https://acme.dev/b' })
    expect(store.getState().history).toEqual(['https://acme.dev/a', 'https://acme.dev/b'])
  })

  it('has nowhere to go Back or Forward to at the ends', async () => {
    const { store, api } = await started([])
    await store.back()
    await store.forward()
    await store.reload()
    expect(api.open).not.toHaveBeenCalled()
  })

  it('takes a page the person reached by clicking into Back', async () => {
    const { store, api, ws } = await live([PERSON])
    await store.open('acme.dev/a')
    ws.emit(REMOTE_BROWSER_EVENT.frame, { projectId: 'p1', sessionId: 'mine', frame: FRAME })
    api.input.mockResolvedValueOnce(ok({ url: 'https://acme.dev/docs', title: 'Docs' }))
    await store.send({ kind: 'click', x: 1, y: 1 })
    expect(store.getState()).toMatchObject({
      address: 'https://acme.dev/docs',
      title: 'Docs',
      history: ['https://acme.dev/a', 'https://acme.dev/docs'],
    })
  })
})

describe('RemoteBrowserStore: closing', () => {
  it('closes the person’s browser at once and shows the agent’s', async () => {
    const { store, api, ws } = await live([PERSON, AGENT])
    store.show('mine')
    const answer = deferred<void>()
    api.close.mockReturnValueOnce(answer.promise)
    const closing = store.close()
    expect(store.getState()).toMatchObject({ shownId: 'agent', sessions: [AGENT] })
    expect(ws.sent.at(-1)).toEqual({
      type: 'remoteBrowser:watch',
      projectId: 'p1',
      sessionId: 'agent',
    })
    void store.close()
    answer.resolve()
    await closing
    expect(api.close).toHaveBeenCalledTimes(1)
  })

  it('comes back when the browser did not close', async () => {
    const { store, api } = await live([PERSON])
    api.close.mockRejectedValueOnce(new Error('nope'))
    await store.close()
    expect(store.getState()).toMatchObject({
      shownId: 'mine',
      sessions: [PERSON],
      status: 'live',
      error: REMOTE_BROWSER_TEXT.closeFailed,
    })
  })

  it('never closes the agent’s browser', async () => {
    const { store, api } = await live([AGENT])
    await store.close()
    expect(api.close).not.toHaveBeenCalled()
  })
})

describe('RemoteBrowserStore: driving', () => {
  it('sends the person’s input to the shown browser', async () => {
    const { store, api } = await live([PERSON])
    await store.send({ kind: 'click', x: 10, y: 20, clickCount: 1 })
    expect(api.input).toHaveBeenCalledWith('p1', CONTEXT, 'mine', {
      kind: 'click',
      x: 10,
      y: 20,
      clickCount: 1,
    })
  })

  it('sends nothing while the agent drives, until the person takes over and after they hand back', async () => {
    const { store, api } = await live([AGENT])
    await store.send({ kind: 'text', text: 'a' })
    expect(api.input).not.toHaveBeenCalled()
    store.takeOver()
    await store.send({ kind: 'text', text: 'a' })
    expect(api.input).toHaveBeenCalledTimes(1)
    store.handBack()
    await store.send({ kind: 'text', text: 'b' })
    expect(api.input).toHaveBeenCalledTimes(1)
  })

  it('sends nothing before the page is live', async () => {
    const { store, api } = await started([PERSON])
    await store.send({ kind: 'text', text: 'a' })
    expect(api.input).not.toHaveBeenCalled()
  })

  it('says when the page did not take the input', async () => {
    const { store, api } = await live([PERSON])
    api.input.mockResolvedValueOnce(ok({ ok: false, error: 'Detached' }))
    await store.send({ kind: 'key', key: 'Enter' })
    expect(store.getState().error).toBe('Detached')
    store.dismissError()
    api.input.mockResolvedValueOnce(ok({ ok: false }))
    await store.send({ kind: 'key', key: 'Enter' })
    expect(store.getState().error).toBe(REMOTE_BROWSER_TEXT.inputFailed)
    api.input.mockRejectedValueOnce(new Error('down'))
    await store.send({ kind: 'key', key: 'Enter' })
    expect(store.getState().error).toBe('down')
  })

  it('resizes the person’s browser to the view once per size', async () => {
    const { store, api } = await live([PERSON])
    await store.resize({ width: 780.4, height: 600.6 })
    await store.resize({ width: 780, height: 601 })
    expect(api.resize).toHaveBeenCalledTimes(1)
    expect(api.resize).toHaveBeenCalledWith('p1', CONTEXT, 'mine', { width: 780, height: 601 })
  })

  it('tries a size again after it failed, and never resizes the agent’s browser', async () => {
    const { store, api } = await live([PERSON])
    api.resize.mockRejectedValueOnce(new Error('down'))
    await store.resize({ width: 500, height: 400 })
    await store.resize({ width: 500, height: 400 })
    expect(api.resize).toHaveBeenCalledTimes(2)
    const agent = await live([AGENT])
    await agent.store.resize({ width: 500, height: 400 })
    await agent.store.resize({ width: 0, height: 400 })
    expect(agent.api.resize).not.toHaveBeenCalled()
  })

  it('switches what a press does, dropping a pick on its way', async () => {
    const { store } = await live([PERSON])
    store.setMode('pick')
    void store.pick({ x: 10, y: 10 })
    store.setMode('mark')
    expect(store.getState()).toMatchObject({ mode: 'mark', draft: null })
  })
})

describe('RemoteBrowserStore: picks and marks', () => {
  it('opens a pick at once at the point pressed, then fills in what the browser found', async () => {
    const { store, api } = await live([PERSON])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 340, y: 515 })
    expect(store.getState().draft).toMatchObject({
      kind: 'pick',
      box: { x: 332, y: 507, width: 16, height: 16 },
      scroll: { x: 0, y: 40 },
      url: PERSON.url,
    })
    expect(store.getState().draft?.target).toBeUndefined()
    answer.resolve(ok({ target: ELEMENT, screenshotFile: 'pick.png' }))
    await picking
    expect(store.getState().draft).toMatchObject({
      box: { x: 300, y: 500, width: 84, height: 31 },
      target: ELEMENT,
      screenshotFile: 'pick.png',
    })
  })

  it('keeps the ring when the element came back with no box', async () => {
    const { store, api } = await live([PERSON])
    const { rect: _rect, ...bare } = ELEMENT
    api.pick.mockResolvedValueOnce(ok({ target: bare }))
    await store.pick({ x: 100, y: 100 })
    expect(store.getState().draft?.box).toEqual({ x: 92, y: 92, width: 16, height: 16 })
  })

  it('drops a pick the browser found nothing for, and says so', async () => {
    const { store, api } = await live([PERSON])
    api.pick.mockResolvedValueOnce(ok({ ok: false, error: 'Nothing there' }))
    await store.pick({ x: 1, y: 1 })
    expect(store.getState()).toMatchObject({ draft: null, error: 'Nothing there' })
    api.pick.mockResolvedValueOnce(ok())
    await store.pick({ x: 1, y: 1 })
    expect(store.getState()).toMatchObject({ draft: null, error: REMOTE_BROWSER_TEXT.noteFailed })
    api.pick.mockRejectedValueOnce(new Error('down'))
    await store.pick({ x: 1, y: 1 })
    expect(store.getState()).toMatchObject({ draft: null, error: 'down' })
  })

  it('does not pick or mark before the page is live', async () => {
    const { store, api } = await started([PERSON])
    await store.pick({ x: 1, y: 1 })
    await store.mark({ x: 1, y: 1, width: 40, height: 40 })
    expect(api.pick).not.toHaveBeenCalled()
    expect(api.mark).not.toHaveBeenCalled()
  })

  it('marks an area as drawn', async () => {
    const { store, api } = await live([PERSON])
    await store.mark({ x: 10, y: 20, width: 300, height: 200 })
    expect(api.mark).toHaveBeenCalledWith('p1', CONTEXT, 'mine', {
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    })
    expect(store.getState().draft).toMatchObject({
      kind: 'mark',
      box: { x: 10, y: 20, width: 300, height: 200 },
      target: { kind: 'area' },
    })
  })

  it('stages a note with its comment, going back to Browse', async () => {
    const { store } = await live([PERSON])
    store.setMode('pick')
    await store.pick({ x: 340, y: 515 })
    store.addDraft('Make this the main button')
    expect(store.getState()).toMatchObject({ draft: null, mode: 'browse' })
    expect(store.getState().notes).toMatchObject([{ comment: 'Make this the main button' }])
    expect(store.appNotes()).toEqual([
      {
        id: store.getState().notes[0].id,
        projectId: 'p1',
        params: { url: PERSON.url },
        comment: 'Make this the main button',
        targets: [ELEMENT],
        screenshotFile: 'pick.png',
      },
    ])
  })

  it('stages a pick added before the browser answered, and fills it in after', async () => {
    const { store, api } = await live([PERSON])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 340, y: 515 })
    store.addDraft('Quick')
    expect(store.appNotes()).toEqual([])
    answer.resolve(ok({ target: ELEMENT }))
    await picking
    expect(store.getState().notes[0].target).toEqual(ELEMENT)
    expect(store.appNotes()).toHaveLength(1)
  })

  it('takes back a staged pick the browser then found nothing for', async () => {
    const { store, api } = await live([PERSON])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 1, y: 1 })
    store.addDraft('')
    answer.resolve(ok({ ok: false }))
    await picking
    expect(store.getState().notes).toEqual([])
  })

  it('drops an answer for a pick the person cancelled', async () => {
    const { store, api } = await live([PERSON])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 1, y: 1 })
    store.cancelDraft()
    answer.resolve(ok({ target: ELEMENT }))
    await picking
    expect(store.getState()).toMatchObject({ draft: null, notes: [], error: null })
  })

  it('does nothing on Add with no pick open', async () => {
    const { store } = await live([PERSON])
    store.addDraft('x')
    expect(store.getState().notes).toEqual([])
  })

  it('edits, removes and clears staged notes', async () => {
    const { store } = await live([PERSON])
    await store.mark({ x: 0, y: 0, width: 40, height: 40 })
    store.addDraft('one')
    await store.mark({ x: 50, y: 0, width: 40, height: 40 })
    store.addDraft('two')
    const [first, second] = store.getState().notes
    store.editNote(first.id, 'first')
    expect(store.getState().notes[0].comment).toBe('first')
    store.removeNote(second.id)
    expect(store.getState().notes.map((n) => n.id)).toEqual([first.id])
    store.clearNotes()
    expect(store.getState().notes).toEqual([])
  })

  it('hands each note to the composer when it takes them, instead of staging it', async () => {
    const onAddNotes = vi.fn()
    const { store, api } = await live([PERSON], onAddNotes)
    await store.pick({ x: 1, y: 1 })
    store.addDraft('Now')
    expect(onAddNotes).toHaveBeenCalledWith([
      expect.objectContaining({ comment: 'Now', targets: [ELEMENT] }),
    ])
    expect(store.getState().notes).toEqual([])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 1, y: 1 })
    store.addDraft('Later')
    expect(onAddNotes).toHaveBeenCalledTimes(1)
    answer.resolve(ok({ target: ELEMENT }))
    await picking
    expect(onAddNotes).toHaveBeenLastCalledWith([expect.objectContaining({ comment: 'Later' })])
    expect(store.getState().notes).toEqual([])
  })

  it('ignores a failure for a pick the person cancelled', async () => {
    const { store, api } = await live([PERSON])
    const answer = deferred<RemoteBrowserNoteResult>()
    api.pick.mockReturnValueOnce(answer.promise)
    const picking = store.pick({ x: 1, y: 1 })
    store.cancelDraft()
    answer.resolve(ok({ ok: false }))
    await picking
    expect(store.getState().error).toBeNull()
  })
})

describe('RemoteBrowserStore: other projects', () => {
  it('ignores frames, ends and refusals for another project', async () => {
    const { store, ws } = await live([PERSON])
    ws.emit(REMOTE_BROWSER_EVENT.frame, {
      projectId: 'p2',
      sessionId: 'mine',
      frame: { ...FRAME, data: 'x' },
    })
    ws.emit(REMOTE_BROWSER_EVENT.ended, { projectId: 'p2', sessionId: 'mine' })
    ws.emit(REMOTE_BROWSER_EVENT.refused, { projectId: 'p2', sessionId: 'mine', error: 'x' })
    expect(store.getState()).toMatchObject({ status: 'live', frame: FRAME, error: null })
  })
})
