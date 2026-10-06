import { describe, expect, it } from 'vitest'
import { captureHelp } from './credentialCaptureHelp'
import { emptyCaptureForm } from './credentialCaptures'
import type { CredentialCapture, CredentialCaptureFormValues } from './credentialCaptureTypes'

function capture(overrides: Partial<CredentialCapture> = {}): CredentialCapture {
  return {
    id: 'cap-1',
    purpose: 'Connect Jira',
    provider: 'ticket-connection',
    status: 'requested',
    requestedAt: '2026-10-05T10:00:00.000Z',
    ...overrides,
  }
}

const helpFor = (c: CredentialCapture, over: CredentialCaptureFormValues = {}) =>
  captureHelp(c, { ...emptyCaptureForm(c), ...over })

describe('captureHelp — a ticket connection', () => {
  const jira = capture({ preset: 'jira' })

  it('sends a Jira user to the Atlassian API-token page', () => {
    expect(helpFor(jira)?.link?.url).toBe(
      'https://id.atlassian.com/manage-profile/security/api-tokens',
    )
  })

  it('steers them off the scoped token, which this connection cannot use', () => {
    expect(helpFor(jira)?.steps.join(' ')).toMatch(/not "Create API token with scopes"/)
  })

  it('also explains the account email and the site URL the form asks for', () => {
    const steps = helpFor(jira)?.steps.join(' ') ?? ''
    expect(steps).toMatch(/Account email/)
    expect(steps).toMatch(/Site URL/)
    expect(steps).toMatch(/atlassian\.net/)
  })

  it('follows the tracker the user picks, not the one the agent named', () => {
    const github = helpFor(jira, { provider: 'github' })
    expect(github?.title).toMatch(/GitHub/)
    expect(github?.link?.url).toMatch(/^https:\/\/github\.com\//)
    expect(github?.steps.join(' ')).toMatch(/Issues/)
  })
})

describe('captureHelp — git credentials', () => {
  const git = capture({ provider: 'git', preset: undefined })

  it('defaults to GitHub, asking for repository contents read and write', () => {
    const help = helpFor(git)
    expect(help?.link?.url).toMatch(/^https:\/\/github\.com\//)
    expect(help?.steps.join(' ')).toMatch(/Contents "Read and write"/)
  })

  it('treats an explicit github.com host as GitHub too', () => {
    expect(helpFor(git, { host: ' github.com ' })?.title).toBe(helpFor(git)?.title)
  })

  it('switches to GitLab for a GitLab host', () => {
    const help = helpFor(git, { host: 'gitlab.com' })
    expect(help?.link?.url).toMatch(/^https:\/\/gitlab\.com\//)
    expect(help?.steps.join(' ')).toMatch(/write_repository/)
  })

  it('walks an Azure DevOps user through their organisation’s settings, with no shared link', () => {
    const help = helpFor(git, { host: 'dev.azure.com' })
    expect(help?.link).toBeUndefined()
    expect(help?.steps.join(' ')).toMatch(/Personal access tokens/)
  })

  it('still says what to create on a host it has no steps for', () => {
    const help = helpFor(git, { host: 'git.example.com' })
    expect(help?.link).toBeUndefined()
    expect(help?.steps.join(' ')).toMatch(/git\.example\.com/)
  })
})

describe('captureHelp — keys', () => {
  it.each([
    ['tavily', 'https://app.tavily.com'],
    ['exa', 'https://dashboard.exa.ai/api-keys'],
    ['serpapi', 'https://serpapi.com/manage-api-key'],
  ])('links a %s web-search key to where it is issued', (provider, url) => {
    const web = capture({ provider: 'web-search-key', preset: provider })
    expect(helpFor(web)?.link?.url).toBe(url)
  })

  it.each([
    ['openai', 'https://platform.openai.com/api-keys'],
    ['anthropic', 'https://console.anthropic.com/settings/keys'],
    ['gemini', 'https://aistudio.google.com/app/apikey'],
  ])('links a %s LLM key to its console', (provider, url) => {
    const llm = capture({ provider: 'llm-key', preset: provider })
    expect(helpFor(llm)?.link?.url).toBe(url)
  })

  it('still guides a provider it has no page for, without inventing a link', () => {
    const llm = capture({ provider: 'llm-key', preset: 'custom' })
    const help = helpFor(llm)
    expect(help?.link).toBeUndefined()
    expect(help?.steps.join(' ')).toMatch(/API URL override/)
  })
})

describe('captureHelp — every link and step', () => {
  const all = [
    helpFor(capture({ preset: 'jira' })),
    helpFor(capture({ preset: 'jira' }), { provider: 'github' }),
    helpFor(capture({ provider: 'git' })),
    helpFor(capture({ provider: 'git' }), { host: 'gitlab.com' }),
    helpFor(capture({ provider: 'git' }), { host: 'dev.azure.com' }),
    helpFor(capture({ provider: 'web-search-key', preset: 'tavily' })),
    helpFor(capture({ provider: 'llm-key', preset: 'openai' })),
    helpFor(capture({ provider: 'llm-key', preset: 'xai' })),
    helpFor(capture({ provider: 'llm-key', preset: 'deepseek' })),
  ]

  it('opens over https only', () => {
    for (const help of all) if (help?.link) expect(help.link.url).toMatch(/^https:\/\//)
  })

  it('tells the user to copy the secret into the form, step by step', () => {
    for (const help of all) {
      expect(help?.steps.length).toBeGreaterThan(0)
      expect(help?.steps.join(' ')).toMatch(/[Cc]opy/)
    }
  })
})

describe('captureHelp — kinds that need no instructions', () => {
  it('offers none for a secret note — the user already holds the value', () => {
    const note = capture({ provider: 'project-note', preset: 'QA login', projectId: 'p1' })
    expect(helpFor(note)).toBeUndefined()
  })

  it('offers none for a CLI sign-in, whose card runs the sign-in itself', () => {
    const signIn = capture({ provider: 'cli-login', preset: 'codex' })
    expect(helpFor(signIn)).toBeUndefined()
  })
})
