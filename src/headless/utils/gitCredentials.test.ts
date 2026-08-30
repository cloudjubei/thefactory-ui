import { describe, expect, it } from 'vitest'
import { formatGitCredentialHost, normalizeGitCredentialHost } from './gitCredentials'
import { GIT_CREDENTIAL_HOST_UNKNOWN } from './gitCredentialConstants'

describe('normalizeGitCredentialHost', () => {
  it('returns a bare host unchanged', () => {
    expect(normalizeGitCredentialHost('dev.azure.com')).toBe('dev.azure.com')
  })

  it('returns undefined for a non-string, so nothing is written for a blank field', () => {
    expect(normalizeGitCredentialHost(undefined)).toBeUndefined()
  })

  it('returns undefined for whitespace only', () => {
    expect(normalizeGitCredentialHost('   ')).toBeUndefined()
  })

  it('reduces a pasted remote URL to its host', () => {
    expect(normalizeGitCredentialHost('https://dev.azure.com/acme/proj/_git/repo')).toBe(
      'dev.azure.com',
    )
  })

  it('never persists a token pasted inside the URL', () => {
    expect(
      normalizeGitCredentialHost('https://octocat:ghp_secret@github.com/o/r.git'),
    ).not.toContain('ghp_secret')
  })

  it('lowercases the host', () => {
    expect(normalizeGitCredentialHost('GitHub.COM')).toBe('github.com')
  })
})

describe('formatGitCredentialHost', () => {
  it('returns a bare host unchanged', () => {
    expect(formatGitCredentialHost('dev.azure.com')).toBe('dev.azure.com')
  })

  it('falls back to the unknown label when the field is absent', () => {
    expect(formatGitCredentialHost(undefined)).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })

  it('falls back to the unknown label when the field is null', () => {
    expect(formatGitCredentialHost(null)).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })

  it('falls back to the unknown label for an empty string', () => {
    expect(formatGitCredentialHost('')).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })

  it('falls back to the unknown label for whitespace only', () => {
    expect(formatGitCredentialHost('   ')).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })

  it('never renders "undefined" as a host', () => {
    expect(formatGitCredentialHost(undefined)).not.toContain('undefined')
  })

  it('drops a scheme', () => {
    expect(formatGitCredentialHost('https://dev.azure.com')).toBe('dev.azure.com')
  })

  it('drops the path', () => {
    expect(formatGitCredentialHost('https://dev.azure.com/acme/proj/_git/repo')).toBe(
      'dev.azure.com',
    )
  })

  it('drops a query string', () => {
    expect(formatGitCredentialHost('github.com?x=1')).toBe('github.com')
  })

  it('drops a fragment', () => {
    expect(formatGitCredentialHost('github.com#frag')).toBe('github.com')
  })

  it('drops embedded userinfo so a token in the field is never rendered', () => {
    expect(formatGitCredentialHost('https://octocat:ghp_secret@github.com/o/r.git')).toBe(
      'github.com',
    )
  })

  it('keeps an explicit port — it is part of the host identity', () => {
    expect(formatGitCredentialHost('gitlab.internal:8443')).toBe('gitlab.internal:8443')
  })

  it('drops an scp-style path that follows the colon', () => {
    expect(formatGitCredentialHost('git@github.com:owner/repo.git')).toBe('github.com')
  })

  it('lowercases the host', () => {
    expect(formatGitCredentialHost('GitHub.COM')).toBe('github.com')
  })

  it('trims surrounding whitespace', () => {
    expect(formatGitCredentialHost('  github.com  ')).toBe('github.com')
  })

  it('falls back to the unknown label when only a scheme was stored', () => {
    expect(formatGitCredentialHost('https://')).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })

  it('falls back to the unknown label when the value is only a path', () => {
    expect(formatGitCredentialHost('/acme/proj')).toBe(GIT_CREDENTIAL_HOST_UNKNOWN)
  })
})
