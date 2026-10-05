import { describe, expect, it } from 'vitest'
import {
  awaitingCaptures,
  belongsToChat,
  captureCardTitle,
  capturesBlockedOn,
  captureFields,
  captureToolName,
  cliSignInRequest,
  captureFormErrors,
  captureStatusDisplay,
  captureSubmitBody,
  emptyCaptureForm,
  isAwaitingUser,
  isCaptureFormValid,
  isCaptureSecretField,
  isCliSignInCapture,
  isCredentialCapture,
  upsertCapture,
} from './credentialCaptures'
import { CAPTURE_REPLACING_CARD_TITLE } from './credentialCaptureConstants'
import {
  CAPTURE_FIELD_REQUIRED,
  CREDENTIAL_CAPTURE_STATUS_DISPLAY,
} from './credentialCaptureConstants'
import type {
  CredentialCapture,
  CredentialCaptureFormValues,
  CredentialCaptureStatus,
} from './credentialCaptureTypes'

function capture(overrides: Partial<CredentialCapture> = {}): CredentialCapture {
  return {
    id: 'cap-1',
    purpose: 'Push the release branch',
    provider: 'git',
    status: 'requested',
    requestedAt: '2026-08-26T10:00:00.000Z',
    ...overrides,
  }
}

function form(overrides: Partial<CredentialCaptureFormValues> = {}): CredentialCaptureFormValues {
  return {
    name: 'GitHub — personal',
    username: 'octocat',
    email: 'octo@example.com',
    host: '',
    token: 'ghp_example',
    ...overrides,
  }
}

describe('isCredentialCapture', () => {
  it('accepts a well-formed record', () => {
    expect(isCredentialCapture(capture())).toBe(true)
  })

  it('accepts every status the backend can report', () => {
    const statuses: CredentialCaptureStatus[] = ['requested', 'submitted', 'cancelled']
    for (const status of statuses) {
      expect(isCredentialCapture(capture({ status }))).toBe(true)
    }
  })

  it('rejects non-objects', () => {
    expect(isCredentialCapture(null)).toBe(false)
    expect(isCredentialCapture(undefined)).toBe(false)
    expect(isCredentialCapture('cap-1')).toBe(false)
    expect(isCredentialCapture(7)).toBe(false)
    expect(isCredentialCapture([capture()])).toBe(false)
  })

  it('rejects a record missing or mistyping id', () => {
    expect(isCredentialCapture({ ...capture(), id: undefined })).toBe(false)
    expect(isCredentialCapture({ ...capture(), id: '' })).toBe(false)
    expect(isCredentialCapture({ ...capture(), id: 42 })).toBe(false)
  })

  it('rejects a record with no purpose string', () => {
    expect(isCredentialCapture({ ...capture(), purpose: undefined })).toBe(false)
    expect(isCredentialCapture({ ...capture(), purpose: 3 })).toBe(false)
  })

  it('rejects an unknown or non-string status', () => {
    expect(isCredentialCapture({ ...capture(), status: 'pending' })).toBe(false)
    expect(isCredentialCapture({ ...capture(), status: 'Requested' })).toBe(false)
    expect(isCredentialCapture({ ...capture(), status: 1 })).toBe(false)
  })
})

describe('isAwaitingUser', () => {
  it('is true only while the capture is open', () => {
    expect(isAwaitingUser(capture({ status: 'requested' }))).toBe(true)
    expect(isAwaitingUser(capture({ status: 'submitted' }))).toBe(false)
    expect(isAwaitingUser(capture({ status: 'cancelled' }))).toBe(false)
  })
})

describe('awaitingCaptures', () => {
  it('keeps only the open captures, in order', () => {
    const open = capture({ id: 'a' })
    const done = capture({ id: 'b', status: 'submitted' })
    const alsoOpen = capture({ id: 'c' })
    expect(awaitingCaptures([open, done, alsoOpen])).toEqual([open, alsoOpen])
  })

  it('returns an empty list when nothing is open', () => {
    expect(awaitingCaptures([capture({ status: 'cancelled' })])).toEqual([])
    expect(awaitingCaptures([])).toEqual([])
  })
})

describe('belongsToChat', () => {
  it('matches on the exact chat context key', () => {
    expect(belongsToChat(capture({ chatContextKey: '/projects/X' }), '/projects/X')).toBe(true)
    expect(belongsToChat(capture({ chatContextKey: '/projects/X' }), '/projects/Y')).toBe(false)
  })

  it('never matches a capture opened outside a chat', () => {
    expect(belongsToChat(capture(), '/projects/X')).toBe(false)
  })

  it('never matches when the chat has no key', () => {
    expect(belongsToChat(capture({ chatContextKey: '/projects/X' }), undefined)).toBe(false)
    expect(belongsToChat(capture({ chatContextKey: '' }), '')).toBe(false)
  })
})

describe('upsertCapture', () => {
  it('appends an unseen capture', () => {
    const first = capture({ id: 'a' })
    const second = capture({ id: 'b' })
    expect(upsertCapture([first], second)).toEqual([first, second])
  })

  it('replaces a known capture in place so it keeps its position', () => {
    const a = capture({ id: 'a' })
    const b = capture({ id: 'b' })
    const c = capture({ id: 'c' })
    const resolved = capture({ id: 'b', status: 'submitted' })
    expect(upsertCapture([a, b, c], resolved)).toEqual([a, resolved, c])
  })

  it('does not mutate the input array', () => {
    const list = [capture({ id: 'a' })]
    upsertCapture(list, capture({ id: 'a', status: 'cancelled' }))
    upsertCapture(list, capture({ id: 'z' }))
    expect(list).toEqual([capture({ id: 'a' })])
  })

  it('seeds an empty feed', () => {
    const only = capture()
    expect(upsertCapture([], only)).toEqual([only])
  })
})

describe('emptyCaptureForm', () => {
  it('starts every field blank', () => {
    expect(emptyCaptureForm(capture())).toEqual({
      name: '',
      username: '',
      email: '',
      host: '',
      token: '',
    })
  })

  it('hands back a fresh object each time', () => {
    const a = emptyCaptureForm(capture())
    a.name = 'edited'
    expect(emptyCaptureForm(capture()).name).toBe('')
  })
})

describe('captureFields', () => {
  it('lists every field of the submit body, in render order', () => {
    expect(captureFields(capture(), form()).map((field) => field.name)).toEqual([
      'name',
      'username',
      'email',
      'host',
      'token',
    ])
  })

  it('marks the host as the only optional field', () => {
    expect(
      captureFields(capture(), form())
        .filter((field) => field.optional)
        .map((f) => f.name),
    ).toEqual(['host'])
  })

  it('marks the token as the only secret field', () => {
    expect(
      captureFields(capture(), form())
        .filter((field) => field.type === 'secret')
        .map((f) => f.name),
    ).toEqual(['token'])
  })

  it('gives every field a label and a placeholder', () => {
    for (const field of captureFields(capture(), form())) {
      expect(field.label.length).toBeGreaterThan(0)
      expect(field.placeholder.length).toBeGreaterThan(0)
    }
  })
})

describe('isCaptureSecretField', () => {
  it('masks the token and nothing else', () => {
    expect(isCaptureSecretField(capture(), 'token')).toBe(true)
    expect(isCaptureSecretField(capture(), 'name')).toBe(false)
    expect(isCaptureSecretField(capture(), 'username')).toBe(false)
    expect(isCaptureSecretField(capture(), 'email')).toBe(false)
    expect(isCaptureSecretField(capture(), 'host')).toBe(false)
  })
})

describe('captureFormErrors', () => {
  it('is empty for a filled form', () => {
    expect(captureFormErrors(capture(), form())).toEqual({})
  })

  it('flags each blank field individually', () => {
    expect(captureFormErrors(capture(), form({ name: '' }))).toEqual({
      name: CAPTURE_FIELD_REQUIRED,
    })
    expect(captureFormErrors(capture(), form({ username: '' }))).toEqual({
      username: CAPTURE_FIELD_REQUIRED,
    })
    expect(captureFormErrors(capture(), form({ email: '' }))).toEqual({
      email: CAPTURE_FIELD_REQUIRED,
    })
    expect(captureFormErrors(capture(), form({ token: '' }))).toEqual({
      token: CAPTURE_FIELD_REQUIRED,
    })
  })

  it('treats whitespace-only entries as blank, matching the server minLength', () => {
    expect(captureFormErrors(capture(), form({ token: '   ' }))).toEqual({
      token: CAPTURE_FIELD_REQUIRED,
    })
    expect(captureFormErrors(capture(), form({ name: '\n\t' }))).toEqual({
      name: CAPTURE_FIELD_REQUIRED,
    })
  })

  it('flags every required field on an untouched form, and only those', () => {
    expect(captureFormErrors(capture(), emptyCaptureForm(capture()))).toEqual({
      name: CAPTURE_FIELD_REQUIRED,
      username: CAPTURE_FIELD_REQUIRED,
      email: CAPTURE_FIELD_REQUIRED,
      token: CAPTURE_FIELD_REQUIRED,
    })
  })

  it('never flags the optional host, blank or whitespace-only', () => {
    expect(captureFormErrors(capture(), form({ host: '' })).host).toBeUndefined()
    expect(captureFormErrors(capture(), form({ host: '   ' })).host).toBeUndefined()
  })
})

describe('isCaptureFormValid', () => {
  it('requires every non-optional field', () => {
    expect(isCaptureFormValid(capture(), form())).toBe(true)
    expect(isCaptureFormValid(capture(), emptyCaptureForm(capture()))).toBe(false)
    expect(isCaptureFormValid(capture(), form({ email: '' }))).toBe(false)
    expect(isCaptureFormValid(capture(), form({ token: ' ' }))).toBe(false)
  })

  it('stays submittable with no host entered', () => {
    expect(isCaptureFormValid(capture(), form({ host: '' }))).toBe(true)
  })
})

describe('captureSubmitBody', () => {
  it('carries exactly the required fields the submit route takes', () => {
    expect(Object.keys(captureSubmitBody(capture(), form())).sort()).toEqual([
      'email',
      'kind',
      'name',
      'token',
      'username',
    ])
  })

  it('carries the host once the user entered one', () => {
    expect(captureSubmitBody(capture(), form({ host: ' dev.azure.com ' }))).toMatchObject({
      host: 'dev.azure.com',
    })
  })

  it('omits a blank host rather than failing the schema minLength', () => {
    expect(captureSubmitBody(capture(), form({ host: '   ' }))).not.toHaveProperty('host')
  })

  it('trims surrounding whitespace, including a pasted token newline', () => {
    expect(
      captureSubmitBody(
        capture(),
        form({
          name: '  Work  ',
          username: ' octocat\n',
          email: '\tocto@example.com ',
          token: '  ghp_pasted\n',
        }),
      ),
    ).toEqual({
      kind: 'git',
      name: 'Work',
      username: 'octocat',
      email: 'octo@example.com',
      token: 'ghp_pasted',
    })
  })
})

describe('captureStatusDisplay', () => {
  it('maps each status onto its label, description and tone', () => {
    const statuses: CredentialCaptureStatus[] = ['requested', 'submitted', 'cancelled']
    for (const status of statuses) {
      expect(captureStatusDisplay(capture({ status }))).toEqual(
        CREDENTIAL_CAPTURE_STATUS_DISPLAY[status],
      )
    }
  })

  it('gives the open state a pending tone and the resolved states their own', () => {
    expect(captureStatusDisplay(capture()).tone).toBe('pending')
    expect(captureStatusDisplay(capture({ status: 'submitted' })).tone).toBe('success')
    expect(captureStatusDisplay(capture({ status: 'cancelled' })).tone).toBe('neutral')
  })

  it('names the credential a submitted capture produced', () => {
    const display = captureStatusDisplay(
      capture({ status: 'submitted', credentialName: 'GitHub — personal' }),
    )
    expect(display.label).toBe(CREDENTIAL_CAPTURE_STATUS_DISPLAY.submitted.label)
    expect(display.description).toContain('GitHub — personal')
  })

  it('falls back to the plain description when no credential name came back', () => {
    expect(captureStatusDisplay(capture({ status: 'submitted' }))).toEqual(
      CREDENTIAL_CAPTURE_STATUS_DISPLAY.submitted,
    )
  })

  it('ignores a credential name on a status that did not produce one', () => {
    expect(captureStatusDisplay(capture({ status: 'cancelled', credentialName: 'Leaky' }))).toEqual(
      CREDENTIAL_CAPTURE_STATUS_DISPLAY.cancelled,
    )
  })
})

describe('secret containment', () => {
  const SECRET = 'ghp_SENTINEL_never_leaves_the_submit_body'

  function contains(value: unknown): boolean {
    return JSON.stringify(value ?? null).includes(SECRET)
  }

  it('never lets the token reach any helper output but the submit body', () => {
    const values = form({ token: SECRET })
    const record = capture({
      status: 'submitted',
      credentialId: 'cred-1',
      credentialName: 'GitHub — personal',
    })

    expect(contains(captureFormErrors(capture(), values))).toBe(false)
    expect(contains(isCaptureFormValid(capture(), values))).toBe(false)
    expect(contains(captureStatusDisplay(record))).toBe(false)
    expect(contains(captureFields(capture(), form()))).toBe(false)
    expect(contains(emptyCaptureForm(capture()))).toBe(false)
    expect(contains(awaitingCaptures([record]))).toBe(false)
    expect(contains(upsertCapture([], record))).toBe(false)
    expect(contains(isCaptureSecretField(capture(), 'token'))).toBe(false)
    expect(contains(belongsToChat(record, '/projects/X'))).toBe(false)
    expect(contains(isCredentialCapture(record))).toBe(false)

    // The single, deliberate exception: this body IS the request payload.
    expect(captureSubmitBody(capture(), values)).toMatchObject({ token: SECRET })
  })

  it('keeps the capture record itself secret-free, whatever the backend sends', () => {
    const record = capture({ status: 'submitted', credentialId: 'cred-1' })
    expect(Object.keys(record)).not.toContain('token')
    expect(contains(record)).toBe(false)
  })

  it('reports a validation failure without echoing what was typed', () => {
    const errors = captureFormErrors(capture(), form({ token: '   ', username: SECRET }))
    expect(JSON.stringify(errors)).not.toContain(SECRET)
    expect(errors.token).toBe(CAPTURE_FIELD_REQUIRED)
  })
})

describe('the other capture kinds', () => {
  const jira = (over: Partial<CredentialCapture> = {}) =>
    capture({ provider: 'ticket-connection', preset: 'jira', projectId: 'p1', ...over })

  it('opens a ticket form on the tracker the agent named, giving the project no access yet', () => {
    expect(emptyCaptureForm(jira())).toEqual({
      name: '',
      provider: 'jira',
      username: '',
      baseUrl: '',
      token: '',
      access: '',
      projectKeys: '',
    })
  })

  it('falls back to the first tracker for a preset it does not offer', () => {
    expect(emptyCaptureForm(jira({ preset: 'linear' })).provider).toBe('jira')
  })

  it('asks Jira for its email and site, and GitHub for neither', () => {
    const shown = (provider: string) =>
      captureFields(jira(), { ...emptyCaptureForm(jira()), provider }).map((f) => f.name)
    expect(shown('jira')).toEqual(['name', 'provider', 'username', 'baseUrl', 'token', 'access'])
    expect(shown('github')).toEqual(['name', 'provider', 'token'])
  })

  it('offers project access only on a capture opened in a project', () => {
    const outside = jira({ projectId: undefined })
    expect(captureFields(outside, emptyCaptureForm(outside)).map((f) => f.name)).not.toContain(
      'access',
    )
  })

  it('asks for the Jira project keys only once access is given', () => {
    const values = { ...emptyCaptureForm(jira()), access: 'read' }
    expect(captureFields(jira(), values).map((f) => f.name)).toContain('projectKeys')
  })

  it('sends the kind, the access and the keys as a list, and leaves out what is blank', () => {
    expect(
      captureSubmitBody(jira(), {
        ...emptyCaptureForm(jira()),
        name: 'Acme Jira',
        username: 'me@acme.com',
        baseUrl: 'https://acme.atlassian.net',
        token: ' tok ',
        access: 'read-write',
        projectKeys: 'eng, ops',
      }),
    ).toEqual({
      kind: 'ticket-connection',
      name: 'Acme Jira',
      provider: 'jira',
      username: 'me@acme.com',
      baseUrl: 'https://acme.atlassian.net',
      token: 'tok',
      access: 'read-write',
      projectKeys: ['ENG', 'OPS'],
    })
  })

  it('does not send access the user left at none', () => {
    const body = captureSubmitBody(jira(), {
      ...emptyCaptureForm(jira()),
      name: 'J',
      username: 'e',
      baseUrl: 'u',
      token: 't',
    })
    expect(body).not.toHaveProperty('access')
  })

  it('pre-fills a secret note with the label the agent suggested', () => {
    const note = capture({ provider: 'project-note', preset: 'QA login', projectId: 'p1' })
    expect(emptyCaptureForm(note)).toEqual({ label: 'QA login', description: '', value: '' })
    expect(isCaptureSecretField(note, 'value')).toBe(true)
  })

  it('requires a web-search key and sends it under its provider', () => {
    const web = capture({ provider: 'web-search-key', preset: 'exa' })
    const values = emptyCaptureForm(web)
    expect(isCaptureFormValid(web, values)).toBe(false)
    expect(captureSubmitBody(web, { ...values, apiKey: 'k' })).toEqual({
      kind: 'web-search-key',
      provider: 'exa',
      apiKey: 'k',
    })
  })

  it('says a card replaces a stored credential’s secret when it does', () => {
    expect(captureCardTitle(capture({ provider: 'ticket-connection', replacesId: 'c-old' }))).toBe(
      CAPTURE_REPLACING_CARD_TITLE,
    )
    expect(captureCardTitle(capture({ provider: 'ticket-connection' }))).toBe(
      'The agent needs a ticket connection',
    )
  })

  it('heads each card with the tool that opened it', () => {
    expect(captureToolName(capture({ provider: 'llm-key' }))).toBe('requestLlmApiKey')
    expect(captureCardTitle(capture({ provider: 'llm-key' }))).toBe(
      'The agent needs an LLM API key',
    )
  })
})

describe('a CLI sign-in card', () => {
  const signIn = (over: Partial<CredentialCapture> = {}) =>
    capture({ provider: 'cli-login', purpose: 'Run the developer on Codex', ...over })

  it('is told apart from a form that stores what is typed', () => {
    expect(isCliSignInCapture(signIn())).toBe(true)
    expect(isCliSignInCapture(capture())).toBe(false)
  })

  it('heads the card with the tool that opened it, as a sign-in', () => {
    expect(captureToolName(signIn())).toBe('requestCliSignIn')
    expect(captureCardTitle(signIn())).toMatch(/sign/i)
    expect(captureCardTitle(signIn({ replacesId: 'login-1' }))).toMatch(/again/)
  })

  it('opens on the CLI the agent named, with a name to give a new login', () => {
    const values = emptyCaptureForm(signIn({ preset: 'codex' }))
    expect(values.cli).toBe('codex')
    expect(captureFields(signIn(), values).map((f) => f.name)).toEqual(['cli', 'label'])
    expect(isCaptureFormValid(signIn(), { cli: 'codex', label: '' })).toBe(true)
  })

  it('asks nothing when it signs a stored login in again — the login fixes both', () => {
    const again = signIn({ preset: 'claude-code', replacesId: 'login-1' })
    expect(captureFields(again, emptyCaptureForm(again))).toEqual([])
  })

  it('starts a new login named as the user typed, or after its CLI, for this card', () => {
    expect(cliSignInRequest(signIn(), { cli: 'cursor-agent', label: '  Cursor (work) ' })).toEqual({
      cli: 'cursor-agent',
      label: 'Cursor (work)',
      captureId: 'cap-1',
    })
    expect(cliSignInRequest(signIn(), { cli: 'codex', label: '' }).label).toBe('Codex')
  })

  it('signs the stored login in again under its own name', () => {
    const again = signIn({ preset: 'claude-code', replacesId: 'login-1' })
    expect(cliSignInRequest(again, emptyCaptureForm(again), 'Claude (work)')).toEqual({
      cli: 'claude-code',
      label: 'Claude (work)',
      credentialId: 'login-1',
      captureId: 'cap-1',
    })
  })

  it('says signed in, naming the login, once it is done', () => {
    const done = captureStatusDisplay(
      signIn({ status: 'submitted', credentialName: 'Codex (work)' }),
    )
    expect(done.label).toBe('Signed in')
    expect(done.description).toContain('“Codex (work)”')
    expect(captureStatusDisplay(signIn()).description).toMatch(/sign/i)
    expect(captureStatusDisplay(capture({ status: 'submitted' })).label).toBe(
      CREDENTIAL_CAPTURE_STATUS_DISPLAY.submitted.label,
    )
  })
})

describe('capturesBlockedOn', () => {
  it('reads an open form as the agent waiting on the user, named after its tool', () => {
    expect(capturesBlockedOn([capture({ provider: 'ticket-connection' })])).toEqual([
      {
        toolName: 'requestTicketConnection',
        label: 'The agent needs a ticket connection',
        isQuestion: true,
      },
    ])
  })

  it('leaves out a form the user already answered or dismissed', () => {
    expect(
      capturesBlockedOn([capture({ status: 'submitted' }), capture({ status: 'cancelled' })]),
    ).toEqual([])
  })
})
