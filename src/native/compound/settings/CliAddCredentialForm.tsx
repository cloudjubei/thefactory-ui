import { useState } from 'react'
import { Text, View } from 'react-native'
import type { CliTool } from '../../../headless/api'
import { useCliSignIn } from '../../../headless/hooks/useCliSignIn'
import { CLI_SIGN_IN_TEXT } from '../../../headless/utils/cliSignInConstants'
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
import { nativeSpace } from '../../../tokens/native'
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
 * credential" flow shown in a modal: pick a CLI + label and sign it in inside
 * the app — the provider's page shows on the app's sign-in screen — and close
 * once the new login is saved. The list lives in {@link CliConfigForm}; both
 * share `useCliConfigs()`.
 */
export function CliAddCredentialForm({ onClose }: CliAddCredentialFormProps) {
  const { theme } = useNativeTheme()
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
    <View style={{ gap: nativeSpace[4] }}>
      {signIn.error ? <Alert variant="error">{signIn.error}</Alert> : null}
      <Field label="CLI">
        <Select value={addCli} onValueChange={(v) => setAddCli(v as CliTool)}>
          <SelectTrigger disabled={signingIn}>
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
          disabled={signingIn}
        />
      </Field>

      {signingIn && !signIn.starting ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {CLI_SIGN_IN_TEXT.signingIn}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
        <Button variant="secondary" onPress={() => void handleCancel()}>
          Cancel
        </Button>
        <Button loading={signIn.starting} onPress={startAuthorize}>
          Authorize
        </Button>
      </View>
    </View>
  )
}

export default CliAddCredentialForm
