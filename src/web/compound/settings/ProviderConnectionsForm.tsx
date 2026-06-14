import { useState } from 'react'
import type { FormEvent } from 'react'
import type {
  GetProviderConnectionResponse,
  ProviderConnectionCreateInput,
} from '../../../headless/api'
import type { ProviderConnectionEditInput } from '../../../headless'
import { Alert, Button, Field, Input, NativeSelect, SecretInput } from '../..'

/** The ticket providers the connectors support (GitHub Issues + Jira in Phase 1). */
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

export type ProviderConnectionsFormProps = {
  mode: ProviderConnectionsFormMode
  onCancel: () => void
}

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
  const needsUsername = provider === 'jira' // Jira authenticates with email:token
  const needsBaseUrl = provider === 'jira' // Jira's site URL is required

  const canSubmit =
    name.trim().length > 0 &&
    provider.trim().length > 0 &&
    (isCreate ? token.trim().length > 0 : true) &&
    (!needsUsername || username.trim().length > 0) &&
    (!needsBaseUrl || baseUrl.trim().length > 0)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const fields = {
        name: name.trim(),
        provider: provider.trim(),
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        // On edit, a blank token leaves the stored one untouched.
        ...(token.trim() ? { token: token.trim() } : {}),
      }
      if (mode.kind === 'create') {
        await mode.onSubmit(fields as ProviderConnectionCreateInput)
      } else {
        await mode.onSubmit(fields)
      }
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the connection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Name" hint="A label for this connection, e.g. “Acme Jira”.">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Jira / My GitHub"
          autoFocus
        />
      </Field>

      <Field label="Provider">
        <NativeSelect value={provider} onChange={(e) => setProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {needsUsername && (
        <Field
          label="Account email"
          hint="Jira authenticates with your account email + an API token."
        >
          <Input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            autoComplete="off"
          />
        </Field>
      )}

      {needsBaseUrl && (
        <Field label="Site URL" hint="Your Jira Cloud site, e.g. https://acme.atlassian.net.">
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-domain.atlassian.net"
            autoComplete="off"
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
          onChange={(e) => setToken(e.target.value)}
          placeholder={provider === 'github' ? 'ghp_… / github_pat_…' : 'Jira API token'}
          autoComplete="off"
          spellCheck={false}
          revealConfirmDescription="The token will be visible until you leave this page."
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!canSubmit}>
          {isCreate ? 'Add connection' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
