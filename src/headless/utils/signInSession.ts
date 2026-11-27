import type { SignInSessionState, SignInSurface } from 'thefactory-tools/types'
import type {
  RemoteBrowserActionResult,
  RemoteBrowserApi,
  RemoteBrowserInput,
  RemoteBrowserSession,
} from './remoteBrowserTypes'
import { SIGN_IN_SESSION_TEXT } from './signInSessionConstants'
import type {
  SignInSessionView,
  SignInSessionsApi,
  SignInSessionsSnapshot,
} from './signInSessionTypes'

const STATUSES: readonly SignInSessionState['status'][] = [
  'open',
  'finished',
  'closed',
  'timed-out',
  'failed',
]

const WEB_LINK = /^https?:\/\//i

const text = (value: unknown): value is string => typeof value === 'string'

function surfaceOf(told: unknown): SignInSurface | undefined {
  if (!told || typeof told !== 'object') return undefined
  const { kind, message, url, input } = told as Record<string, unknown>
  if (kind === 'browser') return { kind }
  if (kind !== 'prompt') return undefined
  const field = (input ?? undefined) as { label?: unknown; secret?: unknown } | undefined
  return {
    kind,
    ...(text(message) ? { message } : {}),
    ...(text(url) ? { url } : {}),
    ...(field && text(field.label)
      ? {
          input: {
            label: field.label,
            ...(typeof field.secret === 'boolean' ? { secret: field.secret } : {}),
          },
        }
      : {}),
  }
}

/** The session a `signInSessions:changed` event tells, or `undefined` when it tells none. Pure. */
export function signInSessionChangeOf(data: unknown): SignInSessionState | undefined {
  const told = (data as { session?: unknown } | null | undefined)?.session
  if (!told || typeof told !== 'object') return undefined
  const { id, kind, subject, title, status, startedAt, expiresAt, error } = told as Record<
    string,
    unknown
  >
  const surface = surfaceOf((told as { surface?: unknown }).surface)
  if (!text(id) || id === '' || !text(kind) || !text(subject) || !text(title) || !surface) {
    return undefined
  }
  if (!STATUSES.some((known) => known === status)) return undefined
  return {
    id,
    kind,
    subject,
    title,
    status: status as SignInSessionState['status'],
    surface,
    startedAt: text(startedAt) ? startedAt : '',
    expiresAt: text(expiresAt) ? expiresAt : '',
    ...(text(error) ? { error } : {}),
  }
}

/** A sign-in session's page as the remote browser lists a browser of the person's. Pure. */
export function signInBrowserSessionOf(session: SignInSessionState): RemoteBrowserSession {
  return {
    sessionId: session.id,
    url: '',
    title: session.title,
    holder: { kind: 'person' },
    createdAt: Date.parse(session.startedAt) || 0,
  }
}

type Waiting = {
  input: RemoteBrowserInput
  heard: { resolve: (result: RemoteBrowserActionResult) => void; reject: (err: unknown) => void }[]
}

/**
 * `send`, one input at a time in the order given: what is typed reaches the
 * page as it was typed, however the requests would have raced. Letters typed
 * while one is on its way go together as one text. Pure.
 */
function inOrder(
  send: (input: RemoteBrowserInput) => Promise<RemoteBrowserActionResult>,
): (input: RemoteBrowserInput) => Promise<RemoteBrowserActionResult> {
  const waiting: Waiting[] = []
  let sending = false
  const drain = async () => {
    if (sending) return
    sending = true
    for (let next = waiting.shift(); next; next = waiting.shift()) {
      const { heard } = next
      await send(next.input).then(
        (result) => heard.forEach((one) => one.resolve(result)),
        (err: unknown) => heard.forEach((one) => one.reject(err)),
      )
    }
    sending = false
  }
  return (input) =>
    new Promise((resolve, reject) => {
      const last = waiting.at(-1)
      if (last && last.input.kind === 'text' && input.kind === 'text') {
        last.input = { kind: 'text', text: last.input.text + input.text }
        last.heard.push({ resolve, reject })
      } else {
        waiting.push({ input, heard: [{ resolve, reject }] })
      }
      void drain()
    })
}

/**
 * The routes the remote browser's store drives a sign-in session's page
 * through: the one page, its input — sent in the order made — and size, and
 * its closing. It opens no other page and takes no picks or marks. Pure.
 */
export function signInBrowserApi(
  session: SignInSessionState,
  api: SignInSessionsApi,
): RemoteBrowserApi {
  const refuse = async (): Promise<never> => {
    throw new Error(SIGN_IN_SESSION_TEXT.onlyThisPage)
  }
  const input = inOrder((made) => api.input(session.id, made))
  return {
    list: async () => [signInBrowserSessionOf(session)],
    open: refuse,
    close: (_scope, _context, sessionId) => api.close(sessionId),
    input: (_scope, _context, _sessionId, made) => input(made),
    resize: (_scope, _context, sessionId, viewport) => api.resize(sessionId, viewport),
    pick: refuse,
    mark: refuse,
  }
}

/** Why a sign-in that did not finish ended, for whoever started it to show; nothing for one finished or closed by hand. Pure. */
export function signInEndedNotice(session: SignInSessionState): string | undefined {
  if (session.status === 'timed-out') return SIGN_IN_SESSION_TEXT.timedOut
  if (session.status === 'failed') return session.error ?? SIGN_IN_SESSION_TEXT.failed
  return undefined
}

/** The shown sign-in as its view draws it; `undefined` while none is shown. Pure. */
export function signInSessionView(snapshot: SignInSessionsSnapshot): SignInSessionView | undefined {
  const { shown } = snapshot
  if (!shown) return undefined
  const base = { id: shown.id, title: shown.title, hint: SIGN_IN_SESSION_TEXT.closesItself }
  const { surface } = shown
  if (surface.kind === 'browser') return { ...base, surface: 'browser' }
  const nothingYet = !surface.message && !surface.url && !surface.input
  return {
    ...base,
    surface: 'prompt',
    ...(surface.message
      ? { message: surface.message }
      : nothingYet
        ? { message: SIGN_IN_SESSION_TEXT.starting }
        : {}),
    ...(surface.url && WEB_LINK.test(surface.url) ? { link: surface.url } : {}),
    ...(surface.input ? { input: surface.input } : {}),
    answering: snapshot.answering,
    ...(snapshot.error ? { error: snapshot.error } : {}),
  }
}
