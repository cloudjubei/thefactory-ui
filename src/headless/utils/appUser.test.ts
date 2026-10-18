import { describe, expect, it } from 'vitest'
import { currentUserFromCredentials } from './appUser'
import type { AppUserCredential } from './appUserTypes'

const pat: AppUserCredential = {
  name: 'Work PAT',
  username: 'kc-work',
  email: 'kc@work.example',
  tokenSource: 'pat',
}
const oauth: AppUserCredential = {
  name: 'GitHub OAuth (kamilch)',
  username: 'kamilch',
  email: 'kamil@example.com',
  tokenSource: 'oauth',
}

describe('currentUserFromCredentials', () => {
  it('answers the connected GitHub account, named by its login, before any token', () => {
    expect(currentUserFromCredentials([pat, oauth])).toEqual({
      name: 'kamilch',
      username: 'kamilch',
      email: 'kamil@example.com',
    })
  })

  it('answers the first credential that names someone when no account is connected', () => {
    const legacy: AppUserCredential = { name: '', username: '', email: '' }
    expect(currentUserFromCredentials([legacy, pat])).toEqual({
      name: 'kc-work',
      username: 'kc-work',
      email: 'kc@work.example',
    })
  })

  it("falls back to the credential's label when it has no username, and leaves out empty fields", () => {
    expect(currentUserFromCredentials([{ name: ' Kamil ', username: ' ', email: '' }])).toEqual({
      name: 'Kamil',
    })
  })

  it('skips a connected account that names no one', () => {
    expect(currentUserFromCredentials([{ ...oauth, name: '', username: '' }, pat])?.name).toBe(
      'kc-work',
    )
  })

  it('answers null when no credential names anyone', () => {
    expect(currentUserFromCredentials([])).toBeNull()
    expect(currentUserFromCredentials([{ name: '', username: '', email: 'a@b' }])).toBeNull()
  })
})
