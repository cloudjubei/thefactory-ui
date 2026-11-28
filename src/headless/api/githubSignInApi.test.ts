import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'

const sdk = vi.hoisted(() => ({
  startGitCredentialGithubSignIn: vi.fn(),
  startOverseerGithubSignIn: vi.fn(),
  readOverseerGithubSignIn: vi.fn(),
  listSignInSessions: vi.fn(),
  closeSignInSession: vi.fn(),
  sendSignInSessionInput: vi.fn(),
  resizeSignInSession: vi.fn(),
  answerSignInSession: vi.fn(),
}))

vi.mock('./generated', () => sdk)

import { githubSignInActions } from './githubSignInApi'

const SESSION: SignInSessionState = {
  id: 's/1',
  kind: 'github',
  subject: 'bootstrap',
  title: 'Sign in to GitHub',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
}

beforeEach(() => {
  for (const call of Object.values(sdk)) call.mockReset()
  sdk.startGitCredentialGithubSignIn.mockResolvedValue({ data: { session: SESSION } })
  sdk.startOverseerGithubSignIn.mockResolvedValue({ data: { session: SESSION } })
  sdk.readOverseerGithubSignIn.mockResolvedValue({ data: { tokenId: 'tok-1' } })
  sdk.listSignInSessions.mockResolvedValue({ data: { sessions: [SESSION] } })
})

describe('githubSignInActions', () => {
  it('opens a git credential sign-in under the label typed when it is pressed', async () => {
    let label = ''
    const actions = githubSignInActions('git-credential', () => label)
    label = '  Work  '
    expect(await actions.start()).toEqual(SESSION)
    expect(sdk.startGitCredentialGithubSignIn).toHaveBeenCalledWith({
      body: { scopeLabel: 'Work' },
      throwOnError: true,
    })
    expect(actions.finish).toBeUndefined()
  })

  it('sends no label when none is typed, or none is asked for', async () => {
    await githubSignInActions('git-credential', () => '   ').start()
    await githubSignInActions('git-credential').start()
    expect(sdk.startGitCredentialGithubSignIn.mock.calls).toEqual([
      [{ body: {}, throwOnError: true }],
      [{ body: {}, throwOnError: true }],
    ])
  })

  it('opens the overseer’s sign-in and reads the token it left by its session', async () => {
    const actions = githubSignInActions('bootstrap')
    expect(await actions.start()).toEqual(SESSION)
    expect(sdk.startOverseerGithubSignIn).toHaveBeenCalledWith({ throwOnError: true })
    expect(await actions.finish?.('s/1')).toBe('tok-1')
    expect(sdk.readOverseerGithubSignIn).toHaveBeenCalledWith({
      path: { sessionId: 's/1' },
      throwOnError: true,
    })
  })

  it('reads the open sessions through the sign-in session routes', async () => {
    expect(await githubSignInActions('bootstrap').listOpen()).toEqual([SESSION])
    expect(sdk.listSignInSessions).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('lets a refusal throw to its caller', async () => {
    sdk.startOverseerGithubSignIn.mockRejectedValue(new Error('503'))
    await expect(githubSignInActions('bootstrap').start()).rejects.toThrow('503')
  })
})
