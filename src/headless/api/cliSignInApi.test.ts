import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import { startCliSignIn } from './cliSignInApi'

beforeEach(() => {
  client.post.mockReset()
})

describe('startCliSignIn', () => {
  it('starts a CLI agent’s sign-in and answers the session the app shows', async () => {
    const session = { id: 's1', kind: 'cli-login', status: 'open' }
    client.post.mockResolvedValue({ data: { session } })
    expect(
      await startCliSignIn({ cli: 'codex', label: 'Codex', credentialId: 'c1', captureId: 'cap' }),
    ).toEqual(session)
    expect(client.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/cli-auth/login',
        body: { cli: 'codex', label: 'Codex', credentialId: 'c1', captureId: 'cap' },
        throwOnError: true,
      }),
    )
  })

  it('sends no ids it was not given', async () => {
    client.post.mockResolvedValue({ data: { session: { id: 's2' } } })
    await startCliSignIn({ cli: 'claude-code', label: 'Claude' })
    expect(client.post.mock.calls[0]![0].body).toEqual({ cli: 'claude-code', label: 'Claude' })
  })
})
