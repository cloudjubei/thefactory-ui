import { describe, expect, it } from 'vitest'
import {
  awaitingCaptures,
  belongsToChat,
  bindCapturesToToolCalls,
  captureFields,
  captureToolCallPurpose,
  captureFormErrors,
  captureStatusDisplay,
  captureSubmitBody,
  emptyCaptureForm,
  isAwaitingUser,
  isCaptureFormValid,
  isCaptureSecretField,
  isCredentialCapture,
  upsertCapture,
} from './credentialCaptures'
import {
  CAPTURE_FIELD_REQUIRED,
  CREDENTIAL_CAPTURE_STATUS_DISPLAY,
  CREDENTIAL_CAPTURE_TOOL_NAME,
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
    expiresAt: '2026-08-26T10:10:00.000Z',
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

function toolMessage(toolCallId: string, purpose: unknown, name = CREDENTIAL_CAPTURE_TOOL_NAME) {
  return {
    role: 'tool' as const,
    content: '',
    toolCall: { toolCallId, name, arguments: { purpose } },
  }
}

describe('isCredentialCapture', () => {
  it('accepts a well-formed record', () => {
    expect(isCredentialCapture(capture())).toBe(true)
  })

  it('accepts every status the backend can report', () => {
    const statuses: CredentialCaptureStatus[] = ['requested', 'submitted', 'cancelled', 'expired']
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
    expect(isAwaitingUser(capture({ status: 'expired' }))).toBe(false)
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
    expect(awaitingCaptures([capture({ status: 'expired' })])).toEqual([])
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
    expect(emptyCaptureForm()).toEqual({
      name: '',
      username: '',
      email: '',
      host: '',
      token: '',
    })
  })

  it('hands back a fresh object each time', () => {
    const a = emptyCaptureForm()
    a.name = 'edited'
    expect(emptyCaptureForm().name).toBe('')
  })
})

describe('captureFields', () => {
  it('lists every field of the submit body, in render order', () => {
    expect(captureFields().map((field) => field.name)).toEqual([
      'name',
      'username',
      'email',
      'host',
      'token',
    ])
  })

  it('marks the host as the only optional field', () => {
    expect(
      captureFields()
        .filter((field) => field.optional)
        .map((f) => f.name),
    ).toEqual(['host'])
  })

  it('marks the token as the only secret field', () => {
    expect(
      captureFields()
        .filter((field) => field.type === 'secret')
        .map((f) => f.name),
    ).toEqual(['token'])
  })

  it('gives every field a label and a placeholder', () => {
    for (const field of captureFields()) {
      expect(field.label.length).toBeGreaterThan(0)
      expect(field.placeholder.length).toBeGreaterThan(0)
    }
  })
})

describe('isCaptureSecretField', () => {
  it('masks the token and nothing else', () => {
    expect(isCaptureSecretField('token')).toBe(true)
    expect(isCaptureSecretField('name')).toBe(false)
    expect(isCaptureSecretField('username')).toBe(false)
    expect(isCaptureSecretField('email')).toBe(false)
    expect(isCaptureSecretField('host')).toBe(false)
  })
})

describe('captureFormErrors', () => {
  it('is empty for a filled form', () => {
    expect(captureFormErrors(form())).toEqual({})
  })

  it('flags each blank field individually', () => {
    expect(captureFormErrors(form({ name: '' }))).toEqual({ name: CAPTURE_FIELD_REQUIRED })
    expect(captureFormErrors(form({ username: '' }))).toEqual({ username: CAPTURE_FIELD_REQUIRED })
    expect(captureFormErrors(form({ email: '' }))).toEqual({ email: CAPTURE_FIELD_REQUIRED })
    expect(captureFormErrors(form({ token: '' }))).toEqual({ token: CAPTURE_FIELD_REQUIRED })
  })

  it('treats whitespace-only entries as blank, matching the server minLength', () => {
    expect(captureFormErrors(form({ token: '   ' }))).toEqual({ token: CAPTURE_FIELD_REQUIRED })
    expect(captureFormErrors(form({ name: '\n\t' }))).toEqual({ name: CAPTURE_FIELD_REQUIRED })
  })

  it('flags every required field on an untouched form, and only those', () => {
    expect(captureFormErrors(emptyCaptureForm())).toEqual({
      name: CAPTURE_FIELD_REQUIRED,
      username: CAPTURE_FIELD_REQUIRED,
      email: CAPTURE_FIELD_REQUIRED,
      token: CAPTURE_FIELD_REQUIRED,
    })
  })

  it('never flags the optional host, blank or whitespace-only', () => {
    expect(captureFormErrors(form({ host: '' })).host).toBeUndefined()
    expect(captureFormErrors(form({ host: '   ' })).host).toBeUndefined()
  })
})

describe('isCaptureFormValid', () => {
  it('requires every non-optional field', () => {
    expect(isCaptureFormValid(form())).toBe(true)
    expect(isCaptureFormValid(emptyCaptureForm())).toBe(false)
    expect(isCaptureFormValid(form({ email: '' }))).toBe(false)
    expect(isCaptureFormValid(form({ token: ' ' }))).toBe(false)
  })

  it('stays submittable with no host entered', () => {
    expect(isCaptureFormValid(form({ host: '' }))).toBe(true)
  })
})

describe('captureSubmitBody', () => {
  it('carries exactly the required fields the submit route takes', () => {
    expect(Object.keys(captureSubmitBody(form())).sort()).toEqual([
      'email',
      'name',
      'token',
      'username',
    ])
  })

  it('carries the host once the user entered one', () => {
    expect(captureSubmitBody(form({ host: ' dev.azure.com ' })).host).toBe('dev.azure.com')
  })

  it('omits a blank host rather than failing the schema minLength', () => {
    expect(captureSubmitBody(form({ host: '   ' }))).not.toHaveProperty('host')
  })

  it('trims surrounding whitespace, including a pasted token newline', () => {
    expect(
      captureSubmitBody(
        form({
          name: '  Work  ',
          username: ' octocat\n',
          email: '\tocto@example.com ',
          token: '  ghp_pasted\n',
        }),
      ),
    ).toEqual({
      name: 'Work',
      username: 'octocat',
      email: 'octo@example.com',
      token: 'ghp_pasted',
    })
  })
})

describe('captureToolCallPurpose', () => {
  it('reads the purpose off a capture-opening tool call', () => {
    expect(captureToolCallPurpose(toolMessage('t1', 'Push the release branch').toolCall)).toBe(
      'Push the release branch',
    )
  })

  it('parses arguments a CLI transcript carries as a JSON string', () => {
    expect(
      captureToolCallPurpose({
        toolCallId: 't1',
        name: CREDENTIAL_CAPTURE_TOOL_NAME,
        arguments: JSON.stringify({ purpose: 'Clone the repo' }),
      }),
    ).toBe('Clone the repo')
  })

  it('trims the purpose so it joins against the record the backend trimmed', () => {
    expect(captureToolCallPurpose(toolMessage('t1', '  Clone the repo  ').toolCall)).toBe(
      'Clone the repo',
    )
  })

  it('ignores a different tool entirely', () => {
    expect(captureToolCallPurpose(toolMessage('t1', 'p', 'readPaths').toolCall)).toBeUndefined()
  })

  it('ignores a call with no purpose to join on', () => {
    expect(captureToolCallPurpose(toolMessage('t1', undefined).toolCall)).toBeUndefined()
    expect(captureToolCallPurpose(toolMessage('t1', 7).toolCall)).toBeUndefined()
    expect(captureToolCallPurpose(toolMessage('t1', '  ').toolCall)).toBeUndefined()
  })

  it('ignores unparseable arguments instead of throwing mid-render', () => {
    expect(
      captureToolCallPurpose({
        toolCallId: 't1',
        name: CREDENTIAL_CAPTURE_TOOL_NAME,
        arguments: '{not json',
      }),
    ).toBeUndefined()
  })

  it('ignores an absent tool call', () => {
    expect(captureToolCallPurpose(undefined)).toBeUndefined()
  })
})

describe('bindCapturesToToolCalls', () => {
  it('binds an open capture to the row that opened it', () => {
    const open = capture({ purpose: 'Clone the repo' })
    const bound = bindCapturesToToolCalls([toolMessage('t1', 'Clone the repo')], [open])
    expect(bound.byToolCallId).toEqual({ t1: open })
    expect(bound.unbound).toEqual([])
  })

  it('binds to the LAST matching row, since an earlier identical ask is already answered', () => {
    const open = capture({ purpose: 'Clone the repo' })
    const bound = bindCapturesToToolCalls(
      [toolMessage('t1', 'Clone the repo'), toolMessage('t2', 'Clone the repo')],
      [open],
    )
    expect(Object.keys(bound.byToolCallId)).toEqual(['t2'])
  })

  it('gives two concurrent captures two different rows', () => {
    const first = capture({ id: 'cap-1', purpose: 'Clone the repo' })
    const second = capture({ id: 'cap-2', purpose: 'Clone the repo' })
    const bound = bindCapturesToToolCalls(
      [toolMessage('t1', 'Clone the repo'), toolMessage('t2', 'Clone the repo')],
      [first, second],
    )
    expect(bound.byToolCallId).toEqual({ t2: first, t1: second })
    expect(bound.unbound).toEqual([])
  })

  it('reports a capture with no row of its own as unbound, so it still gets rendered', () => {
    const open = capture({ purpose: 'Clone the repo' })
    expect(bindCapturesToToolCalls([toolMessage('t1', 'Something else')], [open])).toEqual({
      byToolCallId: {},
      unbound: [open],
    })
  })

  it('binds nothing for a capture the user already answered', () => {
    const resolved = capture({ status: 'submitted', purpose: 'Clone the repo' })
    expect(bindCapturesToToolCalls([toolMessage('t1', 'Clone the repo')], [resolved])).toEqual({
      byToolCallId: {},
      unbound: [],
    })
  })

  it('ignores rows whose tool is not the capture tool', () => {
    const open = capture({ purpose: 'Clone the repo' })
    const bound = bindCapturesToToolCalls(
      [toolMessage('t1', 'Clone the repo', 'readPaths')],
      [open],
    )
    expect(bound).toEqual({ byToolCallId: {}, unbound: [open] })
  })
})

describe('captureStatusDisplay', () => {
  it('maps each status onto its label, description and tone', () => {
    const statuses: CredentialCaptureStatus[] = ['requested', 'submitted', 'cancelled', 'expired']
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
    expect(captureStatusDisplay(capture({ status: 'expired' })).tone).toBe('warning')
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

    expect(contains(captureFormErrors(values))).toBe(false)
    expect(contains(isCaptureFormValid(values))).toBe(false)
    expect(contains(captureStatusDisplay(record))).toBe(false)
    expect(contains(captureFields())).toBe(false)
    expect(contains(emptyCaptureForm())).toBe(false)
    expect(contains(awaitingCaptures([record]))).toBe(false)
    expect(contains(upsertCapture([], record))).toBe(false)
    expect(contains(isCaptureSecretField('token'))).toBe(false)
    expect(contains(belongsToChat(record, '/projects/X'))).toBe(false)
    expect(contains(isCredentialCapture(record))).toBe(false)

    // The single, deliberate exception: this body IS the request payload.
    expect(captureSubmitBody(values).token).toBe(SECRET)
  })

  it('keeps the capture record itself secret-free, whatever the backend sends', () => {
    const record = capture({ status: 'submitted', credentialId: 'cred-1' })
    expect(Object.keys(record)).not.toContain('token')
    expect(contains(record)).toBe(false)
  })

  it('reports a validation failure without echoing what was typed', () => {
    const errors = captureFormErrors(form({ token: '   ', username: SECRET }))
    expect(JSON.stringify(errors)).not.toContain(SECRET)
    expect(errors.token).toBe(CAPTURE_FIELD_REQUIRED)
  })
})
