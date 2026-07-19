import { describe, it, expect } from 'vitest'
import {
  appDeepLinkFromParams,
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
      appDeepLinkFromParams({ projectId: 'p1', tab: 'app', view: 'xai', scope: 'all', focus: 'r9' }),
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
