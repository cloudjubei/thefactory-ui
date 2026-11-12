import { describe, expect, it, vi } from 'vitest'
import { credentialSettingsOpener, gitOpError } from './gitOpError'

describe('gitOpError', () => {
  it('marks a server answer coded GIT_CREDENTIAL_ERROR as a credential error', () => {
    const err = {
      response: { status: 401, data: { error: 'push rejected', code: 'GIT_CREDENTIAL_ERROR' } },
    }
    expect(gitOpError(err, 'push rejected')).toEqual({ message: 'push rejected', credential: true })
  })

  it('marks a git stderr that could not read a password, thrown as an Error', () => {
    const err = new Error(
      "git push origin dev failed: fatal: could not read Password for 'https://Perpetuating@dev.azure.com': terminal prompts disabled",
    )
    expect(gitOpError(err, err.message).credential).toBe(true)
  })

  it('marks a bare string carrying an authentication failure', () => {
    expect(gitOpError('remote: Authentication failed for repo', 'x').credential).toBe(true)
  })

  it('leaves an ordinary rejection as a plain error', () => {
    const err = {
      response: { status: 409, data: { error: '! [rejected] dev -> dev (non-fast-forward)' } },
    }
    expect(gitOpError(err, 'rejected')).toEqual({ message: 'rejected', credential: false })
  })

  it('leaves an empty or missing error as a plain error', () => {
    expect(gitOpError(undefined, 'Failed to push')).toEqual({
      message: 'Failed to push',
      credential: false,
    })
    expect(gitOpError({}, 'Failed to pull').credential).toBe(false)
  })

  it('keeps the message it is given, whatever the error says', () => {
    const err = new Error('Bad credentials')
    expect(gitOpError(err, 'Committed. The push failed.').message).toBe(
      'Committed. The push failed.',
    )
  })
})

describe('credentialSettingsOpener', () => {
  it('opens the settings for the given project', () => {
    const open = vi.fn()
    credentialSettingsOpener(open, 'p-1')?.()
    expect(open).toHaveBeenCalledWith('p-1')
  })

  it('is undefined when the host gave no way to open the settings', () => {
    expect(credentialSettingsOpener(undefined, 'p-1')).toBeUndefined()
  })

  it('is undefined while no project is active', () => {
    const open = vi.fn()
    expect(credentialSettingsOpener(open, undefined)).toBeUndefined()
    expect(credentialSettingsOpener(open, '')).toBeUndefined()
    expect(open).not.toHaveBeenCalled()
  })
})
