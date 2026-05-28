import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type {
  GetGitCredentialResponse,
  GitCredentialCreateInput,
  GitCredentialEditInput,
} from '../../../headless/api'
import {
  pollGitCredentialGithubDevice,
  startGitCredentialGithubDevice,
} from '../../../headless/api'
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
  /**
   * Required on mobile — there's no `window.open` to fall back to. The
   * host wires this from `expo-web-browser.openBrowserAsync`.
   */
  openExternalUrl: (url: string) => Promise<unknown> | void
  /**
   * Optional — copies the device-flow user code to the clipboard before
   * opening the GitHub verification URL. Host wires from
   * `expo-clipboard.setStringAsync`. When omitted, the user manually
   * copies the on-screen code.
   */
  copyToClipboard?: (text: string) => Promise<unknown> | void
  /**
   * Fires after a successful device-flow authorisation lands a
   * `GitCredential` in the backend. Host typically closes the modal
   * (this component also calls `onCancel` for that, but a host may want
   * to refresh a sibling list or show a toast first).
   */
  onOauthSuccess?: (credential: GetGitCredentialResponse) => void
}

interface DeviceFlowState {
  flowId: string
  userCode: string
  verificationUri: string
  verificationUriComplete?: string
  expiresAt: number
  intervalMs: number
}

/**
 * Native peer of the web `GitCredentialsForm`. Same behavioural surface:
 *
 *   - **Create**: "Sign in with GitHub" → device flow (no redirect on
 *     native), with "Or paste a Personal Access Token" expanding the
 *     classic four-field PAT form.
 *   - **Edit**: paste-only PAT form with a Save icon.
 *
 * Device flow is the only OAuth method exposed on native — neither
 * Electron renderers nor RN can redirect into the renderer cleanly.
 */
export default function GitCredentialsForm({
  mode,
  onCancel,
  openExternalUrl,
  copyToClipboard,
  onOauthSuccess,
}: GitCredentialsFormProps) {
  const initial = mode.kind === 'edit' ? mode.credentials : null
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [token, setToken] = useState(initial?.token ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = mode.kind === 'create'
  // PAT is collapsed by default in create mode so OAuth is visually the
  // primary affordance. Always expanded in edit mode.
  const [showPatForm, setShowPatForm] = useState(!isCreate)

  const [device, setDevice] = useState<DeviceFlowState | null>(null)
  const [deviceStarting, setDeviceStarting] = useState(false)
  const [devicePolling, setDevicePolling] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  const patCanSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    token.trim().length > 0

  const handleSubmitPat = useCallback(async () => {
    if (!patCanSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await mode.onSubmit({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        token: token.trim(),
      })
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setSubmitting(false)
    }
  }, [mode, name, username, email, token, patCanSubmit, submitting, onCancel])

  // ── device flow ─────────────────────────────────────────────────────────

  const scheduleNextPoll = (flowId: string, intervalMs: number) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    pollTimerRef.current = setTimeout(() => void doPoll(flowId, intervalMs), intervalMs)
  }

  const doPoll = async (flowId: string, intervalMs: number) => {
    if (devicePolling) return
    setDevicePolling(true)
    try {
      const { data } = await pollGitCredentialGithubDevice({
        body: { flowId, scopeLabel: name.trim() || undefined },
        throwOnError: true,
      })
      if (data.status === 'authorized') {
        setDevice(null)
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current)
          pollTimerRef.current = null
        }
        onOauthSuccess?.(data.credential)
        onCancel()
        return
      }
      if (data.status === 'slow_down') {
        scheduleNextPoll(flowId, intervalMs + 5_000)
        return
      }
      scheduleNextPoll(flowId, intervalMs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub device flow failed')
      setDevice(null)
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    } finally {
      setDevicePolling(false)
    }
  }

  const startDevice = useCallback(async () => {
    if (deviceStarting || device) return
    setDeviceStarting(true)
    setError(null)
    try {
      const { data } = await startGitCredentialGithubDevice({ throwOnError: true })
      setDevice(data)
      scheduleNextPoll(data.flowId, data.intervalMs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start GitHub device flow')
    } finally {
      setDeviceStarting(false)
    }
    // scheduleNextPoll captures the latest `name` via closure of doPoll, fine
    // for the user-visible "press once" UX. Disable exhaustive-deps so we
    // don't re-create the callback every time `name` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceStarting, device])

  const cancelDevice = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setDevice(null)
  }

  const copyAndOpen = async () => {
    if (!device) return
    if (copyToClipboard) {
      try {
        await copyToClipboard(device.userCode)
      } catch {
        // Clipboard failure is non-fatal — the code is on screen.
      }
    }
    try {
      await openExternalUrl(device.verificationUriComplete ?? device.verificationUri)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open GitHub in browser')
    }
  }

  // ── render ──────────────────────────────────────────────────────────────

  // Edit mode: paste-only PAT form, Save icon.
  if (!isCreate) {
    return (
      <View style={{ gap: 12 }}>
        {error && <Alert variant="error">{error}</Alert>}
        <Field label="Name" hint="Label for these credentials, e.g. “GitHub — personal”">
          <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
        </Field>
        <Field label="Username">
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="your-github-username"
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
          <SecretInput value={token} onChangeText={setToken} placeholder="ghp_..." />
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

  // Create mode + active device-code card.
  if (device) {
    return (
      <View style={{ gap: 12 }}>
        {error && <Alert variant="error">{error}</Alert>}
        <View
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3"
          style={{ gap: 8 }}
        >
          <Text className="text-sm text-[var(--text-primary)]">
            Enter this code on GitHub to finish signing in:
          </Text>
          <Text
            className="text-[var(--text-primary)]"
            style={{ fontFamily: 'Courier', fontSize: 22, letterSpacing: 6 }}
          >
            {device.userCode}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
            <Button onPress={() => void copyAndOpen()}>
              {copyToClipboard ? 'Copy code & open GitHub' : 'Open GitHub'}
            </Button>
            <Button variant="secondary" onPress={cancelDevice}>
              Cancel
            </Button>
          </View>
          <Text className="text-[11px] text-[var(--text-secondary)]">
            Waiting for you to authorise on github.com…
          </Text>
        </View>
      </View>
    )
  }

  // Create mode: OAuth-first.
  return (
    <View style={{ gap: 16 }}>
      {error && <Alert variant="error">{error}</Alert>}

      <Field
        label="Label (optional)"
        hint="Shown in the credentials list. Defaults to “GitHub OAuth (<login>)”."
      >
        <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
      </Field>

      <View style={{ gap: 6 }}>
        <Button loading={deviceStarting} onPress={() => void startDevice()}>
          Sign in with GitHub
        </Button>
      </View>

      <View
        className="border-t border-[var(--border-subtle)]"
        style={{ paddingTop: 12, gap: 8 }}
      >
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
              Use this when you already have a PAT (e.g. fine-grained scope, CI token).
            </Text>
            <Field label="Name">
              <Input value={name} onChangeText={setName} placeholder="Personal / Work / Org" />
            </Field>
            <Field label="Username">
              <Input
                value={username}
                onChangeText={setUsername}
                placeholder="your-github-username"
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
              <SecretInput value={token} onChangeText={setToken} placeholder="ghp_..." />
            </Field>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
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
