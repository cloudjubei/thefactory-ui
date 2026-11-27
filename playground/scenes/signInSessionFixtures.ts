import { useEffect, useMemo, useState } from 'react'
import type { SignInSessionState } from 'thefactory-tools/types'
import {
  signInSessionView,
  useSignInBrowser,
  type RemoteBrowserFrame,
  type RemoteBrowserSize,
  type RemoteBrowserSocket,
  type RemoteBrowserState,
  type RemoteBrowserStore,
  type SignInSessionView,
  type SignInSessionsApi,
} from 'thefactory-ui/headless'

/** A made-up recording site: the showcase draws no real site's sign-in page. */
export const CLIPS_SESSION: SignInSessionState = {
  id: 'sign-in-clips',
  kind: 'recording-site',
  subject: 'clips',
  title: 'Sign in to Clips',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-26T12:00:00.000Z',
  expiresAt: '2026-11-26T12:15:00.000Z',
}

const TOOL = {
  ...CLIPS_SESSION,
  id: 'sign-in-tool',
  kind: 'cli',
  subject: 'builder',
  title: 'Sign in to Builder',
}

const DEVICE_LINK = 'https://auth.builder.example/device?user_code=WDJB-MJHT'

/** Every state of a sign-in that shows a prompt, by the id its scene state and its mobile view share. */
export const SIGN_IN_PROMPTS: Record<string, SignInSessionView> = {
  starting: view({ ...TOOL, surface: { kind: 'prompt' } }),
  'link-and-code': view({
    ...TOOL,
    surface: {
      kind: 'prompt',
      message: 'Open the link and sign in there. Then paste the code it shows you.',
      url: DEVICE_LINK,
      input: { label: 'Code', secret: true },
    },
  }),
  answering: view(
    {
      ...TOOL,
      surface: {
        kind: 'prompt',
        message: 'Open the link and sign in there. Then paste the code it shows you.',
        url: DEVICE_LINK,
        input: { label: 'Code', secret: true },
      },
    },
    { answering: true },
  ),
  refused: view(
    {
      ...TOOL,
      surface: {
        kind: 'prompt',
        message: 'Open the link and sign in there. Then paste the code it shows you.',
        url: DEVICE_LINK,
        input: { label: 'Code', secret: true },
      },
    },
    { error: 'That code is not right, or it has run out. Open the link again for a new one.' },
  ),
  'link-only': view({
    ...TOOL,
    surface: {
      kind: 'prompt',
      message: 'Open the link and approve the sign-in there. This closes once you have.',
      url: DEVICE_LINK,
    },
  }),
}

function view(
  shown: SignInSessionState,
  over: { answering?: boolean; error?: string } = {},
): SignInSessionView {
  return signInSessionView({ shown, answering: !!over.answering, error: over.error })!
}

/** The page's session as its view draws it. */
export const CLIPS_VIEW = view(CLIPS_SESSION)

const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

/** A made-up site's sign-in page as an SVG picture, the way the browser sends frames. */
export function signInPageSvg(size: RemoteBrowserSize): string {
  const { width, height } = size
  const card = Math.min(360, width - 32)
  const x = (width - card) / 2
  const y = Math.max(24, height / 2 - 190)
  const field = (top: number, label: string, value: string, focused = false) =>
    [
      `<text x="${x + 24}" y="${top}" font-family="${SANS}" font-size="12.5" fill="#44403c">${label}</text>`,
      `<rect x="${x + 24}" y="${top + 8}" width="${card - 48}" height="40" rx="8" fill="#fff" stroke="${focused ? '#4f46e5' : '#d6d3d1'}" stroke-width="${focused ? 2 : 1}"/>`,
      `<text x="${x + 36}" y="${top + 33}" font-family="${SANS}" font-size="14" fill="#1c1917">${value}</text>`,
    ].join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f5f5f4"/>`,
    `<rect x="${x}" y="${y}" width="${card}" height="380" rx="14" fill="#fff" stroke="#e7e5e4"/>`,
    `<circle cx="${x + 38}" cy="${y + 40}" r="14" fill="#4f46e5"/>`,
    `<text x="${x + 62}" y="${y + 46}" font-family="${SANS}" font-size="18" font-weight="700" fill="#1c1917">Clips</text>`,
    `<text x="${x + 24}" y="${y + 96}" font-family="${SANS}" font-size="20" font-weight="600" fill="#1c1917">Log in to Clips</text>`,
    field(y + 132, 'Email', 'kamil@acme.dev'),
    field(y + 212, 'Password', '••••••••••', true),
    `<rect x="${x + 24}" y="${y + 296}" width="${card - 48}" height="42" rx="8" fill="#4f46e5"/>`,
    `<text x="${width / 2}" y="${y + 322}" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="600" fill="#fff">Log in</text>`,
    `<text x="${width / 2}" y="${y + 362}" text-anchor="middle" font-family="${SANS}" font-size="12" fill="#78716c">Forgot your password?</text>`,
    '</svg>',
  ].join('')
}

function signInFrame(size: RemoteBrowserSize): RemoteBrowserFrame {
  return {
    data: btoa(unescape(encodeURIComponent(signInPageSvg(size)))),
    metadata: {
      deviceWidth: size.width,
      deviceHeight: size.height,
      pageScaleFactor: 1,
      offsetTop: 0,
      scrollOffsetX: 0,
      scrollOffsetY: 0,
    },
  }
}

/**
 * A sign-in session's page, faked in the showcase: its routes answer at once
 * and its socket sends the made-up sign-in page's frame to a watcher, again
 * on every resize, so the real view drives it with no backend and no site.
 */
export class FakeSignInPage {
  private viewport: RemoteBrowserSize
  private readonly silent: boolean
  private readonly handlers = new Map<string, Set<(data: unknown) => void>>()
  private watched: string | null = null

  constructor(viewport: RemoteBrowserSize, silent = false) {
    this.viewport = viewport
    this.silent = silent
  }

  readonly socket: RemoteBrowserSocket = {
    on: <T>(event: string, handler: (data: T) => void) => {
      const set = this.handlers.get(event) ?? new Set()
      set.add(handler as (data: unknown) => void)
      this.handlers.set(event, set)
      return () => set.delete(handler as (data: unknown) => void)
    },
    onReconnect: () => () => {},
    send: (message: object) => {
      const { type, sessionId } = message as { type: string; sessionId: string }
      if (type === 'remoteBrowser:watch') {
        this.watched = sessionId
        queueMicrotask(() => this.sendFrame())
      } else if (type === 'remoteBrowser:unwatch' && this.watched === sessionId) {
        this.watched = null
      }
      return true
    },
  }

  readonly api: SignInSessionsApi = {
    list: async () => [CLIPS_SESSION],
    close: async () => {},
    input: async (sessionId) => this.result(sessionId),
    resize: async (sessionId, viewport) => {
      const changed =
        Math.abs(viewport.width - this.viewport.width) > 1 ||
        Math.abs(viewport.height - this.viewport.height) > 1
      this.viewport = viewport
      if (changed) this.sendFrame()
      return this.result(sessionId)
    },
    answer: async () => {},
  }

  private result(sessionId: string) {
    return { sessionId, ok: true, url: 'https://clips.example/login', title: 'Log in - Clips' }
  }

  private sendFrame(): void {
    if (this.silent || !this.watched) return
    const data = {
      projectId: '@sign-in',
      sessionId: this.watched,
      frame: signInFrame(this.viewport),
    }
    this.handlers.get('remoteBrowser:frame')?.forEach((handler) => handler(data))
  }
}

export type SignInPageStep = 'live' | 'opening' | 'lost'

/** The page's size in each scene, which the fake's first frame takes. */
export const SIGN_IN_VIEWPORT = {
  desktop: { width: 960, height: 560 },
  phone: { width: 388, height: 470 },
} as const

/** A sign-in session's page on the fake, played to its scene's step. */
export function useSignInPageScene(
  device: keyof typeof SIGN_IN_VIEWPORT,
  step: SignInPageStep = 'live',
): { state: RemoteBrowserState; store: RemoteBrowserStore } {
  const fake = useMemo(
    () => new FakeSignInPage(SIGN_IN_VIEWPORT[device], step === 'opening'),
    [device, step],
  )
  const [lost, setLost] = useState(false)
  const { state, store } = useSignInBrowser(CLIPS_SESSION, {
    api: fake.api,
    socket: fake.socket,
    connected: !lost,
  })
  useEffect(() => {
    if (step === 'lost' && state.status === 'live') setLost(true)
  }, [step, state.status])
  return { state, store }
}
