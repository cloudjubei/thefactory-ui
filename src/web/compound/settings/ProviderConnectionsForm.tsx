import { useState } from 'react'
import type { FormEvent } from 'react'
import type {
  GetProviderConnectionResponse,
  ProviderConnectionCreateInput,
} from '../../../headless/api'
import {
  JIRA_TOKEN_COPY,
  JIRA_TOKEN_TYPES,
  PROVIDER_CONNECTION_DEFAULT_LAYOUT,
  PROVIDER_CONNECTION_DEFAULT_METHOD,
  PROVIDER_CONNECTION_OPTIONS,
  PROVIDER_OAUTH_COPY,
  extractErrorMessage,
  isOAuthConnection,
  jiraCloudIdHint,
  jiraCloudIdProblem,
  jiraCloudIdSiteOf,
  providerBaseUrlProblem,
  providerConnectionDraftOf,
  providerConnectionDraftProblem,
  providerConnectionDraftWithSite,
  providerConnectionFieldsOf,
  providerConnectionLabel,
  providerConnectionSpec,
  providerOAuthDraftProblem,
  providerOAuthStartBody,
  providerTokenFieldCopy,
  useJiraCloudIdLookup,
  useProviderOAuthFlow,
  type JiraCloudIdStatus,
  type JiraTokenType,
  type ProviderConnectionDraft,
  type ProviderConnectionEditInput,
  type ProviderConnectionFormLayout,
  type ProviderConnectionMethod,
  type ProviderOAuthActions,
  type ProviderOAuthState,
} from '../../../headless'
import { Alert, Button, Field, Input, NativeSelect, SecretInput, SegmentedControl } from '../..'
import ProviderOAuthWaiting from './ProviderOAuthWaiting'

type ProviderConnectionsFormMode =
  | { kind: 'create'; onSubmit: (input: ProviderConnectionCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      connection: GetProviderConnectionResponse
      onSubmit: (patch: ProviderConnectionEditInput) => Promise<unknown>
    }

export type ProviderConnectionsFormProps = {
  mode: ProviderConnectionsFormMode
  onCancel: () => void
  /** Sign in with a provider. Without it the form offers tokens alone. */
  oauth?: ProviderOAuthActions
  /** How sign-in is offered beside a token. */
  layout?: ProviderConnectionFormLayout
  /** Start with this in the form. */
  initialDraft?: Partial<ProviderConnectionDraft>
  /** Start on this way of connecting. */
  initialMethod?: ProviderConnectionMethod
  /** Start at this step of a sign-in. */
  initialSignIn?: ProviderOAuthState
  /** Hold finding the cloud id at this stage, for a fixed showcase state. */
  fixedCloudIdStatus?: JiraCloudIdStatus
}

/** A desktop window's `window.open` goes to the system browser through its main process. */
function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ProviderConnectionsForm({
  mode,
  onCancel,
  oauth,
  layout = PROVIDER_CONNECTION_DEFAULT_LAYOUT,
  initialDraft,
  initialMethod = PROVIDER_CONNECTION_DEFAULT_METHOD,
  initialSignIn,
  fixedCloudIdStatus,
}: ProviderConnectionsFormProps) {
  const initial = mode.kind === 'edit' ? mode.connection : undefined
  const [draft, setDraft] = useState<ProviderConnectionDraft>({
    ...providerConnectionDraftOf(initial),
    ...initialDraft,
  })
  const [chosenMethod, setChosenMethod] = useState(initialMethod)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = useProviderOAuthFlow(oauth, initialSignIn)

  const isCreate = mode.kind === 'create'
  const signedIn = initial !== undefined && isOAuthConnection(initial)
  const spec = providerConnectionSpec(draft.provider)
  const offersSignIn = isCreate && oauth !== undefined && spec.oauth !== undefined
  const method = offersSignIn ? chosenMethod : 'token'
  const urlProblem = providerBaseUrlProblem(draft)
  const set = (patch: Partial<ProviderConnectionDraft>) => setDraft({ ...draft, ...patch })
  const saving = { creating: isCreate, ...(initial ? { stored: initial } : {}) }
  const tokenCopy = providerTokenFieldCopy(draft, saving)
  const lookedUp = useJiraCloudIdLookup(
    method === 'token' && !signedIn && !fixedCloudIdStatus ? jiraCloudIdSiteOf(draft) : undefined,
    (cloudId) => setDraft((current) => ({ ...current, cloudId })),
  )
  const cloudIdStatus = fixedCloudIdStatus ?? lookedUp

  const canSubmit = signedIn
    ? draft.name.trim().length > 0
    : providerConnectionDraftProblem(draft, saving) === undefined
  const canConnect = offersSignIn && providerOAuthDraftProblem(draft) === undefined

  const connect = async () => {
    if (!canConnect) return
    const page = await signIn.start(draft.provider, providerOAuthStartBody(draft))
    if (page) openInBrowser(page)
  }

  const finish = async (address: string) => {
    if (await signIn.finish(address)) onCancel()
  }

  const save = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const fields = providerConnectionFieldsOf(draft, initial)
      if (mode.kind === 'create') {
        await mode.onSubmit(fields as ProviderConnectionCreateInput)
      } else {
        await mode.onSubmit(signedIn ? { name: fields.name } : fields)
      }
      onCancel()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the connection'))
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void (method === 'oauth' ? connect() : save())
  }

  if (signIn.step === 'waiting' || signIn.step === 'finishing') {
    const page = signIn.step === 'waiting' ? signIn.page : undefined
    return (
      <ProviderOAuthWaiting
        error={signIn.error}
        finishing={signIn.step === 'finishing'}
        onOpenAgain={() => {
          if (page) openInBrowser(page)
        }}
        onFinish={(address) => void finish(address)}
        onStartOver={signIn.reset}
      />
    )
  }

  const connectAction = spec.oauth?.action ?? ''
  const cloudIdField = spec.oauth?.cloudId ? (
    <Field label={PROVIDER_OAUTH_COPY.cloudIdLabel} hint={PROVIDER_OAUTH_COPY.cloudIdHint}>
      <Input
        value={draft.cloudId}
        onChange={(e) => set({ cloudId: e.target.value })}
        placeholder={PROVIDER_OAUTH_COPY.cloudIdPlaceholder}
        autoComplete="off"
        spellCheck={false}
      />
    </Field>
  ) : null
  const tokenFields = (
    <>
      {spec.username ? (
        <Field label={spec.username.label} hint={spec.username.hint}>
          <Input
            type="email"
            value={draft.username}
            onChange={(e) => set({ username: e.target.value })}
            placeholder={spec.username.placeholder}
            autoComplete="off"
          />
        </Field>
      ) : null}
      {spec.baseUrl ? (
        <Field label={spec.baseUrl.label} hint={spec.baseUrl.hint} error={urlProblem}>
          <Input
            value={draft.baseUrl}
            onChange={(e) => setDraft(providerConnectionDraftWithSite(draft, e.target.value))}
            placeholder={spec.baseUrl.placeholder}
            autoComplete="off"
          />
        </Field>
      ) : null}
      {draft.provider === 'jira' ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{JIRA_TOKEN_COPY.typeLabel}</span>
          <SegmentedControl
            ariaLabel={JIRA_TOKEN_COPY.typeLabel}
            value={draft.tokenType}
            onChange={(next) => set({ tokenType: next as JiraTokenType })}
            options={[...JIRA_TOKEN_TYPES]}
          />
        </div>
      ) : null}
      {draft.provider === 'jira' && draft.tokenType === 'scoped' ? (
        <Field
          label={JIRA_TOKEN_COPY.cloudIdLabel}
          hint={jiraCloudIdHint(cloudIdStatus, draft.cloudId)}
          error={jiraCloudIdProblem(draft)}
        >
          <Input
            value={draft.cloudId}
            onChange={(e) => set({ cloudId: e.target.value })}
            placeholder={JIRA_TOKEN_COPY.cloudIdPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      ) : null}
      <Field label={tokenCopy.label} hint={tokenCopy.hint}>
        <SecretInput
          value={draft.token}
          onChange={(e) => set({ token: e.target.value })}
          placeholder={spec.token.placeholder}
          autoComplete="off"
          spellCheck={false}
          revealConfirmDescription="The token will be visible until you leave this page."
        />
      </Field>
    </>
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}
      {signIn.error ? <Alert>{signIn.error}</Alert> : null}

      <Field label="Name" hint="A label for this connection, e.g. “Acme Jira”.">
        <Input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Acme Jira / My GitHub"
          autoFocus
        />
      </Field>

      {signedIn ? (
        <span className="text-sm text-(--text-secondary)">
          {PROVIDER_OAUTH_COPY.connected(providerConnectionLabel(draft.provider))}
        </span>
      ) : (
        <Field label="Provider">
          <NativeSelect value={draft.provider} onChange={(e) => set({ provider: e.target.value })}>
            {PROVIDER_CONNECTION_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {offersSignIn && layout === 'choice' ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{PROVIDER_OAUTH_COPY.methodLabel}</span>
          <SegmentedControl
            ariaLabel={PROVIDER_OAUTH_COPY.methodLabel}
            value={method}
            onChange={(next) => setChosenMethod(next as ProviderConnectionMethod)}
            options={[
              { value: 'token', label: PROVIDER_OAUTH_COPY.tokenMethod },
              { value: 'oauth', label: connectAction },
            ]}
          />
        </div>
      ) : null}

      {offersSignIn && layout === 'button-first' ? (
        <>
          {cloudIdField}
          <Button
            type="button"
            variant="secondary"
            loading={signIn.step === 'opening'}
            disabled={!canConnect}
            onClick={() => void connect()}
          >
            {connectAction}
          </Button>
          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
            <span className="h-px flex-1 bg-(--border-subtle)" />
            {PROVIDER_OAUTH_COPY.orDivider}
            <span className="h-px flex-1 bg-(--border-subtle)" />
          </div>
        </>
      ) : null}

      {signedIn
        ? null
        : method === 'oauth' && layout !== 'button-first'
          ? cloudIdField
          : tokenFields}

      {offersSignIn && layout === 'link-below' ? (
        <button
          type="button"
          className="self-start text-xs text-(--text-secondary) underline"
          onClick={() => setChosenMethod(method === 'oauth' ? 'token' : 'oauth')}
        >
          {method === 'oauth'
            ? PROVIDER_OAUTH_COPY.useToken
            : PROVIDER_OAUTH_COPY.useSignIn(connectAction)}
        </button>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {method === 'oauth' && layout !== 'button-first' ? (
          <Button type="submit" loading={signIn.step === 'opening'} disabled={!canConnect}>
            {connectAction}
          </Button>
        ) : (
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {isCreate ? 'Add connection' : 'Save'}
          </Button>
        )}
      </div>
    </form>
  )
}
