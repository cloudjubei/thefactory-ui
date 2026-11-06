// Pure logic behind the in-chat credential capture: narrowing the WS payload,
// deciding which captures still await the user, binding each open one to the
// transcript row that opened it, validating the form, and mapping a status onto
// display copy. No React, no I/O.
//
// Exactly one function here touches the secret — `captureSubmitBody`, which
// builds the request body handed to the API. Nothing else accepts it, returns
// it, or embeds it in a message, and `credentialCaptures.test.ts` pins that.

import {
  CAPTURE_CARD_PRIVACY_NOTE,
  CAPTURE_CARD_TITLES,
  CAPTURE_REPLACING_CARD_TITLE,
  CAPTURE_REPLACING_CARD_TITLES,
  CAPTURE_STATUS_DISPLAY_BY_KIND,
  CAPTURE_CREDENTIAL_NAME_PREFIX,
  CAPTURE_FIELD_REQUIRED,
  CAPTURE_SUBMIT_LABEL,
  CLI_SIGN_IN_PRIVACY_NOTE,
  CLI_SIGN_IN_START_LABEL,
  CREDENTIAL_CAPTURE_FIELDS,
  CREDENTIAL_CAPTURE_STATUS_DISPLAY,
  CREDENTIAL_CAPTURE_TOOL_NAMES,
  MCP_CAPTURE_PRIVACY_NOTE,
  MCP_CAPTURE_SIGN_IN_TITLE,
  MCP_CAPTURE_SUBMIT_LABEL,
} from './credentialCaptureConstants'
import { extractErrorMessage } from '../api/errorMessage'
import { cliLabel } from './cliRunner'
import { mcpServerUrlProblem } from './mcpServers'
import { MCP_SERVER_DRAFT_PROBLEMS, MCP_SERVER_NAME_MAX } from './mcpServersConstants'
import type { McpServerOwner } from './mcpServersTypes'
import { isJiraCloudId, isJiraSiteUrl } from './providerConnectionForm'
import { PROVIDER_CONNECTION_PROBLEMS } from './providerConnectionFormConstants'
import { parseJiraProjectKeys } from './ticketConnection'
import type { CliTool } from '../api'
import type { CliRunBlockedOn } from './cliRunActivityTypes'
import type {
  CliSignInRequest,
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

/** Every field of a capture's kind, whether or not it is shown right now. */
function kindFields(capture: CredentialCapture): readonly CredentialCaptureFieldSpec[] {
  return CREDENTIAL_CAPTURE_FIELDS[capture.provider]
}

/**
 * A capture's form as it opens: blank, a choice on its first option, and the
 * field the agent pre-filled (`preset`) on what it asked for — a choice only
 * when the preset is one of its options.
 */
export function emptyCaptureForm(capture: CredentialCapture): CredentialCaptureFormValues {
  const values: CredentialCaptureFormValues = {}
  for (const field of kindFields(capture)) {
    const preset = field.fromMcpServer
      ? capture.mcpServer?.[field.fromMcpServer]
      : field.fromPreset
        ? capture.preset
        : undefined
    if (field.type === 'select') {
      const options = field.options ?? []
      values[field.name] =
        preset && options.some((o) => o.value === preset) ? preset : (options[0]?.value ?? '')
    } else {
      values[field.name] = preset ?? ''
    }
  }
  return values
}

/**
 * The fields a form opens with something in: a card explains what is wrong with
 * an agent's suggestion at once, rather than after the person has left the field.
 */
export function filledCaptureFields(capture: CredentialCapture): CredentialCaptureFieldName[] {
  const opened = emptyCaptureForm(capture)
  return captureFields(capture, opened)
    .map((field) => field.name)
    .filter((name) => opened[name])
}

/**
 * The fields shown right now, in render order: a project-only field only on a
 * capture opened in a project, a dependent field only while what it depends on
 * holds a matching value.
 */
export function captureFields(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): readonly CredentialCaptureFieldSpec[] {
  return kindFields(capture).filter((field) => isFieldShown(capture, field, values))
}

/** A field hangs on another only while that one is shown: a hidden choice keeps its old value. */
function isFieldShown(
  capture: CredentialCapture,
  field: CredentialCaptureFieldSpec,
  values: CredentialCaptureFormValues,
): boolean {
  if (field.projectOnly && !capture.projectId) return false
  if (field.newOnly && capture.replacesId) return false
  if (field.twoOwners && !(capture.projectId && capture.groupId)) return false
  const { shownWhen } = field
  if (!shownWhen) return true
  if (!shownWhen.in.includes(values[shownWhen.field] ?? '')) return false
  return kindFields(capture).some(
    (other) => other.name === shownWhen.field && isFieldShown(capture, other, values),
  )
}

/** Whether a field must be masked. Both card peers ask rather than deciding. */
export function isCaptureSecretField(
  capture: CredentialCapture,
  name: CredentialCaptureFieldName,
): boolean {
  return kindFields(capture).some((field) => field.name === name && field.type === 'secret')
}

/**
 * Per-field validation of the shown fields. A required field left blank would
 * fail the submit schema's `minLength` server-side, so it fails here too; an
 * optional one is simply omitted. Messages are fixed copy — no entered value is
 * ever echoed.
 */
export function captureFormErrors(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): CredentialCaptureFormErrors {
  const errors: CredentialCaptureFormErrors = {}
  for (const field of captureFields(capture, values)) {
    if (field.optional) continue
    if (!(values[field.name] ?? '').trim()) errors[field.name] = CAPTURE_FIELD_REQUIRED
  }
  if (capture.provider === 'mcp-server') return { ...errors, ...mcpServerFieldErrors(values) }
  return capture.provider === 'ticket-connection'
    ? { ...errors, ...jiraTokenFieldErrors(capture, values) }
    : errors
}

const isScopedTokenForm = (
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): boolean => captureFields(capture, values).some((field) => field.name === 'cloudId')

/** What a card shares with the Settings form, on the field it is about. */
function jiraTokenFieldErrors(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): CredentialCaptureFormErrors {
  if (!isScopedTokenForm(capture, values)) return {}
  const site = (values.baseUrl ?? '').trim()
  const cloudId = (values.cloudId ?? '').trim()
  return {
    ...(site && !isJiraSiteUrl(site) ? { baseUrl: PROVIDER_CONNECTION_PROBLEMS.jiraSite } : {}),
    ...(cloudId && !isJiraCloudId(cloudId)
      ? { cloudId: PROVIDER_CONNECTION_PROBLEMS.jiraCloudId }
      : {}),
  }
}

/** The site to ask for a cloud id: only while the form wants one and the site can answer. */
export function captureCloudIdSite(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): string | undefined {
  if (!isScopedTokenForm(capture, values)) return undefined
  const site = values.baseUrl ?? ''
  return !(values.cloudId ?? '').trim() && isJiraSiteUrl(site) ? site.trim() : undefined
}

/** The form with one field changed. A cloud id belongs to the site it was found on, so it goes too. */
export function captureFormWith(
  values: CredentialCaptureFormValues,
  name: CredentialCaptureFieldName,
  value: string,
): CredentialCaptureFormValues {
  return { ...values, [name]: value, ...(name === 'baseUrl' ? { cloudId: '' } : {}) }
}

/** What a server card shares with the Settings form, on the field it is about. */
function mcpServerFieldErrors(values: CredentialCaptureFormValues): CredentialCaptureFormErrors {
  const name = (values.name ?? '').trim()
  const url = (values.url ?? '').trim()
  const urlProblem = url ? mcpServerUrlProblem(url) : undefined
  return {
    ...(name.length > MCP_SERVER_NAME_MAX ? { name: MCP_SERVER_DRAFT_PROBLEMS.nameTooLong } : {}),
    ...(urlProblem ? { url: urlProblem } : {}),
  }
}

/** Whether the form can be submitted — drives the submit button's disabled state. */
export function isCaptureFormValid(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): boolean {
  return Object.keys(captureFormErrors(capture, values)).length === 0
}

/**
 * The submit body: the capture's kind and its shown fields. The one place a
 * credential value leaves the form — it goes straight into the request and is
 * never retained. A blank optional field is left out entirely rather than sent
 * as an empty string, which the schema's `minLength` would reject; Jira project
 * keys go as a list.
 */
export function captureSubmitBody(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): CredentialCaptureFields {
  const body: Record<string, unknown> = { kind: capture.provider }
  for (const field of captureFields(capture, values)) {
    const value = (values[field.name] ?? '').trim()
    if (!value) continue
    body[field.name] = field.name === 'projectKeys' ? parseJiraProjectKeys(value) : value
  }
  return body as CredentialCaptureFields
}

/** The tool that opened a capture — the name its card is headed with. */
export function captureToolName(capture: CredentialCapture): string {
  return CREDENTIAL_CAPTURE_TOOL_NAMES[capture.provider]
}

/** What the card says the agent is asking for. */
export function captureCardTitle(capture: CredentialCapture): string {
  if (isMcpSignInStep(capture)) return MCP_CAPTURE_SIGN_IN_TITLE(capture.mcpServer?.name ?? '')
  if (!capture.replacesId) return CAPTURE_CARD_TITLES[capture.provider]
  return CAPTURE_REPLACING_CARD_TITLES[capture.provider] ?? CAPTURE_REPLACING_CARD_TITLE
}

/** The promise a form makes above its fields. */
export function captureFormNote(capture: CredentialCapture): string {
  if (isCliSignInCapture(capture)) return CLI_SIGN_IN_PRIVACY_NOTE
  return capture.provider === 'mcp-server' ? MCP_CAPTURE_PRIVACY_NOTE : CAPTURE_CARD_PRIVACY_NOTE
}

/** Why a form's action failed. A server or ticket card shows the backend's words: they say what to fix, and never hold a token. */
export function captureFailureText(
  capture: CredentialCapture,
  err: unknown,
  fallback: string,
): string {
  if (capture.provider === 'mcp-server' || capture.provider === 'ticket-connection') {
    return extractErrorMessage(err, fallback)
  }
  return err instanceof Error ? err.message : fallback
}

/** What a form's button says. */
export function captureSubmitLabel(capture: CredentialCapture): string {
  if (isCliSignInCapture(capture)) return CLI_SIGN_IN_START_LABEL
  return capture.provider === 'mcp-server' ? MCP_CAPTURE_SUBMIT_LABEL : CAPTURE_SUBMIT_LABEL
}

/** Whether a capture is a CLI sign-in — signed in on the card, not typed into a form. */
export function isCliSignInCapture(capture: CredentialCapture): boolean {
  return capture.provider === 'cli-login'
}

/** Whether a server card has added its server and only the sign-in is left. */
export function isMcpSignInStep(capture: CredentialCapture): boolean {
  return (
    capture.provider === 'mcp-server' &&
    isAwaitingUser(capture) &&
    capture.mcpServer?.serverId !== undefined
  )
}

/** Whom a server card keeps its server on, as the backend recorded it. */
export function mcpCaptureOwner(capture: CredentialCapture): McpServerOwner | undefined {
  const scope = capture.mcpServer?.scope ?? (capture.projectId ? 'project' : 'group')
  if (scope === 'group') {
    return capture.groupId ? { kind: 'group', groupId: capture.groupId } : undefined
  }
  return capture.projectId ? { kind: 'project', projectId: capture.projectId } : undefined
}

/**
 * The sign-in a CLI sign-in card starts: a new login on the CLI chosen, named as
 * typed or after its CLI; or the stored login it names, again, under its own
 * name (`storedName`, from the logins list) with the CLI that login is for.
 */
export function cliSignInRequest(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
  storedName?: string,
): CliSignInRequest {
  const cli = (capture.replacesId ? capture.preset : values.cli || capture.preset) as CliTool
  const label = capture.replacesId ? storedName : (values.label ?? '').trim()
  return {
    cli,
    label: label || cliLabel(cli),
    ...(capture.replacesId ? { credentialId: capture.replacesId } : {}),
    captureId: capture.id,
  }
}

/**
 * What each open form has the agent parked on, for the run's activity line: a
 * form is answered by the user like a question, so the line reads as waiting on
 * them rather than on an approval.
 */
export function capturesBlockedOn(captures: readonly CredentialCapture[]): CliRunBlockedOn[] {
  return awaitingCaptures(captures).map((capture) => ({
    toolName: captureToolName(capture),
    label: captureCardTitle(capture),
    isQuestion: true,
  }))
}

/**
 * Status → display copy, naming the credential a submitted capture produced so
 * the conversation reads correctly on scrollback.
 */
export function captureStatusDisplay(capture: CredentialCapture): CredentialCaptureStatusDisplay {
  const base =
    CAPTURE_STATUS_DISPLAY_BY_KIND[capture.provider]?.[capture.status] ??
    CREDENTIAL_CAPTURE_STATUS_DISPLAY[capture.status]
  if (capture.status !== 'submitted' || !capture.credentialName) return base
  return {
    ...base,
    description: `${base.description} ${CAPTURE_CREDENTIAL_NAME_PREFIX} “${capture.credentialName}”.`,
  }
}
