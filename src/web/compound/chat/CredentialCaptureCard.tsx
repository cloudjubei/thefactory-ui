import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import { SecretInput } from '../SecretInput'
import { captureHelp } from '../../../headless/utils/credentialCaptureHelp'
import { useJiraCloudIdLookup } from '../../../headless/hooks/useJiraCloudIdLookup'
import { jiraCloudIdHint } from '../../../headless/utils/providerConnectionForm'
import type { JiraCloudIdStatus } from '../../../headless/utils/providerConnectionFormTypes'
import CaptureCardShell from './CaptureCardShell'
import CredentialHelpPanel from './CredentialHelpPanel'
import McpServerCaptureSignIn from './McpServerCaptureSignIn'
import { useCliConfigs } from '../../../headless/contexts/CliConfigsContext'
import { useCliSignIn } from '../../../headless/hooks/useCliSignIn'
import { CLI_CLIENT_OPENS_LOGIN_URL } from '../../../headless/utils/cliRunner'
import {
  captureFailureText,
  captureCloudIdSite,
  captureFields,
  captureFormWith,
  captureFormNote,
  cliSignInRequest,
  captureFormErrors,
  captureSubmitBody,
  captureSubmitLabel,
  emptyCaptureForm,
  filledCaptureFields,
  isAwaitingUser,
  isCaptureFormValid,
  isCliSignInCapture,
  isMcpSignInStep,
  mcpCaptureOwner,
} from '../../../headless/utils/credentialCaptures'
import {
  CAPTURE_CANCEL_ERROR,
  CAPTURE_CANCEL_LABEL,
  CAPTURE_SUBMIT_ERROR,
  CLI_SIGN_IN_AUTHORIZE_HINT,
  CLI_SIGN_IN_CODE_LABEL,
  CLI_SIGN_IN_CODE_PLACEHOLDER,
  CLI_SIGN_IN_CODE_SUBMIT,
  CLI_SIGN_IN_COPY_LINK,
  CLI_SIGN_IN_OPEN_LINK,
  CLI_SIGN_IN_STARTING,
} from '../../../headless/utils/credentialCaptureConstants'
import type {
  CredentialCapture,
  CredentialCaptureFieldName,
  CredentialCaptureFields,
  CredentialCaptureFormValues,
} from '../../../headless/utils/credentialCaptureTypes'

export type CredentialCaptureCardProps = {
  /** The capture record — the secret-free handshake, never the credentials. */
  capture: CredentialCapture
  /** Posts the typed fields straight to the credentials API. */
  onSubmit: (fields: CredentialCaptureFields) => Promise<void>
  /** Resolves the capture as cancelled — "Not now". */
  onCancel: () => Promise<void>
  /** Blocks the form while the host is busy. */
  disabled?: boolean
  /** Start the form with these in it. */
  initialValues?: CredentialCaptureFormValues
  /** Hold finding the cloud id at this stage, for a fixed showcase state. */
  fixedCloudIdStatus?: JiraCloudIdStatus
}

/**
 * The agent's credential request, rendered as the tool call it is: the same
 * container, border and header density as `ToolCallCard`, with the form as the
 * expandable section a tool card would put its arguments in. It replaces the
 * row for the call that opened it rather than sitting beside it, so one request
 * reads as one event.
 *
 * The secret goes from the input straight to the credentials API — never into
 * chat state, an error message, or the agent's transcript, which only ever
 * learns that the capture resolved and which credential it produced.
 *
 * A CLI sign-in card stores nothing typed: it runs the Settings sign-in for the
 * card, with its link and code box here, and the backend answers the card once
 * the sign-in succeeds. A server card adds its server here, then moves to signing
 * in if the server wants that; the backend answers that one as well.
 */
export default function CredentialCaptureCard({
  capture,
  onSubmit,
  onCancel,
  disabled,
  initialValues,
  fixedCloudIdStatus,
}: CredentialCaptureCardProps) {
  const [values, setValues] = useState<CredentialCaptureFormValues>(() => ({
    ...emptyCaptureForm(capture),
    ...initialValues,
  }))
  const [touched, setTouched] = useState<CredentialCaptureFieldName[]>(() =>
    filledCaptureFields(capture),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The agent is parked on this form, so it opens showing what it needs; the
  // chevron is for getting it out of the way, not for finding it.

  const open = isAwaitingUser(capture)
  const errors = captureFormErrors(capture, values)
  const locked = busy || disabled === true
  const canSubmit = isCaptureFormValid(capture, values)
  const serverOwner = isMcpSignInStep(capture) ? mcpCaptureOwner(capture) : undefined
  const showForm = open && !serverOwner
  const help = captureHelp(capture, values)

  const signInCard = isCliSignInCapture(capture)
  const { caches } = useCliConfigs()
  const signIn = useCliSignIn()
  const [code, setCode] = useState('')
  const storedName = caches.find((c) => c.id === capture.replacesId)?.name
  const signInRequest = cliSignInRequest(capture, values, storedName)
  // A container sign-in cannot open the browser: a tab opened during the click
  // (so it is not popup-blocked) is pointed at the link once it streams in.
  const pendingTabRef = useRef<Window | null>(null)
  useEffect(() => {
    const tab = pendingTabRef.current
    if (!signIn.url || !tab) return
    pendingTabRef.current = null
    if (!tab.closed) tab.location.href = signIn.url
  }, [signIn.url])

  const errorFor = (name: CredentialCaptureFieldName) =>
    touched.includes(name) ? errors[name] : undefined
  const set = (name: CredentialCaptureFieldName, value: string) =>
    setValues((prev) => captureFormWith(prev, name, value))
  const lookedUp = useJiraCloudIdLookup(
    fixedCloudIdStatus ? undefined : captureCloudIdSite(capture, values),
    (cloudId) => setValues((prev) => ({ ...prev, cloudId })),
  )
  const cloudIdStatus = fixedCloudIdStatus ?? lookedUp
  const hintFor = (name: CredentialCaptureFieldName) =>
    errorFor(name) ??
    (name === 'cloudId' ? jiraCloudIdHint(cloudIdStatus, values.cloudId ?? '') : undefined)
  const markTouched = (name: CredentialCaptureFieldName) =>
    setTouched((prev) => (prev.includes(name) ? prev : [...prev, name]))

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(captureFailureText(capture, err, fallback))
    }
    setBusy(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (locked || !canSubmit) return
    if (signInCard) {
      if (signIn.loginId || signIn.starting) return
      if (CLI_CLIENT_OPENS_LOGIN_URL.has(signInRequest.cli)) {
        pendingTabRef.current = window.open('about:blank', '_blank')
      }
      void signIn.start(signInRequest).then((id) => {
        if (id === null) pendingTabRef.current?.close()
      })
      return
    }
    void run(async () => {
      await onSubmit(captureSubmitBody(capture, values))
      setValues(emptyCaptureForm(capture))
      setTouched([])
    }, CAPTURE_SUBMIT_ERROR)
  }

  return (
    <CaptureCardShell capture={capture}>
      {serverOwner ? (
        <McpServerCaptureSignIn capture={capture} owner={serverOwner} onCancel={onCancel} />
      ) : null}

      {showForm ? (
        <form
          onSubmit={submit}
          className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2"
        >
          <p className="text-[11px] text-(--text-secondary) wrap-break-word">
            {captureFormNote(capture)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {captureFields(capture, values).map((field) => (
              <div key={field.name} className={field.type === 'secret' ? 'sm:col-span-2' : ''}>
                <Field label={field.label} hint={hintFor(field.name)}>
                  {field.type === 'select' ? (
                    <NativeSelect
                      value={values[field.name]}
                      onChange={(e) => set(field.name, e.target.value)}
                      disabled={locked || signIn.loginId !== null}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : field.type === 'secret' ? (
                    <SecretInput
                      size="sm"
                      value={values[field.name]}
                      onChange={(e) => set(field.name, e.target.value)}
                      onBlur={() => markTouched(field.name)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={locked}
                      invalid={Boolean(errorFor(field.name))}
                    />
                  ) : (
                    <Input
                      size="sm"
                      type={field.type === 'email' ? 'email' : 'text'}
                      value={values[field.name]}
                      onChange={(e) => set(field.name, e.target.value)}
                      onBlur={() => markTouched(field.name)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      disabled={locked || signIn.loginId !== null}
                      invalid={Boolean(errorFor(field.name))}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>

          {help ? <CredentialHelpPanel help={help} /> : null}

          {signIn.loginId ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-(--border-default) bg-(--surface-base) p-2">
              {signIn.url ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={signIn.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-(--accent-primary) underline"
                    >
                      {CLI_SIGN_IN_OPEN_LINK}
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void navigator.clipboard?.writeText(signIn.url ?? '')}
                    >
                      {CLI_SIGN_IN_COPY_LINK}
                    </Button>
                  </div>
                  <span className="text-[11px] text-(--text-secondary)">
                    {CLI_SIGN_IN_AUTHORIZE_HINT}
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-(--text-secondary)">{CLI_SIGN_IN_STARTING}</span>
              )}
              {signIn.needsCode ? (
                <Field label={CLI_SIGN_IN_CODE_LABEL}>
                  <div className="flex items-center gap-2">
                    <Input
                      size="sm"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        void signIn.submitCode(code).then(() => setCode(''))
                      }}
                      placeholder={CLI_SIGN_IN_CODE_PLACEHOLDER}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void signIn.submitCode(code).then(() => setCode(''))}
                    >
                      {CLI_SIGN_IN_CODE_SUBMIT}
                    </Button>
                  </div>
                </Field>
              ) : null}
            </div>
          ) : null}

          {signIn.error ? <Alert>{signIn.error}</Alert> : null}
          {error ? <Alert>{error}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={locked}
              onClick={() =>
                void run(async () => {
                  await signIn.cancel()
                  await onCancel()
                }, CAPTURE_CANCEL_ERROR)
              }
            >
              {CAPTURE_CANCEL_LABEL}
            </Button>
            {signIn.loginId === null ? (
              <Button
                type="submit"
                size="sm"
                loading={busy || signIn.starting}
                disabled={locked || !canSubmit}
              >
                {captureSubmitLabel(capture)}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </CaptureCardShell>
  )
}
