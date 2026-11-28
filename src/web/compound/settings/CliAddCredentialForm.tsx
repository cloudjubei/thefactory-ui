import { useState } from 'react'
import type { CliTool } from '../../../headless/api'
import { useCliSignIn } from '../../../headless/hooks/useCliSignIn'
import { CLI_SIGN_IN_TEXT } from '../../../headless/utils/cliSignInConstants'
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
 * `LLMConfigForm`). Picks a CLI + label and signs it in inside the app: the
 * provider's page shows in the app's sign-in view, and the modal closes once
 * the new login is saved. The credential list lives in {@link CliConfigForm};
 * both share `useCliConfigs()` state.
 */
export function CliAddCredentialForm({ onClose }: CliAddCredentialFormProps) {
  const signIn = useCliSignIn(onClose)
  const [addCli, setAddCli] = useState<CliTool>('claude-code')
  const [addLabel, setAddLabel] = useState('')
  const signingIn = signIn.pending !== undefined

  const startAuthorize = () =>
    signIn.start({ cli: addCli, label: addLabel.trim() || cliLabel(addCli) })

  const handleCancel = async () => {
    await signIn.stop()
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      {signIn.error && <Alert>{signIn.error}</Alert>}
      <Field label="CLI">
        <Select value={addCli} onValueChange={(v) => setAddCli(v as CliTool)} disabled={signingIn}>
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
          disabled={signingIn}
        />
      </Field>

      {signingIn && !signIn.starting && (
        <span className="text-xs text-(--text-secondary)">{CLI_SIGN_IN_TEXT.signingIn}</span>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => void handleCancel()}>
          Cancel
        </Button>
        <Button type="button" loading={signIn.starting} onClick={startAuthorize}>
          Authorize
        </Button>
      </div>
    </div>
  )
}

export default CliAddCredentialForm
