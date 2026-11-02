import { describe, expect, it } from 'vitest'

import { gitHookRejection, isGitRefUnavailableResponse } from './helpers'

const httpError = (status: number, code?: string) => ({
  response: { status, data: { error: 'nope', ...(code ? { code } : {}) } },
})

describe('isGitRefUnavailableResponse', () => {
  it('is true when the server answers that git does not have the ref', () => {
    expect(isGitRefUnavailableResponse(httpError(409, 'GIT_REF_UNAVAILABLE'))).toBe(true)
  })

  it('is false for any other server answer', () => {
    expect(isGitRefUnavailableResponse(httpError(409, 'GIT_CREDENTIAL_ERROR'))).toBe(false)
    expect(isGitRefUnavailableResponse(httpError(500))).toBe(false)
  })

  it('is false for a value that is not a server answer', () => {
    expect(isGitRefUnavailableResponse(new Error('GIT_REF_UNAVAILABLE'))).toBe(false)
    expect(isGitRefUnavailableResponse(undefined)).toBe(false)
  })
})

describe('gitHookRejection', () => {
  it('reads what the hook printed when a commit hook stopped the commit', () => {
    const answer = {
      response: { status: 422, data: { error: 'src/a.ts error', code: 'GIT_HOOK_REJECTED' } },
    }
    expect(gitHookRejection(answer)).toBe('src/a.ts error')
  })

  it('is undefined for any other failure', () => {
    expect(gitHookRejection(httpError(500))).toBeUndefined()
    expect(gitHookRejection(httpError(401, 'GIT_CREDENTIAL_ERROR'))).toBeUndefined()
    expect(gitHookRejection(new Error('GIT_HOOK_REJECTED'))).toBeUndefined()
  })
})
