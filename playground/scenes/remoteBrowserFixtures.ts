import { useEffect, useMemo, useRef } from 'react'
import {
  useRemoteBrowser,
  type RemoteBrowserApi,
  type RemoteBrowserBox,
  type RemoteBrowserFrame,
  type RemoteBrowserInput,
  type RemoteBrowserNoteResult,
  type RemoteBrowserPoint,
  type RemoteBrowserSession,
  type RemoteBrowserSize,
  type RemoteBrowserSocket,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from 'thefactory-ui/headless'
import type { ChatContext } from 'thefactory-tools/types'

export const BROWSER_PROJECT = 'acme-site'
export const BROWSER_CONTEXT: ChatContext = { type: 'PROJECT', projectId: BROWSER_PROJECT }
export const PRICING_URL = 'https://acme.dev/pricing'
export const SHARED_URL = 'https://acme.dev/pricing?plan=team'

export const PERSON_BROWSER: RemoteBrowserSession = {
  sessionId: 'browser-person',
  url: PRICING_URL,
  title: 'Pricing - Acme',
  holder: { kind: 'person' },
  createdAt: 1_700_000_000_000,
}

export const AGENT_BROWSER: RemoteBrowserSession = {
  sessionId: 'browser-agent',
  url: SHARED_URL,
  title: 'Pricing - Acme',
  holder: { kind: 'agent', runId: 'run-1' },
  createdAt: 1_700_000_100_000,
}

export const PICK_NOTE = 'Make this the main button: filled, not outlined.'
export const MARK_NOTE = 'The three cards feel cramped here. More space between them.'

type Element = {
  selector: string
  outerHtml: string
  box: RemoteBrowserBox
}

type Layout = {
  narrow: boolean
  nav: number
  plans: RemoteBrowserBox
  cards: { name: string; price: string; items: string[]; go: string; box: RemoteBrowserBox }[]
  elements: Element[]
}

const CARDS = [
  { name: 'Free', price: '$0', items: ['1 project', 'Community help'], go: 'Start', slug: 'free' },
  {
    name: 'Team',
    price: '$24',
    items: ['10 projects', 'Shared boards', 'Email help'],
    go: 'Start trial',
    slug: 'team',
  },
  {
    name: 'Business',
    price: '$79',
    items: ['Unlimited projects', 'SSO', 'Priority help'],
    go: 'Contact us',
    slug: 'business',
  },
]

/** The fake pricing page laid out at a viewport: what is drawn, and what a pick finds. */
export function pricingLayout(size: RemoteBrowserSize): Layout {
  const narrow = size.width < 560
  const pad = narrow ? 14 : 24
  const gap = narrow ? 10 : 14
  const nav = narrow ? 52 : 56
  const top = narrow ? nav + 104 : nav + 116
  const cardH = narrow ? 126 : 196
  const cardW = narrow ? size.width - pad * 2 : (size.width - pad * 2 - gap * 2) / 3
  const cards = CARDS.map((card, i) => ({
    ...card,
    box: {
      x: narrow ? pad : pad + i * (cardW + gap),
      y: narrow ? top + i * (cardH + gap) : top,
      width: cardW,
      height: cardH,
    },
  }))
  const goWidth = (go: string) => Math.round(go.length * 7.2 + 30)
  const elements: Element[] = cards.flatMap((card, i) => {
    const slug = CARDS[i].slug
    const button = {
      x: card.box.x + 16,
      y: card.box.y + card.box.height - 47,
      width: goWidth(card.go),
      height: 31,
    }
    return [
      {
        selector: `div.plan.plan--${slug} > a.plan-cta`,
        outerHtml: `<a class="plan-cta" href="/signup?plan=${slug}">${card.go}</a>`,
        box: button,
      },
      {
        selector: `div.plan.plan--${slug}`,
        outerHtml: `<div class="plan plan--${slug}">…</div>`,
        box: card.box,
      },
    ]
  })
  elements.push(
    {
      selector: 'header > a.signin',
      outerHtml: '<a class="signin" href="/login">Sign in</a>',
      box: { x: size.width - pad - 66, y: nav / 2 - 14, width: 66, height: 28 },
    },
    {
      selector: 'main > h1',
      outerHtml: '<h1>Simple pricing</h1>',
      box: { x: size.width / 2 - 115, y: nav + 26, width: 230, height: 38 },
    },
  )
  const last = cards[cards.length - 1].box
  return {
    narrow,
    nav,
    plans: {
      x: pad - 8,
      y: top - 8,
      width: size.width - pad * 2 + 16,
      height: last.y + last.height - top + 16,
    },
    cards,
    elements,
  }
}

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

/** The fake pricing page as an SVG picture, the way the browser sends frames. */
export function pricingSvg(size: RemoteBrowserSize): string {
  const { width, height } = size
  const layout = pricingLayout(size)
  const { narrow, nav } = layout
  const pad = narrow ? 14 : 24
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#fffbf5"/>`,
    `<line x1="0" y1="${nav}" x2="${width}" y2="${nav}" stroke="#eadfcf"/>`,
    `<text x="${pad}" y="${nav / 2 + 6}" font-family="${SERIF}" font-size="17" font-weight="700" fill="#1c1917">Acme</text>`,
  ]
  if (!narrow) {
    const links = ['Product', 'Pricing', 'Docs']
    links.forEach((link, i) => {
      parts.push(
        `<text x="${width - pad - 66 - 18 - (links.length - i) * 58}" y="${nav / 2 + 5}" font-family="${SANS}" font-size="13" fill="#57534e">${link}</text>`,
      )
    })
  }
  parts.push(
    `<rect x="${width - pad - 66}" y="${nav / 2 - 14}" width="66" height="28" rx="14" fill="#1c1917"/>`,
    `<text x="${width - pad - 33}" y="${nav / 2 + 5}" text-anchor="middle" font-family="${SANS}" font-size="13" fill="#fff">Sign in</text>`,
    `<text x="${width / 2}" y="${nav + 56}" text-anchor="middle" font-family="${SERIF}" font-size="${narrow ? 24 : 30}" font-weight="600" fill="#1c1917">Simple pricing</text>`,
    `<text x="${width / 2}" y="${nav + 84}" text-anchor="middle" font-family="${SANS}" font-size="14" fill="#78716c">Start free. Upgrade when your team grows.</text>`,
  )
  layout.cards.forEach((card, i) => {
    const { x, y, width: w, height: h } = card.box
    const team = i === 1
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="${team ? '#c2410c' : '#eadfcf'}"/>`,
      `<text x="${x + 16}" y="${y + 32}" font-family="${SERIF}" font-size="18" font-weight="600" fill="#1c1917">${card.name}</text>`,
      `<text x="${x + 16}" y="${y + 66}" font-family="${SANS}" font-size="24" font-weight="700" fill="#1c1917">${card.price}<tspan font-size="12" font-weight="400" fill="#78716c"> / month</tspan></text>`,
    )
    if (!narrow)
      card.items.forEach((item, j) => {
        parts.push(
          `<circle cx="${x + 20}" cy="${y + 88 + j * 18}" r="2" fill="#57534e"/>`,
          `<text x="${x + 30}" y="${y + 92 + j * 18}" font-family="${SANS}" font-size="12.5" fill="#57534e">${esc(item)}</text>`,
        )
      })
    const go = layout.elements[i * 2].box
    parts.push(
      `<rect x="${go.x}" y="${go.y}" width="${go.width}" height="${go.height}" rx="15.5" fill="#fff" stroke="${team ? '#c2410c' : '#1c1917'}"/>`,
      `<text x="${go.x + go.width / 2}" y="${go.y + 20}" text-anchor="middle" font-family="${SANS}" font-size="12.5" fill="${team ? '#c2410c' : '#1c1917'}">${card.go}</text>`,
    )
  })
  const plansEnd = layout.plans.y + layout.plans.height
  parts.push(
    `<text x="${width / 2}" y="${plansEnd + 18}" text-anchor="middle" font-family="${SANS}" font-size="12" fill="#a8a29e">Prices in USD. Cancel any time.</text>`,
    '</svg>',
  )
  return parts.join('')
}

export function pricingFrame(size: RemoteBrowserSize): RemoteBrowserFrame {
  return {
    data: btoa(pricingSvg(size)),
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

/** Where the Team plan's Start trial button is on the page at a viewport. */
export function startTrialPoint(size: RemoteBrowserSize): RemoteBrowserPoint {
  const box = pricingLayout(size).elements[2].box
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** The three plans, as a person would mark them. */
export function plansArea(size: RemoteBrowserSize): RemoteBrowserBox {
  return pricingLayout(size).plans
}

const contains = (box: RemoteBrowserBox, p: RemoteBrowserPoint) =>
  p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height

export type FakeBrowserOptions = {
  sessions: RemoteBrowserSession[]
  viewport: RemoteBrowserSize
  /** The page never sends a frame: it stays on its way. */
  silent?: boolean
}

/**
 * The browser beside a chat, faked in the page: its routes answer at once from the fake pricing
 * page, and its socket sends that page's frame to a watcher — again on every resize — so the
 * real view drives it with no backend and no network.
 */
export class FakeRemoteBrowser {
  private sessions: RemoteBrowserSession[]
  private viewport: RemoteBrowserSize
  private silent: boolean
  private readonly handlers = new Map<string, Set<(data: unknown) => void>>()
  private watched: string | null = null

  constructor(options: FakeBrowserOptions) {
    this.sessions = options.sessions
    this.viewport = options.viewport
    this.silent = options.silent ?? false
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
        this.sendFrame()
      } else if (type === 'remoteBrowser:unwatch' && this.watched === sessionId) {
        this.watched = null
      }
      return true
    },
  }

  readonly api: RemoteBrowserApi = {
    list: async () => this.sessions,
    open: async (_projectId, _context, body) => {
      if (body.viewport) this.viewport = body.viewport
      const session = { ...PERSON_BROWSER, url: body.url }
      this.sessions = [...this.sessions.filter((s) => s.sessionId !== session.sessionId), session]
      queueMicrotask(() => this.sendFrame())
      return session
    },
    close: async (_projectId, _context, sessionId) => {
      this.sessions = this.sessions.filter((s) => s.sessionId !== sessionId)
    },
    input: async (_projectId, _context, sessionId, _input: RemoteBrowserInput) =>
      this.result(sessionId),
    resize: async (_projectId, _context, sessionId, viewport) => {
      const changed =
        Math.abs(viewport.width - this.viewport.width) > 1 ||
        Math.abs(viewport.height - this.viewport.height) > 1
      this.viewport = viewport
      if (changed) this.sendFrame()
      return this.result(sessionId)
    },
    pick: async (_projectId, _context, sessionId, point) => {
      const found = pricingLayout(this.viewport).elements.find((el) => contains(el.box, point))
      if (!found)
        return { ...this.result(sessionId), ok: false, error: 'Nothing was picked there.' }
      return {
        ...this.result(sessionId),
        target: {
          kind: 'element',
          selector: found.selector,
          outerHtml: found.outerHtml,
          rect: { ...found.box, space: 'app-viewport' },
        },
        screenshotFile: 'remote-browser-note.png',
      }
    },
    mark: async (_projectId, _context, sessionId, box) => ({
      ...this.result(sessionId),
      target: { kind: 'area', rect: { ...box, space: 'app-viewport' } },
      screenshotFile: 'remote-browser-note.png',
    }),
  }

  /** The browser closes on its own, as when its run ends. */
  end(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.sessionId !== sessionId)
    if (this.watched === sessionId) this.watched = null
    this.emit('remoteBrowser:ended', { projectId: BROWSER_PROJECT, sessionId })
  }

  /** The socket drops: no frame comes until it is back. */
  drop(): void {
    this.silent = true
  }

  private result(sessionId: string): RemoteBrowserNoteResult {
    const session = this.sessions.find((s) => s.sessionId === sessionId)
    return {
      sessionId,
      ok: true,
      url: session?.url ?? PRICING_URL,
      title: session?.title ?? 'Pricing - Acme',
    }
  }

  private sendFrame(): void {
    if (this.silent || !this.watched) return
    this.emit('remoteBrowser:frame', {
      projectId: BROWSER_PROJECT,
      sessionId: this.watched,
      frame: pricingFrame(this.viewport),
    })
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(data))
  }
}

export type BrowserDevice = 'desktop' | 'phone'

/**
 * What a scene does once its page is live, as a person would: pick, mark, add notes, lose the
 * socket, see the browser close. Everything answers at once from the fake browser.
 */
export type BrowserStep = 'browse' | 'pick' | 'mark' | 'notes' | 'lost' | 'ended'

export type BrowserSceneProps = {
  device: BrowserDevice
  step?: BrowserStep
  shared?: boolean
  silent?: boolean
  idle?: boolean
}

/** The page's size in each scene's browser, which the fake's first frame takes. */
export const BROWSER_VIEWPORT: Record<BrowserDevice, RemoteBrowserSize> = {
  desktop: { width: 698, height: 653 },
  phone: { width: 388, height: 520 },
}

/** The browser beside a chat on the fake, played to its scene's step. */
export function useRemoteBrowserScene({
  device,
  step = 'browse',
  shared = false,
  silent = false,
  idle = false,
}: BrowserSceneProps): { state: RemoteBrowserState; store: RemoteBrowserStore } {
  const fake = useMemo(
    () =>
      new FakeRemoteBrowser({
        sessions: idle ? [] : shared ? [AGENT_BROWSER] : [PERSON_BROWSER],
        viewport: BROWSER_VIEWPORT[device],
        silent,
      }),
    [device, shared, silent, idle],
  )
  const { state, store } = useRemoteBrowser({
    projectId: BROWSER_PROJECT,
    context: BROWSER_CONTEXT,
    visible: true,
    api: fake.api,
    socket: fake.socket,
    connected: true,
  })
  const played = useRef(false)
  useEffect(() => {
    if (played.current || state.status !== 'live' || !state.frame || !state.shownId) return
    played.current = true
    const viewport = {
      width: state.frame.metadata.deviceWidth,
      height: state.frame.metadata.deviceHeight,
    }
    const shownId = state.shownId
    const run = async () => {
      if (step === 'pick' || step === 'notes') {
        store.setMode('pick')
        await store.pick(startTrialPoint(viewport))
        if (step === 'notes') store.addDraft(PICK_NOTE)
      }
      if (step === 'mark' || step === 'notes') {
        store.setMode('mark')
        const area = plansArea(viewport)
        await store.mark({
          ...area,
          height: Math.min(area.height, viewport.height - area.y - 8),
        })
        if (step === 'notes') store.addDraft(MARK_NOTE)
      }
      if (step === 'lost') {
        fake.drop()
        store.setConnected(false)
      }
      if (step === 'ended') fake.end(shownId)
    }
    void run()
  }, [fake, state.status, state.frame, state.shownId, store, step])
  return { state, store }
}
