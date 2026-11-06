import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import type {
  GetProviderConnectionResponse,
  ProviderConnectionCreateInput,
} from '../../../headless/api'
import {
  JIRA_TOKEN_COPY,
  JIRA_TOKEN_TYPES,
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
  type JiraCloudIdFinder,
  type JiraTokenType,
  type ProviderConnectionDraft,
  type ProviderConnectionEditInput,
  type ProviderConnectionMethod,
  type ProviderOAuthActions,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import ProviderOAuthWaiting from './ProviderOAuthWaiting'

type ProviderConnectionsFormMode =
  | { kind: 'create'; onSubmit: (input: ProviderConnectionCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      connection: GetProviderConnectionResponse
      onSubmit: (patch: ProviderConnectionEditInput) => Promise<unknown>
    }

export interface ProviderConnectionsFormProps {
  mode: ProviderConnectionsFormMode
  onCancel: () => void
  /** Sign in with a provider. Without it the form offers tokens alone. */
  oauth?: ProviderOAuthActions
  /** Find a site's cloud id another way than the backend's, for a fixed showcase state. */
  findCloudId?: JiraCloudIdFinder
}

/**
 * Native peer of web's `ProviderConnectionsForm`, in the layout that ships: name,
 * provider, and either the provider's fields and token (on edit, blank keeps the
 * stored one) or a sign-in in the system browser.
 */
export default function ProviderConnectionsForm({
  mode,
  onCancel,
  oauth,
  findCloudId,
}: ProviderConnectionsFormProps) {
  const { theme } = useNativeTheme()
  const initial = mode.kind === 'edit' ? mode.connection : undefined
  const [draft, setDraft] = useState<ProviderConnectionDraft>(providerConnectionDraftOf(initial))
  const [chosenMethod, setChosenMethod] = useState(PROVIDER_CONNECTION_DEFAULT_METHOD)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = useProviderOAuthFlow(oauth)

  const isCreate = mode.kind === 'create'
  const signedIn = initial !== undefined && isOAuthConnection(initial)
  const spec = providerConnectionSpec(draft.provider)
  const offersSignIn = isCreate && oauth !== undefined && spec.oauth !== undefined
  const method = offersSignIn ? chosenMethod : 'token'
  const urlProblem = providerBaseUrlProblem(draft)
  const set = (patch: Partial<ProviderConnectionDraft>) => setDraft({ ...draft, ...patch })
  const saving = { creating: isCreate, ...(initial ? { stored: initial } : {}) }
  const tokenCopy = providerTokenFieldCopy(draft, saving)
  const cloudIdStatus = useJiraCloudIdLookup(
    method === 'token' && !signedIn ? jiraCloudIdSiteOf(draft) : undefined,
    (cloudId) => setDraft((current) => ({ ...current, cloudId })),
    findCloudId,
  )

  const canSubmit = signedIn
    ? draft.name.trim().length > 0
    : providerConnectionDraftProblem(draft, saving) === undefined
  const canConnect = offersSignIn && providerOAuthDraftProblem(draft) === undefined

  const connect = async () => {
    if (!canConnect) return
    const page = await signIn.start(draft.provider, providerOAuthStartBody(draft))
    if (page) await Linking.openURL(page)
  }

  const finish = async (address: string) => {
    if (await signIn.finish(address)) onCancel()
  }

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const fields = providerConnectionFieldsOf(draft, initial)
      if (mode.kind === 'create') await mode.onSubmit(fields as ProviderConnectionCreateInput)
      else await mode.onSubmit(signedIn ? { name: fields.name } : fields)
      onCancel()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the connection'))
    } finally {
      setSubmitting(false)
    }
  }

  if (signIn.step === 'waiting' || signIn.step === 'finishing') {
    const page = signIn.step === 'waiting' ? signIn.page : undefined
    return (
      <ProviderOAuthWaiting
        error={signIn.error}
        finishing={signIn.step === 'finishing'}
        onOpenAgain={() => {
          if (page) void Linking.openURL(page)
        }}
        onFinish={(address) => void finish(address)}
        onStartOver={signIn.reset}
      />
    )
  }

  return (
    <View className="gap-4">
      {error ? <Alert>{error}</Alert> : null}
      {signIn.error ? <Alert>{signIn.error}</Alert> : null}

      <Field label="Name" hint="A label for this connection, e.g. “Acme Jira”.">
        <Input
          value={draft.name}
          onChangeText={(name) => set({ name })}
          placeholder="Acme Jira / My GitHub"
        />
      </Field>

      {signedIn ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {PROVIDER_OAUTH_COPY.connected(providerConnectionLabel(draft.provider))}
        </Text>
      ) : (
        <Field label="Provider">
          <Select value={draft.provider} onValueChange={(provider) => set({ provider })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_CONNECTION_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {offersSignIn ? (
        <Field label={PROVIDER_OAUTH_COPY.methodLabel}>
          <SegmentedControl
            ariaLabel={PROVIDER_OAUTH_COPY.methodLabel}
            value={method}
            onChange={(next) => setChosenMethod(next as ProviderConnectionMethod)}
            options={[
              { value: 'token', label: PROVIDER_OAUTH_COPY.tokenMethod },
              { value: 'oauth', label: spec.oauth?.action ?? '' },
            ]}
          />
        </Field>
      ) : null}

      {signedIn ? null : method === 'oauth' ? (
        spec.oauth?.cloudId ? (
          <Field label={PROVIDER_OAUTH_COPY.cloudIdLabel} hint={PROVIDER_OAUTH_COPY.cloudIdHint}>
            <Input
              value={draft.cloudId}
              onChangeText={(cloudId) => set({ cloudId })}
              placeholder={PROVIDER_OAUTH_COPY.cloudIdPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
        ) : null
      ) : (
        <>
          {spec.username ? (
            <Field label={spec.username.label} hint={spec.username.hint}>
              <Input
                value={draft.username}
                onChangeText={(username) => set({ username })}
                placeholder={spec.username.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
          ) : null}
          {spec.baseUrl ? (
            <Field label={spec.baseUrl.label} hint={spec.baseUrl.hint} error={urlProblem}>
              <Input
                value={draft.baseUrl}
                onChangeText={(baseUrl) =>
                  setDraft(providerConnectionDraftWithSite(draft, baseUrl))
                }
                placeholder={spec.baseUrl.placeholder}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
          ) : null}
          {draft.provider === 'jira' ? (
            <Field label={JIRA_TOKEN_COPY.typeLabel}>
              <SegmentedControl
                ariaLabel={JIRA_TOKEN_COPY.typeLabel}
                value={draft.tokenType}
                onChange={(next) => set({ tokenType: next as JiraTokenType })}
                options={[...JIRA_TOKEN_TYPES]}
              />
            </Field>
          ) : null}
          {draft.provider === 'jira' && draft.tokenType === 'scoped' ? (
            <Field
              label={JIRA_TOKEN_COPY.cloudIdLabel}
              hint={jiraCloudIdHint(cloudIdStatus, draft.cloudId)}
              error={jiraCloudIdProblem(draft)}
            >
              <Input
                value={draft.cloudId}
                onChangeText={(cloudId) => set({ cloudId })}
                placeholder={JIRA_TOKEN_COPY.cloudIdPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
          ) : null}
          <Field label={tokenCopy.label} hint={tokenCopy.hint}>
            <SecretInput
              value={draft.token}
              onChangeText={(token) => set({ token })}
              placeholder={spec.token.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
        </>
      )}

      <View className="flex-row justify-end gap-2 pt-2">
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        {method === 'oauth' ? (
          <Button
            onPress={() => void connect()}
            loading={signIn.step === 'opening'}
            disabled={!canConnect}
          >
            {spec.oauth?.action ?? ''}
          </Button>
        ) : (
          <Button onPress={() => void submit()} loading={submitting} disabled={!canSubmit}>
            {isCreate ? 'Add connection' : 'Save'}
          </Button>
        )}
      </View>
    </View>
  )
}
