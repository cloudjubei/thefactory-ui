// Shapes behind an in-chat credential capture: the record the chat renders a
// form for, and the form's own state. The record type comes straight from the
// generated client and has no field a secret could live in — the credential
// fields exist only as `CredentialCaptureFields`, which is the submit body and
// nothing else.

import type { GetCredentialCaptureResponse, SubmitCredentialCaptureData } from '../api'

/**
 * The capture handshake as the backend reports it — what the agent asked for,
 * where it stands, and (once submitted) the id + display name of the credential
 * the user's form produced. Never carries the secret.
 */
export type CredentialCapture = GetCredentialCaptureResponse

export type CredentialCaptureStatus = CredentialCapture['status']

/**
 * The credential fields posted to `…/submit`. The only shape in this package
 * that holds the secret, and it exists solely to be handed to the API.
 */
export type CredentialCaptureFields = SubmitCredentialCaptureData['body']

export type CredentialCaptureFieldName = keyof CredentialCaptureFields

/** How a field is entered — decides masking and keyboard on both peers. */
export type CredentialCaptureFieldType = 'text' | 'email' | 'secret'

/**
 * One row of the capture form. Both card peers render this list rather than
 * hard-coding inputs, so web and native cannot drift apart on which fields
 * exist, what they are called, or which one is masked.
 */
export type CredentialCaptureFieldSpec = {
  name: CredentialCaptureFieldName
  label: string
  placeholder: string
  type: CredentialCaptureFieldType
  /** Left off the submit body when blank, and never blocks the submit button. */
  optional?: boolean
}

/** Editable form state — the raw strings, before trimming into a submit body. */
export type CredentialCaptureFormValues = Record<CredentialCaptureFieldName, string>

/** Per-field validation messages; an absent key is valid. */
export type CredentialCaptureFormErrors = Partial<Record<CredentialCaptureFieldName, string>>

/** Visual weight of a resolved state, mapped to each peer's own palette. */
export type CredentialCaptureTone = 'pending' | 'success' | 'neutral' | 'warning'

/** What a card shows in place of the form once a capture is no longer open. */
export type CredentialCaptureStatusDisplay = {
  label: string
  description: string
  tone: CredentialCaptureTone
}
