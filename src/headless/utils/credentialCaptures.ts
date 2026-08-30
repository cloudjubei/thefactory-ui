// Pure logic behind the in-chat credential capture: narrowing the WS payload,
// deciding which captures still await the user, binding each open one to the
// transcript row that opened it, validating the form, and mapping a status onto
// display copy. No React, no I/O.
//
// Exactly one function here touches the secret — `captureSubmitBody`, which
// builds the request body handed to the API. Nothing else accepts it, returns
// it, or embeds it in a message, and `credentialCaptures.test.ts` pins that.

import {
  CAPTURE_CREDENTIAL_NAME_PREFIX,
  CAPTURE_FIELD_REQUIRED,
  CREDENTIAL_CAPTURE_FIELDS,
  CREDENTIAL_CAPTURE_PURPOSE_ARG,
  CREDENTIAL_CAPTURE_STATUS_DISPLAY,
  CREDENTIAL_CAPTURE_TOOL_NAME,
  EMPTY_CREDENTIAL_CAPTURE_FORM,
} from './credentialCaptureConstants'
import type { ChatMessageLike, ToolCallLike } from './chatTypes'
import type {
  CredentialCapture,
  CredentialCaptureFieldName,
  CredentialCaptureFields,
  CredentialCaptureFieldSpec,
  CredentialCaptureFormErrors,
  CredentialCaptureFormValues,
  CredentialCaptureStatusDisplay,
} from './credentialCaptureTypes'

const STATUSES = new Set(Object.keys(CREDENTIAL_CAPTURE_STATUS_DISPLAY))

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Narrow an untyped `credentialCapture:updated` payload. A guard rather than a
 * cast: this record drives whether a credential form appears, so a malformed
 * broadcast is dropped instead of rendering an unaddressable form.
 */
export function isCredentialCapture(value: unknown): value is CredentialCapture {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.id) &&
    typeof record.purpose === 'string' &&
    typeof record.status === 'string' &&
    STATUSES.has(record.status)
  )
}

/** True while the capture is still open — the only state that renders a form. */
export function isAwaitingUser(capture: CredentialCapture): boolean {
  return capture.status === 'requested'
}

/** The captures still waiting on the user, in the order they arrived. */
export function awaitingCaptures(captures: readonly CredentialCapture[]): CredentialCapture[] {
  return captures.filter(isAwaitingUser)
}

/**
 * Whether a capture belongs to one chat. A capture opened outside a chat carries
 * no `chatContextKey` and belongs to no conversation, so it never matches.
 */
export function belongsToChat(
  capture: CredentialCapture,
  chatContextKey: string | undefined,
): boolean {
  if (!chatContextKey) return false
  return capture.chatContextKey === chatContextKey
}

/**
 * Apply one record to the feed: an update replaces its predecessor in place so
 * a resolved capture keeps its position in the conversation, and a new one is
 * appended. Returns the original array when nothing changed.
 */
export function upsertCapture(
  captures: readonly CredentialCapture[],
  capture: CredentialCapture,
): CredentialCapture[] {
  const index = captures.findIndex((existing) => existing.id === capture.id)
  if (index === -1) return [...captures, capture]
  const next = [...captures]
  next[index] = capture
  return next
}

export function emptyCaptureForm(): CredentialCaptureFormValues {
  return { ...EMPTY_CREDENTIAL_CAPTURE_FORM }
}

/** The form's fields, in render order. */
export function captureFields(): readonly CredentialCaptureFieldSpec[] {
  return CREDENTIAL_CAPTURE_FIELDS
}

/** Whether a field must be masked. Both card peers ask rather than deciding. */
export function isCaptureSecretField(name: CredentialCaptureFieldName): boolean {
  return CREDENTIAL_CAPTURE_FIELDS.some((field) => field.name === name && field.type === 'secret')
}

/**
 * Per-field validation. A required field left blank would fail the submit
 * schema's `minLength` server-side, so it fails here too; an optional one is
 * simply omitted. Messages are fixed copy — no entered value is ever echoed.
 */
export function captureFormErrors(
  values: CredentialCaptureFormValues,
): CredentialCaptureFormErrors {
  const errors: CredentialCaptureFormErrors = {}
  for (const field of CREDENTIAL_CAPTURE_FIELDS) {
    if (field.optional) continue
    if (!values[field.name].trim()) errors[field.name] = CAPTURE_FIELD_REQUIRED
  }
  return errors
}

/** Whether the form can be submitted — drives the submit button's disabled state. */
export function isCaptureFormValid(values: CredentialCaptureFormValues): boolean {
  return Object.keys(captureFormErrors(values)).length === 0
}

/**
 * The submit body. The one place a credential value leaves the form — it goes
 * straight into the request and is never retained. A blank optional field is
 * left out entirely rather than sent as an empty string, which the schema's
 * `minLength` would reject.
 */
export function captureSubmitBody(values: CredentialCaptureFormValues): CredentialCaptureFields {
  const host = values.host.trim()
  return {
    name: values.name.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
    token: values.token.trim(),
    ...(host ? { host } : {}),
  }
}

function argumentsRecord(args: unknown): Record<string, unknown> | undefined {
  if (typeof args === 'string') {
    try {
      return argumentsRecord(JSON.parse(args))
    } catch {
      return undefined
    }
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return undefined
  return args as Record<string, unknown>
}

/**
 * The `purpose` a capture-opening tool call was made with — the join between a
 * transcript row and the capture it opened. While the call is still blocked
 * there is no result to read a captureId out of, and `purpose` is the one field
 * both sides carry. Anything that is not a capture-opening call yields nothing.
 */
export function captureToolCallPurpose(toolCall: ToolCallLike | undefined): string | undefined {
  if (!toolCall || toolCall.name !== CREDENTIAL_CAPTURE_TOOL_NAME) return undefined
  const purpose = argumentsRecord(toolCall.arguments)?.[CREDENTIAL_CAPTURE_PURPOSE_ARG]
  if (typeof purpose !== 'string') return undefined
  const trimmed = purpose.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Where each still-open capture's form belongs. A capture binds to the LAST
 * transcript row that opened it — an older row asking the same thing has
 * already been answered — and each row takes at most one capture, so two
 * concurrent requests never collapse onto the same place.
 *
 * `unbound` is the remainder: captures with no row of their own in `messages` —
 * most often one opened by a CLI run, whose transcript is fetched and rendered
 * by its own component rather than living here. They have no row to sit at, so
 * the caller renders them somewhere the user can still reach; a form with
 * nowhere to appear is a hung agent.
 */
export function bindCapturesToToolCalls(
  messages: readonly ChatMessageLike[],
  captures: readonly CredentialCapture[],
): { byToolCallId: Record<string, CredentialCapture>; unbound: CredentialCapture[] } {
  const byToolCallId: Record<string, CredentialCapture> = {}
  const unbound: CredentialCapture[] = []
  const taken = new Set<string>()
  for (const capture of awaitingCaptures(captures)) {
    let boundTo: string | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      const toolCallId = messages[i].toolCall?.toolCallId
      if (!toolCallId || taken.has(toolCallId)) continue
      if (captureToolCallPurpose(messages[i].toolCall) !== capture.purpose) continue
      boundTo = toolCallId
      break
    }
    if (boundTo === undefined) {
      unbound.push(capture)
      continue
    }
    taken.add(boundTo)
    byToolCallId[boundTo] = capture
  }
  return { byToolCallId, unbound }
}

/**
 * Status → display copy, naming the credential a submitted capture produced so
 * the conversation reads correctly on scrollback.
 */
export function captureStatusDisplay(capture: CredentialCapture): CredentialCaptureStatusDisplay {
  const base = CREDENTIAL_CAPTURE_STATUS_DISPLAY[capture.status]
  if (capture.status !== 'submitted' || !capture.credentialName) return base
  return {
    ...base,
    description: `${base.description} ${CAPTURE_CREDENTIAL_NAME_PREFIX} “${capture.credentialName}”.`,
  }
}
