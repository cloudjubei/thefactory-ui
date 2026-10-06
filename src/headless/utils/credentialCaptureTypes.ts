// Shapes behind an in-chat credential capture: the record the chat renders a
// form for, and the form's own state. The record type comes straight from the
// generated client and has no field a secret could live in — the credential
// fields exist only as `CredentialCaptureFields`, which is the submit body and
// nothing else.

import type { CliTool, GetCredentialCaptureResponse, SubmitCredentialCaptureData } from '../api'

/**
 * The capture handshake as the backend reports it — what the agent asked for,
 * where it stands, and (once submitted) the id + display name of the credential
 * the user's form produced. Never carries the secret.
 */
export type CredentialCapture = GetCredentialCaptureResponse

export type CredentialCaptureStatus = CredentialCapture['status']

/** What a capture collects — git credentials, a ticket connection, a web-search key, an LLM key, a CLI sign-in or a secret note. */
export type CredentialCaptureKind = CredentialCapture['provider']

/**
 * The fields posted to `…/submit`, tagged with the capture's kind. The only
 * shape in this package that holds the secret, and it exists solely to be
 * handed to the API.
 */
export type CredentialCaptureFields = SubmitCredentialCaptureData['body']

export type CredentialCaptureFieldName = string

/** How a field is entered — decides masking, keyboard, and whether it is a choice. */
export type CredentialCaptureFieldType = 'text' | 'email' | 'secret' | 'select'

export type CredentialCaptureFieldOption = { value: string; label: string }

/**
 * One row of a capture form. Both card peers render this list rather than
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
  /** The choices of a `'select'`; the first is the default unless the capture's `preset` names another. */
  options?: readonly CredentialCaptureFieldOption[]
  /** Shown only while another field holds one of these values. */
  shownWhen?: { field: CredentialCaptureFieldName; in: readonly string[] }
  /** Shown only on a capture opened in a project chat. */
  projectOnly?: boolean
  /** Filled from the capture's `preset` when the form opens. */
  fromPreset?: boolean
  /** Shown only on a capture that adds a credential, not on one that replaces a stored one. */
  newOnly?: boolean
}

/**
 * How to get the secret a capture form asks for, for a user who has never made
 * one: where to go, and what to do there. Chosen by the form's kind and what is
 * typed into it so far (the tracker, the provider, the git host).
 */
export type CredentialHelp = {
  /** The question it answers, e.g. "How do I get a Jira API token?" */
  title: string
  /** Where the secret is issued, when there is one page for everyone. */
  link?: { label: string; url: string }
  /** What to do there, in order. */
  steps: readonly string[]
}

/**
 * The sign-in a CLI sign-in card starts — the Settings sign-in, carrying the
 * card it answers. The backend answers the card itself once it succeeds.
 */
export type CliSignInRequest = {
  cli: CliTool
  label: string
  /** The stored login signed in again. */
  credentialId?: string
  captureId: string
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
