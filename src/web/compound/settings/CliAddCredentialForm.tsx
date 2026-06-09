import { useEffect, useRef, useState } from 'react'
import { extractErrorMessage } from '../../../headless/api'
import type { CliTool } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import {
  CLI_CLIENT_OPENS_LOGIN_URL,
  loginAwaitsCode,
  parseLoginUrl,
} from '../../../headless/utils/cliRunner'
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../..'

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
 * Settings → CLI agents "add credential" flow, shown in a modal (mirrors
 * `LLMConfigForm`). Picks a CLI + label, runs the interactive login subprocess,
 * surfaces the sign-in link (auto-opened for container logins) and a paste-code
 * box when the CLI asks for one, and closes on success. The credential list
 * lives in {@link CliConfigForm}; both share `useCliConfigs()` state.
 */
export function CliAddCredentialForm({ onClose }: CliAddCredentialFormProps) {
  const { startAuthLogin, cancelAuthLogin, submitLoginInput, loginOutput, loginResults } =
    useCliConfigs()

  const [addCli, setAddCli] = useState<CliTool>('claude-code')
  const [addLabel, setAddLabel] = useState('')
  const [authStarting, setAuthStarting] = useState(false)
  const [loginId, setLoginId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [loginInput, setLoginInput] = useState('')

  // Close on success (the new credential is already refreshed into the list);
  // surface an error inline and return to the Authorize button.
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

  // Container logins (cursor) can't open the host browser; open a tab during the
  // Authorize click (so it isn't popup-blocked) and navigate it once the URL
  // streams in. Host logins (claude/codex) open it themselves — excluded.
  const pendingLoginTabRef = useRef<Window | null>(null)
  const autoOpenedLoginRef = useRef<string | null>(null)
  useEffect(() => {
    if (!loginId || !loginUrl || !CLI_CLIENT_OPENS_LOGIN_URL.has(addCli)) return
    if (autoOpenedLoginRef.current === loginId) return
    autoOpenedLoginRef.current = loginId
    const tab = pendingLoginTabRef.current
    pendingLoginTabRef.current = null
    if (tab && !tab.closed) tab.location.href = loginUrl
    else window.open(loginUrl, '_blank', 'noopener,noreferrer')
  }, [loginId, loginUrl, addCli])

  const startAuthorize = async () => {
    if (authStarting || loginId) return
    setAuthStarting(true)
    setAddError(null)
    if (CLI_CLIENT_OPENS_LOGIN_URL.has(addCli)) {
      pendingLoginTabRef.current = window.open('about:blank', '_blank')
    }
    try {
      const id = await startAuthLogin(addCli, addLabel.trim() || cliLabel(addCli))
      setLoginId(id)
    } catch (err) {
      pendingLoginTabRef.current?.close()
      pendingLoginTabRef.current = null
      setAddError(extractErrorMessage(err, 'Failed to start the CLI login.'))
    } finally {
      setAuthStarting(false)
    }
  }

  const handleCancel = async () => {
    if (pendingLoginTabRef.current && !pendingLoginTabRef.current.closed) {
      pendingLoginTabRef.current.close()
    }
    pendingLoginTabRef.current = null
    if (loginId) await cancelAuthLogin(loginId).catch(() => undefined)
    onClose()
  }

  const submitCode = async () => {
    const text = loginInput.trim()
    if (!loginId || !text) return
    await submitLoginInput(loginId, text)
    setLoginInput('')
  }

  return (
    <div className="flex flex-col gap-3">
      {addError && <Alert>{addError}</Alert>}
      <Field label="CLI">
        <Select value={addCli} onValueChange={(v) => setAddCli(v as CliTool)} disabled={!!loginId}>
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
          onChange={(e) => setAddLabel(e.target.value)}
          placeholder={cliLabel(addCli)}
          disabled={!!loginId}
        />
      </Field>

      {loginId && (
        <div className="flex flex-col gap-2 rounded-md border border-(--border-default) bg-(--surface-muted) p-3">
          <span className="text-sm font-medium text-(--text-primary)">
            Sign in to {cliLabel(addCli)}
          </span>
          {loginUrl ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-(--accent-primary) underline"
                >
                  Open the sign-in page ↗
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void navigator.clipboard?.writeText(loginUrl)}
                >
                  Copy link
                </Button>
              </div>
              <span className="text-xs text-(--text-secondary)">
                Authorize in your browser, then return here — this updates automatically.
              </span>
            </>
          ) : (
            <span className="text-xs text-(--text-secondary)">Starting login…</span>
          )}
        </div>
      )}

      {loginId && needsCode && (
        <Field label="Paste the code shown after you authorize">
          <div className="flex items-center gap-2">
            <Input
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submitCode()
                }
              }}
              placeholder="Paste code"
            />
            <Button type="button" onClick={() => void submitCode()}>
              Submit
            </Button>
          </div>
        </Field>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => void handleCancel()}>
          Cancel
        </Button>
        {!loginId && (
          <Button type="button" loading={authStarting} onClick={() => void startAuthorize()}>
            Authorize
          </Button>
        )}
      </div>
    </div>
  )
}

export default CliAddCredentialForm
