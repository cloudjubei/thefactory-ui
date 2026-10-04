import { useState } from 'react'
import { View } from 'react-native'
import type {
  GetProviderConnectionResponse,
  ProviderConnectionCreateInput,
} from '../../../headless/api'
import type { ProviderConnectionEditInput } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

/** The ticket providers the connectors support. */
const PROVIDERS = [
  { value: 'github', label: 'GitHub Issues' },
  { value: 'jira', label: 'Jira' },
] as const

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
}

/**
 * Native peer of web's `ProviderConnectionsForm`: name, provider, Jira's account
 * email + site URL, and the API token (on edit, blank keeps the stored one).
 */
export default function ProviderConnectionsForm({ mode, onCancel }: ProviderConnectionsFormProps) {
  const initial = mode.kind === 'edit' ? mode.connection : null
  const [name, setName] = useState(initial?.name ?? '')
  const [provider, setProvider] = useState(initial?.provider ?? 'github')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = mode.kind === 'create'
  const isJira = provider === 'jira'

  const canSubmit =
    name.trim().length > 0 &&
    (isCreate ? token.trim().length > 0 : true) &&
    (!isJira || username.trim().length > 0) &&
    (!isJira || baseUrl.trim().length > 0)

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const fields = {
        name: name.trim(),
        provider,
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(token.trim() ? { token: token.trim() } : {}),
      }
      if (mode.kind === 'create') await mode.onSubmit(fields as ProviderConnectionCreateInput)
      else await mode.onSubmit(fields)
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the connection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="gap-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Name" hint="A label for this connection, e.g. “Acme Jira”.">
        <Input value={name} onChangeText={setName} placeholder="Acme Jira / My GitHub" />
      </Field>

      <Field label="Provider">
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isJira && (
        <Field
          label="Account email"
          hint="Jira authenticates with your account email + an API token."
        >
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      )}

      {isJira && (
        <Field label="Site URL" hint="Your Jira Cloud site, e.g. https://acme.atlassian.net.">
          <Input
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://your-domain.atlassian.net"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      )}

      <Field
        label={isCreate ? 'API token' : 'New API token (optional)'}
        hint={
          provider === 'github'
            ? 'A GitHub PAT with the Issues / repo scope.'
            : isCreate
              ? 'A Jira API token from id.atlassian.com.'
              : 'Leave blank to keep the current token.'
        }
      >
        <SecretInput
          value={token}
          onChangeText={setToken}
          placeholder={provider === 'github' ? 'ghp_… / github_pat_…' : 'Jira API token'}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      <View className="flex-row justify-end gap-2 pt-2">
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button onPress={() => void submit()} loading={submitting} disabled={!canSubmit}>
          {isCreate ? 'Add connection' : 'Save'}
        </Button>
      </View>
    </View>
  )
}
