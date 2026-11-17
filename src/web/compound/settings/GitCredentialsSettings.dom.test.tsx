import { act, cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GitCredentialsProvider,
  useGitCredentials,
} from '../../../headless/contexts/GitCredentialsContext'
import GitCredentialsSettings from './GitCredentialsSettings'
import {
  clearGitReauthorization,
  recordGitReauthorization,
} from '../../../headless/api/gitCredentialReauthorization'

const api = vi.hoisted(() => ({
  listGitCredentials: vi.fn(),
  updateGitCredential: vi.fn(),
  deleteGitCredential: vi.fn(),
  ws: { on: vi.fn(() => () => {}) },
}))
vi.mock('../../../headless/api', async (original) => ({
  ...(await original<typeof import('../../../headless/api')>()),
  useApi: () => ({ ws: api.ws }),
}))
vi.mock('../../../headless/api/AuthContext', () => ({ useAuth: () => ({ token: 'app-token' }) }))
vi.mock('../../../headless/api/generated', async (original) => ({
  ...(await original<typeof import('../../../headless/api/generated')>()),
  ...api,
}))

const credentials = ['one', 'two'].map((id) => ({
  id,
  name: id,
  username: id,
  email: `${id}@example.com`,
  host: 'github.com',
  hasToken: true,
}))
const refused = (id: string) => ({
  response: { status: 401, data: { reason: 're-authorize', credentialId: id } },
})
let context: ReturnType<typeof useGitCredentials>
function Controls() {
  context = useGitCredentials()
  return <GitCredentialsSettings hostCapabilities={{ canRedirect: false, canOpenBrowser: true }} />
}

beforeEach(() => {
  clearGitReauthorization()
  api.listGitCredentials.mockResolvedValue({ data: credentials })
  api.updateGitCredential.mockResolvedValue({ data: credentials[0] })
  api.deleteGitCredential.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  clearGitReauthorization()
})

describe('git credential re-authorization', () => {
  it('marks only the refused row, persists on refresh/metadata edits, and clears on token replacement', async () => {
    render(
      <GitCredentialsProvider>
        <Controls />
      </GitCredentialsProvider>,
    )
    await screen.findByText('one@example.com')
    act(() => {
      recordGitReauthorization(refused('one'))
      recordGitReauthorization(refused('one'))
    })
    expect(screen.getAllByRole('button', { name: 'Re-authorize' })).toHaveLength(1)
    expect(
      within(screen.getByText('two@example.com').parentElement!).queryByRole('alert'),
    ).toBeNull()
    await act(() => context.refresh())
    await act(() => context.updateCredentials('one', { name: 'renamed' }))
    expect(screen.getByRole('button', { name: 'Re-authorize' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Re-authorize' }))
    expect(screen.getByText('Re-authorize: one')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeTruthy()
    expect(screen.getByText(/select them in projects/)).toBeTruthy()
    await act(() => context.updateCredentials('one', { token: 'replacement' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Re-authorize' })).toBeNull())
  })

  it('ignores unrelated/malformed responses and removes a deleted credential refusal', async () => {
    render(
      <GitCredentialsProvider>
        <Controls />
      </GitCredentialsProvider>,
    )
    await screen.findByText('one@example.com')
    act(() => {
      recordGitReauthorization({ response: { status: 401, data: { credentialId: 'one' } } })
      recordGitReauthorization({
        response: { status: 403, data: { reason: 're-authorize', credentialId: 'one' } },
      })
      recordGitReauthorization({ response: { status: 401, data: { reason: 're-authorize' } } })
    })
    expect(context.reauthorizeCredentialIds).toEqual([])
    act(() => recordGitReauthorization(refused('two')))
    await act(() => context.deleteCredentials('two'))
    expect(context.reauthorizeCredentialIds).toEqual([])
  })
})
