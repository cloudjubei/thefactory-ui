import { describe, expect, it } from 'vitest'
import {
  boxBetween,
  canGoBack,
  canGoForward,
  driverOf,
  fitFrame,
  frameSrc,
  isMarkable,
  keyInput,
  normalizeAddress,
  noteLabel,
  noteTitle,
  noteWhere,
  pickRing,
  shortAddress,
  shortSelector,
  shownSession,
  toChatAppNote,
  toPagePoint,
  viewBoxOf,
} from './remoteBrowser'
import { REMOTE_BROWSER_EMPTY_STATE } from './remoteBrowserConstants'
import type {
  RemoteBrowserFrameMetadata,
  RemoteBrowserNote,
  RemoteBrowserSession,
  RemoteBrowserState,
} from './remoteBrowserTypes'

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
const state = (patch: Partial<RemoteBrowserState>): RemoteBrowserState => ({
  ...REMOTE_BROWSER_EMPTY_STATE,
  ...patch,
})
const meta = (patch: Partial<RemoteBrowserFrameMetadata> = {}): RemoteBrowserFrameMetadata => ({
  deviceWidth: 800,
  deviceHeight: 600,
  pageScaleFactor: 1,
  offsetTop: 0,
  scrollOffsetX: 0,
  scrollOffsetY: 0,
  ...patch,
})
const note = (patch: Partial<RemoteBrowserNote> = {}): RemoteBrowserNote => ({
  id: 'n1',
  kind: 'pick',
  box: { x: 10, y: 20, width: 84, height: 31 },
  scroll: { x: 0, y: 0 },
  url: 'https://acme.dev/pricing',
  comment: '',
  ...patch,
})

describe('normalizeAddress', () => {
  it('keeps http and https addresses', () => {
    expect(normalizeAddress(' https://acme.dev/pricing ')).toBe('https://acme.dev/pricing')
    expect(normalizeAddress('HTTP://acme.dev')).toBe('http://acme.dev/')
  })

  it('opens an address with no scheme as https, and localhost as http', () => {
    expect(normalizeAddress('acme.dev/pricing')).toBe('https://acme.dev/pricing')
    expect(normalizeAddress('localhost:3000/a')).toBe('http://localhost:3000/a')
    expect(normalizeAddress('127.0.0.1:8080')).toBe('http://127.0.0.1:8080/')
    expect(normalizeAddress('[::1]:5173')).toBe('http://[::1]:5173/')
  })

  it('refuses other schemes, blanks and what is no address', () => {
    for (const raw of [
      '',
      '   ',
      'javascript:alert(1)',
      'file:///etc/hosts',
      'ftp://x.y',
      'a b',
      'https://',
    ])
      expect(normalizeAddress(raw)).toBeNull()
  })
})

describe('shortAddress', () => {
  it('reads an address without its scheme or a bare trailing slash', () => {
    expect(shortAddress('https://acme.dev/pricing?plan=team')).toBe('acme.dev/pricing?plan=team')
    expect(shortAddress('https://acme.dev/')).toBe('acme.dev')
    expect(shortAddress('https://acme.dev/?q=1')).toBe('acme.dev?q=1')
  })

  it('keeps what is no address as it is', () => {
    expect(shortAddress('not a url')).toBe('not a url')
  })
})

describe('frameSrc', () => {
  it('names the picture type a frame carries', () => {
    expect(frameSrc('/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ')
    expect(frameSrc('iVBORw0K')).toBe('data:image/png;base64,iVBORw0K')
    expect(frameSrc('PHN2ZyB4')).toBe('data:image/svg+xml;base64,PHN2ZyB4')
    expect(frameSrc('UklGRiQ')).toBe('data:image/webp;base64,UklGRiQ')
  })

  it('reads anything else as jpeg, the screencast default', () => {
    expect(frameSrc('AAAA')).toBe('data:image/jpeg;base64,AAAA')
  })
})

describe('fitFrame', () => {
  it('fills a view of the same shape', () => {
    expect(fitFrame({ width: 400, height: 300 }, { width: 800, height: 600 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    })
  })

  it('centres a page wider than its view, with bars above and below', () => {
    expect(fitFrame({ width: 400, height: 400 }, { width: 800, height: 400 })).toEqual({
      x: 0,
      y: 100,
      width: 400,
      height: 200,
    })
  })

  it('centres a page taller than its view, with bars at the sides', () => {
    expect(fitFrame({ width: 400, height: 400 }, { width: 400, height: 800 })).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 400,
    })
  })

  it('has no room for an empty page or view', () => {
    expect(fitFrame({ width: 0, height: 10 }, { width: 800, height: 600 })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
    expect(fitFrame({ width: 10, height: 10 }, { width: 0, height: 600 }).width).toBe(0)
  })
})

describe('toPagePoint', () => {
  const fit = { x: 0, y: 100, width: 400, height: 200 }
  const page = { width: 800, height: 400 }

  it('scales a point on the shown frame to the page', () => {
    expect(toPagePoint({ x: 200, y: 150 }, fit, page)).toEqual({ x: 400, y: 100 })
  })

  it('has no page point in the bars around the frame', () => {
    expect(toPagePoint({ x: 200, y: 50 }, fit, page)).toBeNull()
    expect(toPagePoint({ x: 200, y: 301 }, fit, page)).toBeNull()
    expect(toPagePoint({ x: 1, y: 150 }, { ...fit, width: 0 }, page)).toBeNull()
  })
})

describe('viewBoxOf', () => {
  it('draws a page box on the shown frame', () => {
    const fit = { x: 0, y: 100, width: 400, height: 200 }
    expect(
      viewBoxOf(
        { x: 400, y: 100, width: 80, height: 40 },
        { x: 0, y: 0 },
        meta({ deviceWidth: 800, deviceHeight: 400 }),
        fit,
      ),
    ).toEqual({ x: 200, y: 150, width: 40, height: 20 })
  })

  it('moves a box with the page as it scrolls', () => {
    const fit = { x: 0, y: 0, width: 800, height: 600 }
    expect(
      viewBoxOf(
        { x: 10, y: 300, width: 5, height: 5 },
        { x: 0, y: 100 },
        meta({ scrollOffsetY: 250 }),
        fit,
      ),
    ).toEqual({ x: 10, y: 150, width: 5, height: 5 })
  })

  it('draws nothing before the page has a size', () => {
    const fit = { x: 0, y: 0, width: 0, height: 0 }
    expect(
      viewBoxOf(
        { x: 10, y: 10, width: 5, height: 5 },
        { x: 0, y: 0 },
        meta({ deviceWidth: 0 }),
        fit,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  })
})

describe('boxBetween and isMarkable', () => {
  it('spans two corners whichever way the drag went', () => {
    expect(boxBetween({ x: 50, y: 40 }, { x: 10, y: 100 })).toEqual({
      x: 10,
      y: 40,
      width: 40,
      height: 60,
    })
  })

  it('counts a drag as an area only once it is big enough both ways', () => {
    expect(isMarkable({ x: 0, y: 0, width: 40, height: 6 })).toBe(true)
    expect(isMarkable({ x: 0, y: 0, width: 40, height: 5 })).toBe(false)
    expect(isMarkable({ x: 0, y: 0, width: 5, height: 40 })).toBe(false)
  })
})

describe('pickRing', () => {
  it('rings the point pressed', () => {
    expect(pickRing({ x: 100, y: 50 })).toEqual({ x: 92, y: 42, width: 16, height: 16 })
  })
})

describe('keyInput', () => {
  const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) =>
    keyInput({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods })

  it('types a character as text', () => {
    expect(key('a')).toEqual({ kind: 'text', text: 'a' })
    expect(key(' ')).toEqual({ kind: 'text', text: ' ' })
  })

  it('sends named keys by name', () => {
    expect(key('Enter')).toEqual({ kind: 'key', key: 'Enter' })
    expect(key('ArrowDown')).toEqual({ kind: 'key', key: 'ArrowDown' })
  })

  it('sends a chord with its modifiers', () => {
    expect(key('a', { ctrlKey: true })).toEqual({ kind: 'key', key: 'Control+a' })
    expect(key('Enter', { metaKey: true, altKey: true })).toEqual({
      kind: 'key',
      key: 'Meta+Alt+Enter',
    })
  })

  it('sends nothing for a modifier alone or a key it does not know', () => {
    expect(key('Shift')).toBeNull()
    expect(key('Control', { ctrlKey: true })).toBeNull()
    expect(key('F13')).toBeNull()
  })
})

describe('note wording', () => {
  it('reads the last step of a selector', () => {
    expect(shortSelector('div.plan.plan--team > a.plan-cta')).toBe('a.plan-cta')
    expect(shortSelector('main  section   h1')).toBe('h1')
    expect(shortSelector('#save')).toBe('#save')
  })

  it('titles a pick and an area by their number', () => {
    expect(noteTitle(note(), 1)).toBe('Pick 1')
    expect(noteTitle(note({ kind: 'mark' }), 2)).toBe('Area 2')
  })

  it('says where a note is: its element or size, and the page', () => {
    expect(noteWhere(note())).toBe('acme.dev/pricing')
    expect(
      noteWhere(
        note({
          target: { kind: 'element', selector: 'div.plan > a.plan-cta', outerHtml: '<a/>' },
        }),
      ),
    ).toBe('a.plan-cta · acme.dev/pricing')
    expect(
      noteWhere(note({ kind: 'mark', box: { x: 0, y: 0, width: 761.6, height: 227.2 } })),
    ).toBe('762 × 227 · acme.dev/pricing')
  })

  it('labels a staged note by its selector or its area', () => {
    expect(noteLabel(note())).toBe('acme.dev/pricing')
    expect(
      noteLabel(note({ target: { kind: 'element', selector: 'div > a', outerHtml: '<a/>' } })),
    ).toBe('div > a')
    expect(noteLabel(note({ kind: 'mark', box: { x: 0, y: 0, width: 640, height: 210 } }))).toBe(
      'Area 640 × 210',
    )
  })
})

describe('toChatAppNote', () => {
  it('makes an app note of a note whose target came back', () => {
    const target = { kind: 'element' as const, selector: 'a', outerHtml: '<a/>' }
    expect(
      toChatAppNote(note({ target, comment: 'Fill it', screenshotFile: 'shot.png' }), 'p1'),
    ).toEqual({
      id: 'n1',
      projectId: 'p1',
      params: { url: 'https://acme.dev/pricing' },
      comment: 'Fill it',
      targets: [target],
      screenshotFile: 'shot.png',
    })
  })

  it('leaves out a screenshot it does not have', () => {
    const target = {
      kind: 'area' as const,
      rect: { x: 0, y: 0, width: 1, height: 1, space: 'app-viewport' as const },
    }
    expect(toChatAppNote(note({ target }), 'p1')).not.toHaveProperty('screenshotFile')
  })

  it('has nothing while the target is still on its way', () => {
    expect(toChatAppNote(note(), 'p1')).toBeNull()
  })
})

describe('shownSession and driverOf', () => {
  it('finds the shown browser', () => {
    expect(shownSession(state({ sessions: [PERSON, AGENT], shownId: 'agent' }))).toBe(AGENT)
    expect(shownSession(state({ sessions: [PERSON], shownId: 'gone' }))).toBeUndefined()
  })

  it('has the agent drive its own browser until the person takes over', () => {
    expect(driverOf(state({ sessions: [AGENT], shownId: 'agent' }))).toBe('agent')
    expect(driverOf(state({ sessions: [AGENT], shownId: 'agent', takenOver: true }))).toBe('person')
    expect(driverOf(state({ sessions: [PERSON], shownId: 'mine' }))).toBe('person')
    expect(driverOf(state({}))).toBe('person')
  })
})

describe('canGoBack and canGoForward', () => {
  it('reads where in its history the browser is', () => {
    const history = ['https://a.dev/', 'https://b.dev/']
    expect(canGoBack(state({ history, historyAt: 1 }))).toBe(true)
    expect(canGoForward(state({ history, historyAt: 1 }))).toBe(false)
    expect(canGoBack(state({ history, historyAt: 0 }))).toBe(false)
    expect(canGoForward(state({ history, historyAt: 0 }))).toBe(true)
    expect(canGoBack(state({}))).toBe(false)
    expect(canGoForward(state({}))).toBe(false)
  })
})
