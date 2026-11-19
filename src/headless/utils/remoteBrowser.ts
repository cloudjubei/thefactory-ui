import type { ChatAppNote } from '../api/generated'
import {
  REMOTE_BROWSER_MIN_MARK_PX,
  REMOTE_BROWSER_NAMED_KEYS,
  REMOTE_BROWSER_PICK_RING_PX,
  REMOTE_BROWSER_TEXT,
} from './remoteBrowserConstants'
import type {
  RemoteBrowserBox,
  RemoteBrowserDriver,
  RemoteBrowserFrameMetadata,
  RemoteBrowserInput,
  RemoteBrowserNote,
  RemoteBrowserPoint,
  RemoteBrowserSession,
  RemoteBrowserSize,
  RemoteBrowserState,
} from './remoteBrowserTypes'

const SCHEME = /^([a-z][a-z0-9+.-]*):/i
const PORT_AFTER_HOST = /^\d+(\/|\?|#|$)/
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:|\/|\?|#|$)/i
const WEB_ADDRESS = /^(https?):\/\/([^/?#@\s]+)([/?#].*)?$/i

/**
 * The address a person typed as the browser opens it: http and https only, one with no scheme as
 * https, and localhost as http. `null` for anything else.
 */
export function normalizeAddress(raw: string): string | null {
  const typed = raw.trim()
  if (!typed || /\s/.test(typed)) return null
  const scheme = SCHEME.exec(typed)
  const hasScheme = !!scheme && !PORT_AFTER_HOST.test(typed.slice(scheme[0].length))
  if (hasScheme && !/^https?$/i.test(scheme[1])) return null
  const full = hasScheme ? typed : `${LOCAL_HOST.test(typed) ? 'http' : 'https'}://${typed}`
  const parts = WEB_ADDRESS.exec(full)
  if (!parts) return null
  return `${parts[1].toLowerCase()}://${parts[2].toLowerCase()}${parts[3] || '/'}`
}

/** An address without its scheme: `acme.dev/pricing`. */
export function shortAddress(address: string): string {
  const parts = WEB_ADDRESS.exec(address)
  if (!parts) return address
  const rest = parts[3].startsWith('/?') ? parts[3].slice(1) : parts[3] === '/' ? '' : parts[3]
  return `${parts[2]}${rest}`
}

const FRAME_TYPES: readonly [string, string][] = [
  ['/9j/', 'image/jpeg'],
  ['iVBOR', 'image/png'],
  ['PHN2', 'image/svg+xml'],
  ['UklGR', 'image/webp'],
]

/** A frame's picture as an image source, its type read from its first bytes. */
export function frameSrc(data: string): string {
  const type = FRAME_TYPES.find(([start]) => data.startsWith(start))?.[1] ?? 'image/jpeg'
  return `data:${type};base64,${data}`
}

/** Where a page of a size is drawn in a view, whole and centred. */
export function fitFrame(view: RemoteBrowserSize, page: RemoteBrowserSize): RemoteBrowserBox {
  if (view.width <= 0 || view.height <= 0 || page.width <= 0 || page.height <= 0)
    return { x: 0, y: 0, width: 0, height: 0 }
  const scale = Math.min(view.width / page.width, view.height / page.height)
  const width = page.width * scale
  const height = page.height * scale
  return { x: (view.width - width) / 2, y: (view.height - height) / 2, width, height }
}

/** The page's viewport point under a point of the view, or `null` off the drawn page. */
export function toPagePoint(
  point: RemoteBrowserPoint,
  fit: RemoteBrowserBox,
  page: RemoteBrowserSize,
): RemoteBrowserPoint | null {
  if (fit.width <= 0 || fit.height <= 0) return null
  const x = point.x - fit.x
  const y = point.y - fit.y
  if (x < 0 || y < 0 || x > fit.width || y > fit.height) return null
  return { x: (x / fit.width) * page.width, y: (y / fit.height) * page.height }
}

/** A box taken on the page at one scroll, drawn on the view of the page as it is now. */
export function viewBoxOf(
  box: RemoteBrowserBox,
  takenAt: RemoteBrowserPoint,
  now: RemoteBrowserFrameMetadata,
  fit: RemoteBrowserBox,
): RemoteBrowserBox {
  const scale = now.deviceWidth > 0 ? fit.width / now.deviceWidth : 0
  return {
    x: fit.x + (box.x + takenAt.x - now.scrollOffsetX) * scale,
    y: fit.y + (box.y + takenAt.y - now.scrollOffsetY) * scale,
    width: box.width * scale,
    height: box.height * scale,
  }
}

/** The box two corners of a drag span. */
export function boxBetween(a: RemoteBrowserPoint, b: RemoteBrowserPoint): RemoteBrowserBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

export function isMarkable(box: RemoteBrowserBox): boolean {
  return box.width >= REMOTE_BROWSER_MIN_MARK_PX && box.height >= REMOTE_BROWSER_MIN_MARK_PX
}

/** A pick's box until the browser says what it found. */
export function pickRing(point: RemoteBrowserPoint): RemoteBrowserBox {
  const half = REMOTE_BROWSER_PICK_RING_PX / 2
  return {
    x: point.x - half,
    y: point.y - half,
    width: REMOTE_BROWSER_PICK_RING_PX,
    height: REMOTE_BROWSER_PICK_RING_PX,
  }
}

export type RemoteBrowserKeyPress = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/** What a key pressed on the page sends: text, a named key, or a chord. `null` for none. */
export function keyInput(press: RemoteBrowserKeyPress): RemoteBrowserInput | null {
  const named = REMOTE_BROWSER_NAMED_KEYS.includes(press.key)
  if (!named && press.key.length !== 1) return null
  const mods = [press.ctrlKey && 'Control', press.metaKey && 'Meta', press.altKey && 'Alt'].filter(
    (mod): mod is string => !!mod,
  )
  if (mods.length) return { kind: 'key', key: [...mods, press.key].join('+') }
  return named ? { kind: 'key', key: press.key } : { kind: 'text', text: press.key }
}

/** A selector's last step: `a.plan-cta`. */
export function shortSelector(selector: string): string {
  return (
    selector
      .split(/\s*>\s*|\s+/)
      .filter(Boolean)
      .at(-1) ?? selector
  )
}

/** "Pick 1", "Area 2". */
export function noteTitle(note: RemoteBrowserNote, number: number): string {
  return note.kind === 'pick'
    ? REMOTE_BROWSER_TEXT.pickTitle(number)
    : REMOTE_BROWSER_TEXT.markTitle(number)
}

function areaSize(note: RemoteBrowserNote): string {
  return REMOTE_BROWSER_TEXT.size(Math.round(note.box.width), Math.round(note.box.height))
}

/** What a note is on: its element or its size, and the page. */
export function noteWhere(note: RemoteBrowserNote): string {
  const page = shortAddress(note.url)
  if (note.kind === 'mark') return `${areaSize(note)} · ${page}`
  if (note.target?.kind === 'element') return `${shortSelector(note.target.selector)} · ${page}`
  return page
}

/** A staged note's line: its element's selector, or its area. */
export function noteLabel(note: RemoteBrowserNote): string {
  if (note.kind === 'mark')
    return REMOTE_BROWSER_TEXT.area(Math.round(note.box.width), Math.round(note.box.height))
  if (note.target?.kind === 'element') return note.target.selector
  return shortAddress(note.url)
}

/** A note as the chat sends it to the agent, once the browser said what it is on. */
export function toChatAppNote(note: RemoteBrowserNote, projectId: string): ChatAppNote | null {
  if (!note.target) return null
  return {
    id: note.id,
    projectId,
    params: { url: note.url },
    comment: note.comment,
    targets: [note.target],
    ...(note.screenshotFile ? { screenshotFile: note.screenshotFile } : {}),
  }
}

export function shownSession(state: RemoteBrowserState): RemoteBrowserSession | undefined {
  return state.sessions.find((session) => session.sessionId === state.shownId)
}

export function driverOf(state: RemoteBrowserState): RemoteBrowserDriver {
  return shownSession(state)?.holder?.kind === 'agent' && !state.takenOver ? 'agent' : 'person'
}

export function canGoBack(state: RemoteBrowserState): boolean {
  return state.historyAt > 0
}

export function canGoForward(state: RemoteBrowserState): boolean {
  return state.historyAt < state.history.length - 1
}
