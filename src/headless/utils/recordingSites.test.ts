import { describe, expect, it } from 'vitest'
import type { RecordingSiteState } from 'thefactory-tools/types'
import {
  recordingSignInNeeded,
  recordingSiteChangeOf,
  recordingSitesShown,
  recordingSitesView,
  recordingSitesWith,
} from './recordingSites'
import { RECORDING_SITES_TEXT } from './recordingSitesConstants'
import type { RecordingSitesSnapshot } from './recordingSitesTypes'

const NOW = Date.parse('2026-11-26T12:00:00.000Z')

const LOOM: RecordingSiteState = { id: 'loom', name: 'Loom', state: 'unknown', signingIn: false }
const FATHOM: RecordingSiteState = {
  id: 'fathom',
  name: 'Fathom',
  state: 'signed-in',
  signingIn: false,
  checkedAt: '2026-11-26T11:57:00.000Z',
}

const snapshot = (patch: Partial<RecordingSitesSnapshot> = {}): RecordingSitesSnapshot => ({
  sites: [LOOM, FATHOM],
  readError: undefined,
  starting: [],
  failed: {},
  ...patch,
})

describe('recordingSitesShown', () => {
  it('shows a site whose sign-in is on its way as signing in, the others as they are', () => {
    const shown = recordingSitesShown([LOOM, FATHOM], ['loom'])
    expect(shown).toEqual([{ ...LOOM, signingIn: true }, FATHOM])
    expect(shown?.[1]).toBe(FATHOM)
  })

  it('keeps the list itself while nothing is on its way, and nothing before the first read', () => {
    const sites = [LOOM, FATHOM]
    expect(recordingSitesShown(sites, [])).toBe(sites)
    expect(recordingSitesShown(sites, ['other'])).toBe(sites)
    const open = [{ ...LOOM, signingIn: true }, FATHOM]
    expect(recordingSitesShown(open, ['loom'])).toBe(open)
    expect(recordingSitesShown(undefined, ['loom'])).toBeUndefined()
  })
})

describe('recordingSitesWith', () => {
  it('puts a changed site in place of the one held, order kept', () => {
    const signedIn = { ...LOOM, state: 'signed-in' as const }
    expect(recordingSitesWith([LOOM, FATHOM], signedIn)).toEqual([signedIn, FATHOM])
  })

  it('adds a site not held yet, a first one included', () => {
    expect(recordingSitesWith([LOOM], FATHOM)).toEqual([LOOM, FATHOM])
    expect(recordingSitesWith(undefined, LOOM)).toEqual([LOOM])
  })
})

describe('recordingSignInNeeded', () => {
  it('is, for a site that is listed and has no sign-in going', () => {
    expect(recordingSignInNeeded([LOOM, FATHOM], 'loom')).toBe(true)
    expect(recordingSignInNeeded([LOOM, FATHOM], 'fathom')).toBe(true)
  })

  it('is not, while its window is open, for a site not listed, or before the first read', () => {
    expect(recordingSignInNeeded([{ ...LOOM, signingIn: true }], 'loom')).toBe(false)
    expect(recordingSignInNeeded([LOOM], 'fathom')).toBe(false)
    expect(recordingSignInNeeded(undefined, 'loom')).toBe(false)
  })
})

describe('recordingSiteChangeOf', () => {
  it('reads the site an event tells', () => {
    expect(recordingSiteChangeOf({ site: FATHOM })).toEqual(FATHOM)
    expect(recordingSiteChangeOf({ site: LOOM })).toEqual(LOOM)
  })

  it('leaves out what is not a site’s state', () => {
    expect(recordingSiteChangeOf({ site: { ...LOOM, checkedAt: 7, extra: true } })).toEqual(LOOM)
  })

  it('reads nothing from anything else', () => {
    expect(recordingSiteChangeOf(undefined)).toBeUndefined()
    expect(recordingSiteChangeOf('loom')).toBeUndefined()
    expect(recordingSiteChangeOf({})).toBeUndefined()
    expect(recordingSiteChangeOf({ site: [LOOM] })).toBeUndefined()
    expect(recordingSiteChangeOf({ site: { ...LOOM, id: '' } })).toBeUndefined()
    expect(recordingSiteChangeOf({ site: { ...LOOM, name: 3 } })).toBeUndefined()
    expect(recordingSiteChangeOf({ site: { ...LOOM, state: 'maybe' } })).toBeUndefined()
    expect(recordingSiteChangeOf({ site: { ...LOOM, signingIn: 'yes' } })).toBeUndefined()
  })
})

describe('recordingSitesView', () => {
  it('waits for the first read, then says why it failed', () => {
    expect(recordingSitesView(snapshot({ sites: undefined }), NOW)).toEqual({
      loading: true,
      sites: [],
    })
    expect(recordingSitesView(snapshot({ sites: undefined, readError: 'Offline.' }), NOW)).toEqual({
      loading: false,
      sites: [],
      readError: 'Offline.',
    })
  })

  it('offers a sign-in on a site not checked or signed out', () => {
    const view = recordingSitesView(
      snapshot({ sites: [LOOM, { ...FATHOM, state: 'signed-out' }] }),
      NOW,
    )
    expect(view.sites[0]).toEqual({
      id: 'loom',
      name: 'Loom',
      state: 'unknown',
      stateLabel: 'Not checked',
      tone: 'empty',
      signingIn: false,
      action: 'Sign in to Loom',
      primary: true,
    })
    expect(view.sites[1]).toMatchObject({
      state: 'signed-out',
      stateLabel: 'Signed out',
      tone: 'on_hold',
      action: 'Sign in to Fathom',
      primary: true,
      checked: 'Checked 3 minutes ago',
    })
  })

  it('says a signed-in site is, with signing in again beside it', () => {
    expect(recordingSitesView(snapshot(), NOW).sites[1]).toEqual({
      id: 'fathom',
      name: 'Fathom',
      state: 'signed-in',
      stateLabel: 'Signed in',
      tone: 'done',
      signingIn: false,
      action: 'Sign in again',
      primary: false,
      checked: 'Checked 3 minutes ago',
    })
  })

  it('shows a sign-in going on, whether asked for here or open already, with where the window is', () => {
    const asked = recordingSitesView(snapshot({ starting: ['loom'] }), NOW).sites[0]
    expect(asked).toEqual({
      id: 'loom',
      name: 'Loom',
      state: 'signing-in',
      stateLabel: 'Signing in…',
      tone: 'working',
      signingIn: true,
      action: 'Sign in to Loom',
      primary: true,
      hint: RECORDING_SITES_TEXT.windowOpen,
    })
    const open = recordingSitesView(snapshot({ sites: [{ ...FATHOM, signingIn: true }] }), NOW)
      .sites[0]
    expect(open).toMatchObject({ state: 'signing-in', signingIn: true, action: 'Sign in again' })
    expect(open).not.toHaveProperty('checked')
  })

  it('says why a site’s sign-in did not start, on its row only', () => {
    const view = recordingSitesView(snapshot({ failed: { loom: 'No browser here.' } }), NOW)
    expect(view.sites[0]).toMatchObject({ state: 'unknown', error: 'No browser here.' })
    expect(view.sites[1]).not.toHaveProperty('error')
  })

  it('leaves out a checked time it cannot read', () => {
    const view = recordingSitesView(snapshot({ sites: [{ ...FATHOM, checkedAt: 'soon' }] }), NOW)
    expect(view.sites[0]).not.toHaveProperty('checked')
  })

  it('keeps a read error beside sites already read', () => {
    const view = recordingSitesView(snapshot({ readError: 'Offline.' }), NOW)
    expect(view).toMatchObject({ loading: false, readError: 'Offline.' })
    expect(view.sites).toHaveLength(2)
  })
})
