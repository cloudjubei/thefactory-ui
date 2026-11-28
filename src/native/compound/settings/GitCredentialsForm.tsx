import { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import { IconSave } from '../../icons/IconSave'

type GitCredentialsFormMode =
  | { kind: 'create'; onSubmit: (input: GitCredentialCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      credentials: GetGitCredentialResponse
      onSubmit: (patch: GitCredentialEditInput) => Promise<unknown>
    }

export interface GitCredentialsFormProps {
  mode: GitCredentialsFormMode
  onCancel: () => void
}

/**
 * Native peer of the web `GitCredentialsForm`: on create, a GitHub sign-in
 * shown inside the app (the backend keeps what it leaves) or a pasted token;
 * on edit, the pasted token with a Save icon.
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
  // PAT is collapsed by default in create mode so OAuth is visually the
  // primary affordance. Always expanded in edit mode.
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

  const handleSubmitPat = useCallback(async () => {
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
  }, [mode, name, username, email, token, host, patCanSubmit, submitting, onCancel])

  // Edit mode: paste-only PAT form, Save icon.
  if (!isCreate) {
    return (
      <View style={{ gap: 12 }}>
        {error && <Alert variant="error">{error}</Alert>}
        <Field label="Name" hint={GIT_CREDENTIAL_NAME_HINT}>
          <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
        </Field>
        <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
          <Input
            value={host}
            onChangeText={setHost}
            placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="Username">
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </Field>
        <Field label="Personal access token">
          <SecretInput
            value={token}
            onChangeText={setToken}
            placeholder={
              hasStoredToken
                ? 'Stored — type a new token to replace it'
                : GIT_CREDENTIAL_TOKEN_PLACEHOLDER
            }
            revealConfirmDescription="The token will be visible until you leave this screen."
            {...storedTokenReveal}
          />
        </Field>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button
            variant="secondary"
            size="icon"
            loading={submitting}
            disabled={!patCanSubmit}
            accessibilityLabel="Save"
            onPress={() => void handleSubmitPat()}
          >
            <IconSave size={18} />
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: 16 }}>
      {error && <Alert variant="error">{error}</Alert>}

      <Field
        label="Label (optional)"
        hint="Shown in the credentials list. Defaults to “GitHub OAuth (<login>)”."
      >
        <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
      </Field>

      {github.state.error && <Alert variant="error">{github.state.error}</Alert>}
      <Button loading={github.busy} onPress={github.start}>
        {GITHUB_SIGN_IN_TEXT.signIn}
      </Button>

      <View className="border-t border-[var(--border-subtle)]" style={{ paddingTop: 12, gap: 8 }}>
        {!showPatForm ? (
          <Pressable onPress={() => setShowPatForm(true)} style={{ alignSelf: 'flex-start' }}>
            <Text
              className="text-[var(--text-secondary)]"
              style={{ fontSize: 11, textDecorationLine: 'underline' }}
            >
              Or paste a Personal Access Token
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: 12 }}>
            <Text className="text-[11px] text-[var(--text-secondary)]">
              {GIT_CREDENTIAL_PAT_NOTE}
            </Text>
            <Field label="Name">
              <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
            </Field>
            <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
              <Input
                value={host}
                onChangeText={setHost}
                placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Field label="Username">
              <Input
                value={username}
                onChangeText={setUsername}
                placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Field label="Email">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </Field>
            <Field label="Personal access token">
              <SecretInput
                value={token}
                onChangeText={setToken}
                placeholder={
                  hasStoredToken
                    ? 'Stored — type a new token to replace it'
                    : GIT_CREDENTIAL_TOKEN_PLACEHOLDER
                }
                revealConfirmDescription="The token will be visible until you leave this screen."
                {...storedTokenReveal}
              />
            </Field>
            <View
              style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}
            >
              <Button variant="secondary" onPress={() => setShowPatForm(false)}>
                Cancel
              </Button>
              <Button
                loading={submitting}
                disabled={!patCanSubmit}
                onPress={() => void handleSubmitPat()}
              >
                Add credentials
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
