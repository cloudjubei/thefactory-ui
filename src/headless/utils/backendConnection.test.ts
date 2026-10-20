import { describe, expect, it } from 'vitest'
import { backendTestCandidate, backendTestLine, normalizeBackendUrl } from './backendConnection'

describe('normalizeBackendUrl', () => {
  it('trims spaces and trailing slashes', () => {
    expect(normalizeBackendUrl('  http://host:7001///  ')).toBe('http://host:7001')
  })

  it('keeps a path without its trailing slash', () => {
    expect(normalizeBackendUrl('https://host/api/')).toBe('https://host/api')
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeBackendUrl('   ')).toBe('')
  })
})

describe('backendTestCandidate', () => {
  it('tests the URL being typed when there is one', () => {
    expect(backendTestCandidate(' http://next:1/ ', 'http://current:2')).toBe('http://next:1')
  })

  it('falls back to the saved URL while nothing is typed', () => {
    expect(backendTestCandidate('  ', 'http://current:2')).toBe('http://current:2')
  })

  it('has nothing to test with neither', () => {
    expect(backendTestCandidate('', null)).toBeNull()
    expect(backendTestCandidate('', '')).toBeNull()
  })
})

describe('backendTestLine', () => {
  it('says nothing before a test or while one runs', () => {
    expect(backendTestLine({ kind: 'idle' })).toBeNull()
    expect(backendTestLine({ kind: 'testing' })).toBeNull()
  })

  it('names the version and rounded uptime when the backend answers', () => {
    expect(backendTestLine({ kind: 'ok', version: '1.4.0', uptime: 61.6 })).toEqual({
      tone: 'ok',
      text: 'Reachable: version 1.4.0, uptime 62s.',
    })
  })

  it('passes the failure message through', () => {
    expect(backendTestLine({ kind: 'error', message: 'Could not reach the backend.' })).toEqual({
      tone: 'error',
      text: 'Could not reach the backend.',
    })
  })
})
