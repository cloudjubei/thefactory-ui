import { describe, it, expect } from 'vitest'
import { sanitizeRepoName, githubRepoReadiness } from './useProjectGithubRepo'

describe('sanitizeRepoName', () => {
  it('lowercases and keeps valid GitHub repo characters', () => {
    expect(sanitizeRepoName('Car-Buyer_Helper.v2')).toBe('car-buyer_helper.v2')
  })

  it('collapses runs of invalid characters into a single hyphen', () => {
    expect(sanitizeRepoName('My Cool  Project!!')).toBe('my-cool-project')
  })

  it('trims leading/trailing separators', () => {
    expect(sanitizeRepoName('--.hello.--')).toBe('hello')
  })

  it('caps the length at 100 characters', () => {
    expect(sanitizeRepoName('a'.repeat(150))).toHaveLength(100)
  })

  it('returns an empty string when nothing usable remains', () => {
    expect(sanitizeRepoName('!!!')).toBe('')
  })
})

describe('githubRepoReadiness', () => {
  it('is not ready and not blocking when the option is off', () => {
    expect(githubRepoReadiness({ enabled: false, connected: true, repoName: 'x', status: 'available' })).toEqual({
      ready: false,
      validationError: undefined,
    })
  })

  it('is ready only when connected with a non-empty, non-taken name', () => {
    expect(
      githubRepoReadiness({ enabled: true, connected: true, repoName: 'carbuyer', status: 'available' }).ready,
    ).toBe(true)
    // an unchecked-but-present name is still submittable (backend re-validates)
    expect(
      githubRepoReadiness({ enabled: true, connected: true, repoName: 'carbuyer', status: 'unknown' }).ready,
    ).toBe(true)
  })

  it('blocks when enabled but not connected', () => {
    const r = githubRepoReadiness({ enabled: true, connected: false, repoName: 'x', status: 'unknown' })
    expect(r.ready).toBe(false)
    expect(r.validationError).toMatch(/connect a github account/i)
  })

  it('blocks when enabled + connected but the name is empty', () => {
    const r = githubRepoReadiness({ enabled: true, connected: true, repoName: '  ', status: 'unknown' })
    expect(r.ready).toBe(false)
    expect(r.validationError).toMatch(/name is required/i)
  })

  it('blocks when the name is taken', () => {
    const r = githubRepoReadiness({ enabled: true, connected: true, repoName: 'taken', status: 'taken' })
    expect(r.ready).toBe(false)
    expect(r.validationError).toMatch(/already taken/i)
  })

  it('blocks (connect first) while the connection is still resolving', () => {
    const r = githubRepoReadiness({ enabled: true, connected: null, repoName: 'x', status: 'checking' })
    expect(r.ready).toBe(false)
    expect(r.validationError).toMatch(/connect a github account/i)
  })
})
