import { describe, expect, it } from 'vitest'

import { isGitRefUnavailableResponse } from './helpers'

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
