import { Text, View } from 'react-native'

import {
  PROCESS_INTEGRATION_CHECK_MERGE,
  RUN_PROPOSAL_LANDING_LABELS,
  RUN_PROPOSAL_LANDING_MODE_LABELS,
  processIntegrationAccountLabel,
  processIntegrationIdentityLabel,
  runProposalLandingLine,
  runProposalLandingProblem,
  runProposalLandingWithMode,
  type ProcessIntegrationForm,
  type RunProposalLanding,
} from '../../../headless'
import { nativeFontFamilies, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'

export type RunProposalLandingEditorProps = {
  landing: RunProposalLanding
  /** The form as the person is setting it; absent when there is nothing to choose. */
  form: ProcessIntegrationForm | undefined
  busy: boolean
  onChange: (form: ProcessIntegrationForm) => void
}

/** Native peer of web's `RunProposalLandingEditor`: how approved work lands, shown and changeable on the card. */
export default function RunProposalLandingEditor({
  landing,
  form,
  busy,
  onChange,
}: RunProposalLandingEditorProps) {
  const { theme, status } = useNativeTheme()
  const options = landing.options
  const line = runProposalLandingLine(landing, form)
  const lineStyle = { fontSize: 12, fontWeight: '600' as const, color: theme.text.primary }
  if (!form || !options) return <Text style={lineStyle}>{line}</Text>
  const problem = runProposalLandingProblem(form, options)
  const set = (patch: Partial<ProcessIntegrationForm>) => onChange({ ...form, ...patch })
  const label = { fontSize: 12, fontWeight: '500' as const, color: theme.text.secondary }
  const mono = { fontFamily: nativeFontFamilies.mono, fontSize: 12 }

  return (
    <View style={{ gap: nativeSpace[2], paddingVertical: nativeSpace[2] }}>
      <Text style={lineStyle}>{line}</Text>
      {landing.modes.length > 1 ? (
        <SegmentedControl
          options={landing.modes.map((mode) => ({
            value: mode,
            label: RUN_PROPOSAL_LANDING_MODE_LABELS[mode] ?? mode,
          }))}
          value={form.mode}
          onChange={(mode) =>
            onChange(
              runProposalLandingWithMode(form, mode as ProcessIntegrationForm['mode'], options),
            )
          }
        />
      ) : null}
      {form.mode === 'pull-request' ? (
        <>
          <Text style={label}>{RUN_PROPOSAL_LANDING_LABELS.account}</Text>
          <Select value={form.accountId ?? ''} onValueChange={(accountId) => set({ accountId })}>
            <SelectTrigger>
              <SelectValue placeholder={RUN_PROPOSAL_LANDING_LABELS.account} />
            </SelectTrigger>
            <SelectContent>
              {options.accounts.map((a) => (
                <SelectItem key={a.credentialId} value={a.credentialId}>
                  {processIntegrationAccountLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text style={label}>{RUN_PROPOSAL_LANDING_LABELS.prTitle}</Text>
          <Input
            value={form.prTitle}
            disabled={busy}
            onChangeText={(prTitle) => set({ prTitle })}
          />
          <Text style={label}>{RUN_PROPOSAL_LANDING_LABELS.prBody}</Text>
          <Textarea
            rows={4}
            value={form.prBody}
            disabled={busy}
            onChangeText={(prBody) => set({ prBody })}
            style={mono}
          />
        </>
      ) : (
        <>
          <Text style={label}>{RUN_PROPOSAL_LANDING_LABELS.identity}</Text>
          <Select value={form.identityId ?? ''} onValueChange={(identityId) => set({ identityId })}>
            <SelectTrigger>
              <SelectValue placeholder={RUN_PROPOSAL_LANDING_LABELS.identity} />
            </SelectTrigger>
            <SelectContent>
              {options.identities.map((i) => (
                <SelectItem key={i.credentialId} value={i.credentialId}>
                  {processIntegrationIdentityLabel(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text style={label}>{RUN_PROPOSAL_LANDING_LABELS.message}</Text>
          <Textarea
            rows={3}
            value={form.message}
            disabled={busy}
            onChangeText={(message) => set({ message })}
            style={mono}
          />
          <Switch
            checked={form.checkMerge}
            disabled={busy}
            onCheckedChange={(checkMerge) => set({ checkMerge })}
            label={PROCESS_INTEGRATION_CHECK_MERGE.label(landing.baseRef)}
          />
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {PROCESS_INTEGRATION_CHECK_MERGE.hint(landing.baseRef)}
          </Text>
        </>
      )}
      {problem ? <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{problem}</Text> : null}
    </View>
  )
}
