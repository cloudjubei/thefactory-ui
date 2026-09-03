import { useEffect, useRef, useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { extractErrorMessage } from '../../../headless/api'
import type { CliTool } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import {
  CLI_CLIENT_OPENS_LOGIN_URL,
  loginAwaitsCode,
  parseLoginUrl,
} from '../../../headless/utils/cliRunner'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

const CLI_OPTIONS: ReadonlyArray<{ value: CliTool; label: string }> = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor-agent', label: 'Cursor Agent' },
  { value: 'codex', label: 'Codex' },
]

const CLI_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'cursor-agent': 'Cursor Agent',
  codex: 'Codex',
}

function cliLabel(cli: string): string {
  return CLI_LABELS[cli] ?? cli
}

export interface CliAddCredentialFormProps {
  /** Close the host modal. Called on a successful authorization and on Cancel. */
  onClose: () => void
}

/**
 * Native peer of web's `CliAddCredentialForm`. Settings → CLI agents "add
 * credential" flow shown in a modal: pick a CLI + label, run the interactive
 * login, surface the sign-in link (auto-opened for container logins) + a
 * paste-code box when asked, and close on success. The list lives in
 * {@link CliConfigForm}; both share `useCliConfigs()`.
 */
export function CliAddCredentialForm({ onClose }: CliAddCredentialFormProps) {
  const { theme } = useNativeTheme()
  const { startAuthLogin, cancelAuthLogin, submitLoginInput, loginOutput, loginResults } =
    useCliConfigs()

  const [addCli, setAddCli] = useState<CliTool>('claude-code')
  const [addLabel, setAddLabel] = useState('')
  const [authStarting, setAuthStarting] = useState(false)
  const [loginId, setLoginId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [loginInput, setLoginInput] = useState('')

  const activeResult = loginId ? loginResults[loginId] : undefined
  useEffect(() => {
    if (!loginId || !activeResult) return
    setLoginId(null)
    if (activeResult.status === 'completed') onClose()
    else setAddError(activeResult.error)
  }, [loginId, activeResult, onClose])

  const currentLoginOutput = loginId ? (loginOutput[loginId] ?? '') : ''
  const loginUrl = parseLoginUrl(currentLoginOutput)
  const needsCode = loginAwaitsCode(currentLoginOutput)

  const autoOpenedLoginRef = useRef<string | null>(null)
  useEffect(() => {
    if (!loginId || !loginUrl || !CLI_CLIENT_OPENS_LOGIN_URL.has(addCli)) return
    if (autoOpenedLoginRef.current === loginId) return
    autoOpenedLoginRef.current = loginId
    void Linking.openURL(loginUrl)
  }, [loginId, loginUrl, addCli])

  const startAuthorize = async () => {
    if (authStarting || loginId) return
    setAuthStarting(true)
    setAddError(null)
    try {
      const id = await startAuthLogin(addCli, addLabel.trim() || cliLabel(addCli))
      setLoginId(id)
    } catch (err) {
      setAddError(extractErrorMessage(err, 'Failed to start the CLI login.'))
    } finally {
      setAuthStarting(false)
    }
  }

  const handleCancel = async () => {
    if (loginId) await cancelAuthLogin(loginId).catch(() => undefined)
    onClose()
  }

  const submitCode = async () => {
    const text = loginInput.trim()
    if (!loginId || !text) return
    await submitLoginInput(loginId, text)
    setLoginInput('')
  }

  const mutedBlock = {
    borderRadius: nativeRadii[1],
    backgroundColor: theme.surface.muted,
    paddingHorizontal: nativeSpace[5],
    paddingVertical: nativeSpace[4],
  } as const

  return (
    <View style={{ gap: nativeSpace[4] }}>
      {addError ? <Alert variant="error">{addError}</Alert> : null}
      <Field label="CLI">
        <Select value={addCli} onValueChange={(v) => setAddCli(v as CliTool)}>
          <SelectTrigger>
            <SelectValue placeholder="Select CLI" />
          </SelectTrigger>
          <SelectContent>
            {CLI_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Label" hint="A name you'll recognise, e.g. “Claude Code (work)”">
        <Input
          value={addLabel}
          onChangeText={setAddLabel}
          placeholder={cliLabel(addCli)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      {loginId ? (
        <View style={{ ...mutedBlock, gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            Sign in to {cliLabel(addCli)}
          </Text>
          {loginUrl ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[3] }}>
                <Button size="sm" onPress={() => void Linking.openURL(loginUrl)}>
                  Open the sign-in page
                </Button>
              </View>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                Authorize in your browser, then return here — this updates automatically.
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Starting login…</Text>
          )}
        </View>
      ) : null}

      {loginId && needsCode ? (
        <Field label="Paste the code shown after you authorize">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
            <View style={{ flex: 1 }}>
              <Input
                value={loginInput}
                onChangeText={setLoginInput}
                placeholder="Paste code"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => void submitCode()}
              />
            </View>
            <Button onPress={() => void submitCode()}>Submit</Button>
          </View>
        </Field>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
        <Button variant="secondary" onPress={() => void handleCancel()}>
          Cancel
        </Button>
        {!loginId ? (
          <Button loading={authStarting} onPress={() => void startAuthorize()}>
            Authorize
          </Button>
        ) : null}
      </View>
    </View>
  )
}

export default CliAddCredentialForm
