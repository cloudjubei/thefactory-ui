import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  GetGitCredentialResponse,
  GitCredentialCreateInput,
  GitCredentialEditInput,
} from '../../../headless/api'
import { revealStoredGitToken } from '../../../headless/api'
import { useGithubSignIn } from '../../../headless/hooks/useGithubSignIn'
import { GITHUB_SIGN_IN_TEXT } from '../../../headless/utils/githubSignInConstants'
import { normalizeGitCredentialHost } from '../../../headless/utils/gitCredentials'
import {
  GIT_CREDENTIAL_HOST_HINT,
  GIT_CREDENTIAL_HOST_LABEL,
  GIT_CREDENTIAL_HOST_PLACEHOLDER,
  GIT_CREDENTIAL_NAME_HINT,
  GIT_CREDENTIAL_PAT_NOTE,
  GIT_CREDENTIAL_TOKEN_PLACEHOLDER,
  GIT_CREDENTIAL_USERNAME_PLACEHOLDER,
} from '../../../headless/utils/gitCredentialConstants'
import { Alert, Button, Field, Input, SecretInput } from '../..'
import { IconSave } from '../../icons'

type GitCredentialsFormMode =
  | { kind: 'create'; onSubmit: (input: GitCredentialCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      credentials: GetGitCredentialResponse
      onSubmit: (patch: GitCredentialEditInput) => Promise<unknown>
    }

export type GitCredentialsFormProps = {
  mode: GitCredentialsFormMode
  onCancel: () => void
}

/**
 * A git credential: on create, a GitHub sign-in shown inside the app (the
 * backend keeps what it leaves) or a pasted token; on edit, the pasted token.
 */
export default function GitCredentialsForm({ mode, onCancel }: GitCredentialsFormProps) {
  const initial = mode.kind === 'edit' ? mode.credentials : null
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  // The stored token never comes back with the credential (the eye fetches it
  // when asked): on edit the field starts blank, and blank means "keep the
  // stored token".
  const [token, setToken] = useState('')
  const hasStoredToken = initial?.hasToken === true
  const storedTokenReveal =
    initial && hasStoredToken ? { onReveal: () => revealStoredGitToken(initial.id) } : {}
  const [host, setHost] = useState(initial?.host ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = mode.kind === 'create'
  const showPatFallback = isCreate
  const [showPatForm, setShowPatForm] = useState(!isCreate)
  const github = useGithubSignIn('git-credential', name)
  const signedIn = github.state.step === 'done'

  useEffect(() => {
    if (signedIn) onCancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  const patCanSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    (token.trim().length > 0 || hasStoredToken)

  const onSubmitPat = async (e: FormEvent) => {
    e.preventDefault()
    if (!patCanSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const normalizedHost = normalizeGitCredentialHost(host)
      const fields = {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        ...(normalizedHost ? { host: normalizedHost } : {}),
      }
      if (mode.kind === 'create') await mode.onSubmit({ ...fields, token: token.trim() })
      else await mode.onSubmit(token.trim() ? { ...fields, token: token.trim() } : fields)
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit mode: paste-only PAT form (no OAuth tabs). Keeps the existing
  // shape exactly — a user re-authorising via OAuth creates a fresh
  // credential rather than rotating an existing one.
  if (!isCreate) {
    return (
      <form onSubmit={onSubmitPat} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name" hint={GIT_CREDENTIAL_NAME_HINT}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Personal / Work / Org"
            autoFocus
          />
        </Field>
        <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Username">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="off"
          />
        </Field>
        <Field label="Personal access token">
          <SecretInput
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={
              hasStoredToken
                ? 'Stored — type a new token to replace it'
                : GIT_CREDENTIAL_TOKEN_PLACEHOLDER
            }
            autoComplete="off"
            spellCheck={false}
            revealConfirmDescription="The token will be visible until you leave this page."
            {...storedTokenReveal}
          />
        </Field>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            loading={submitting}
            disabled={!patCanSubmit}
            title="Save"
            aria-label="Save"
          >
            <IconSave className="w-4 h-4" />
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <Field
        label="Label (optional)"
        hint="Shown in the credentials list. Defaults to “GitHub OAuth (<login>)”."
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Personal / Work / Org"
          autoFocus
        />
      </Field>

      {github.state.error && <Alert>{github.state.error}</Alert>}
      <Button type="button" loading={github.busy} onClick={github.start}>
        {GITHUB_SIGN_IN_TEXT.signIn}
      </Button>

      {showPatFallback && (
        <div className="border-t border-(--border-subtle) pt-3 flex flex-col gap-2">
          {!showPatForm ? (
            <button
              type="button"
              onClick={() => setShowPatForm(true)}
              className="self-start text-[11px] text-(--text-secondary) underline hover:text-(--text-primary)"
            >
              Or paste a Personal Access Token
            </button>
          ) : (
            <form onSubmit={onSubmitPat} className="flex flex-col gap-3">
              <div className="text-[11px] text-(--text-secondary)">{GIT_CREDENTIAL_PAT_NOTE}</div>
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Personal / Work / Org"
                />
              </Field>
              <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Username">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </Field>
              <Field label="Personal access token">
                <SecretInput
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    hasStoredToken
                      ? 'Stored — type a new token to replace it'
                      : GIT_CREDENTIAL_TOKEN_PLACEHOLDER
                  }
                  autoComplete="off"
                  spellCheck={false}
                  revealConfirmDescription="The token will be visible until you leave this page."
                  {...storedTokenReveal}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setShowPatForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} disabled={!patCanSubmit}>
                  Add credentials
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
