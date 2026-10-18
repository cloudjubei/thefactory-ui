import { describe, it, expect } from 'vitest'
import {
  appDeepLinkFromParams,
  appDeepLinkParamsPatch,
  appDeepLinkQuery,
  navCurrentReply,
  parseAppDeepLink,
  serializeAppDeepLink,
  shouldPushDeepLink,
} from './appDeepLink'

describe('appDeepLinkFromParams', () => {
  it('returns undefined when there is no view param', () => {
    expect(appDeepLinkFromParams({ projectId: 'p1', tab: 'app' })).toBeUndefined()
    expect(appDeepLinkFromParams({})).toBeUndefined()
  })

  it('extracts the view and the non-route deep-link params', () => {
    expect(appDeepLinkFromParams({ view: 'runs', run: 'r1' })).toEqual({
      view: 'runs',
      params: { run: 'r1' },
    })
  })

  it('drops route/path params (projectId, tab) that mobile merges in', () => {
    expect(
      appDeepLinkFromParams({
        projectId: 'p1',
        tab: 'app',
        view: 'xai',
        scope: 'all',
        focus: 'r9',
      }),
    ).toEqual({ view: 'xai', params: { scope: 'all', focus: 'r9' } })
  })

  it('takes the first value when a param is an array (expo-router)', () => {
    expect(appDeepLinkFromParams({ view: ['runs'], run: ['r1', 'r2'] })).toEqual({
      view: 'runs',
      params: { run: 'r1' },
    })
  })

  it('treats an empty view as absent', () => {
    expect(appDeepLinkFromParams({ view: '' })).toBeUndefined()
    expect(appDeepLinkFromParams({ view: [] })).toBeUndefined()
  })

  it('returns an empty params object when only a view is present', () => {
    expect(appDeepLinkFromParams({ view: 'papers' })).toEqual({ view: 'papers', params: {} })
  })
})

describe('serializeAppDeepLink', () => {
  it('is stable regardless of param insertion order', () => {
    const a = serializeAppDeepLink({ view: 'runs', params: { run: 'r1', scope: 'all' } })
    const b = serializeAppDeepLink({ view: 'runs', params: { scope: 'all', run: 'r1' } })
    expect(a).toBe(b)
    expect(a).toBe('runs&run=r1&scope=all')
  })
  it('distinguishes different views / params', () => {
    expect(serializeAppDeepLink({ view: 'runs', params: { run: 'r1' } })).not.toBe(
      serializeAppDeepLink({ view: 'runs', params: { run: 'r2' } }),
    )
    expect(serializeAppDeepLink({ view: 'runs', params: {} })).not.toBe(
      serializeAppDeepLink({ view: 'papers', params: {} }),
    )
  })
  it('serializes null/undefined/viewless to the empty key', () => {
    expect(serializeAppDeepLink(null)).toBe('')
    expect(serializeAppDeepLink(undefined)).toBe('')
    expect(serializeAppDeepLink({ view: '', params: {} })).toBe('')
  })
})

describe('shouldPushDeepLink', () => {
  it('never pushes on the mount/remount baseline (prev === null)', () => {
    expect(shouldPushDeepLink(null, 'runs&run=r1')).toBe(false)
    expect(shouldPushDeepLink(null, '')).toBe(false)
  })
  it('pushes only on a genuine same-mount change', () => {
    expect(shouldPushDeepLink('runs&run=r1', 'runs&run=r2')).toBe(true)
    expect(shouldPushDeepLink('', 'runs&run=r1')).toBe(true) // mounted with no link, then navigated
    expect(shouldPushDeepLink('runs&run=r1', 'runs&run=r1')).toBe(false) // unchanged re-render
  })
})

describe('parseAppDeepLink', () => {
  it('reads the view and its params as the app reports them', () => {
    expect(parseAppDeepLink({ view: 'sources', params: { tab: 'x', revision: 'r3' } })).toEqual({
      view: 'sources',
      params: { revision: 'r3' },
    })
  })

  it('turns number and boolean params into strings and drops the rest', () => {
    expect(
      parseAppDeepLink({
        view: 'field',
        params: { turn: 4, open: true, nested: { a: 1 }, none: null, list: ['a'] },
      }),
    ).toEqual({ view: 'field', params: { turn: '4', open: 'true' } })
  })

  it('reads a view with no params', () => {
    expect(parseAppDeepLink({ view: 'home' })).toEqual({ view: 'home', params: {} })
  })

  it.each([null, undefined, 'sources', [], {}, { view: '' }, { view: '  ' }, { view: 3 }])(
    'returns null for %j',
    (payload) => {
      expect(parseAppDeepLink(payload)).toBeNull()
    },
  )

  it('drops a view param the app repeats inside its params', () => {
    expect(parseAppDeepLink({ view: 'a', params: { view: 'b', k: 'v' } })).toEqual({
      view: 'a',
      params: { k: 'v' },
    })
  })
})

describe('appDeepLinkQuery', () => {
  it('encodes a deep-link the way appDeepLinkFromParams reads it back', () => {
    const dl = { view: 'sources', params: { revision: 'r3', q: 'a b' } }
    const query = appDeepLinkQuery(dl)
    expect(query).toEqual({ view: 'sources', revision: 'r3', q: 'a b' })
    expect(appDeepLinkFromParams(query)).toEqual(dl)
  })

  it('never writes a route param the read would drop', () => {
    expect(appDeepLinkQuery({ view: 'v', params: { projectId: 'x', tab: 'y', k: '1' } })).toEqual({
      view: 'v',
      k: '1',
    })
  })
})

describe('appDeepLinkParamsPatch', () => {
  it('sets the new deep-link and clears the old params, leaving route params alone', () => {
    expect(
      appDeepLinkParamsPatch(
        { projectId: 'p1', tab: 'app', view: 'field', turn: '4', stale: ['x'] },
        { view: 'sources', params: { revision: 'r3' } },
      ),
    ).toEqual({ view: 'sources', revision: 'r3', turn: undefined, stale: undefined })
  })

  it('needs no clearing on a first deep-link', () => {
    expect(appDeepLinkParamsPatch({ projectId: 'p1' }, { view: 'home', params: {} })).toEqual({
      view: 'home',
    })
  })
})

describe('navCurrentReply', () => {
  const appUrl = 'http://localhost:5173/projects/p1/app?view=sources'

  it('answers the deep-link with the app URL beside it', () => {
    expect(navCurrentReply({ view: 'sources', params: { r: '1' } }, appUrl)).toEqual({
      view: 'sources',
      params: { r: '1' },
      appUrl,
    })
  })

  it('answers only the app URL when there is no deep-link', () => {
    expect(navCurrentReply(null, appUrl)).toEqual({ appUrl })
    expect(navCurrentReply(undefined, appUrl)).toEqual({ appUrl })
  })
})
