import { describe, expect, it } from 'vitest'

import { gitHookRejection, isGitRefUnavailableResponse, videoMarkRefusal } from './helpers'

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

describe('videoMarkRefusal', () => {
  it('reads why the backend refused a send over one of its marks', () => {
    const reason = 'This video is 00:16 long (16 s), so there is nothing at 21 s to mark.'
    const answer = {
      response: { status: 400, data: { error: reason, code: 'VIDEO_MARK_REFUSED' } },
    }
    expect(videoMarkRefusal(answer)).toBe(reason)
  })

  it('is undefined for any other failure', () => {
    expect(videoMarkRefusal(httpError(400))).toBeUndefined()
    expect(videoMarkRefusal(httpError(500, 'INTERNAL_ERROR'))).toBeUndefined()
    expect(videoMarkRefusal(new Error('VIDEO_MARK_REFUSED'))).toBeUndefined()
  })
})
