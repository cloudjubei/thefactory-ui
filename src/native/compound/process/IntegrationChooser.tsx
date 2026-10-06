import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_INTEGRATION_CANCEL,
  PROCESS_INTEGRATION_CHOOSER_HEAD,
  PROCESS_INTEGRATION_CHOOSER_NOTE,
  PROCESS_INTEGRATION_DETAILS_HEAD,
  PROCESS_INTEGRATION_FORM_LABELS,
  processIntegrationAccountLabel,
  processIntegrationChoices,
  processIntegrationFormDecision,
  processIntegrationFormPreview,
  processIntegrationFormStart,
  processIntegrationIdentityLabel,
  useProcessIntegrationOptions,
  type ProcessIntegrationDecision,
  type ProcessIntegrationForm,
  type ProcessIntegrationMode,
  type ProcessIntegrationOptions,
  type ProcessWorkBranch,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Textarea } from '../../primitives/Textarea'

export type IntegrationChooserProps = {
  /** The run whose work lands — what it can land as is read for it. */
  runId: string
  /** The branch the work is on, and the branch it goes back to. */
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>
  /** The only ways offered, when they are narrowed — a group leg others build on merges or squashes. */
  modes?: readonly ProcessIntegrationMode[]
  /** Open straight at this way's details. */
  initialMode?: ProcessIntegrationMode
  /** The question heading the choices. */
  head?: string
  /** The button that sends the decision. */
  submitLabel?: string
  busy?: boolean
  onChoose: (decision: ProcessIntegrationDecision) => void
  onCancel: () => void
}

/**
 * How approved work lands, decided by the person: the way, then who it is made
 * as and the words it lands with (or the account a pull request is opened as
 * and what it says), with a preview of how it will read on the host. The native
 * peer of the web `IntegrationChooser`.
 */
export default function IntegrationChooser({
  runId,
  workBranch,
  modes,
  initialMode,
  head = PROCESS_INTEGRATION_CHOOSER_HEAD,
  submitLabel = PROCESS_INTEGRATION_FORM_LABELS.land,
  busy = false,
  onChoose,
  onCancel,
}: IntegrationChooserProps) {
  const { theme } = useNativeTheme()
  const choices = processIntegrationChoices(workBranch, modes)
  const fixed =
    initialMode ?? (choices.length === 1 && !workBranch.shadow ? choices[0]!.mode : undefined)
  const [mode, setMode] = useState<ProcessIntegrationMode | undefined>(fixed)
  const { options, error } = useProcessIntegrationOptions(mode ? runId : undefined)

  if (!mode) {
    return (
      <View accessibilityLabel={head} style={{ width: '100%', gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>{head}</Text>
        <View style={{ gap: 6 }}>
          {choices.map((choice) => (
            <Pressable
              key={choice.mode}
              accessibilityRole="button"
              accessibilityLabel={choice.label}
              accessibilityHint={choice.detail}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() =>
                workBranch.shadow ? onChoose({ mode: choice.mode }) : setMode(choice.mode)
              }
              style={({ pressed }) => ({
                gap: 2,
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: pressed ? theme.accent.primary : theme.border.default,
                backgroundColor: theme.surface.raised,
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                opacity: busy ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                {choice.label}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{choice.detail}</Text>
            </Pressable>
          ))}
        </View>
        {workBranch.shadow ? null : (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {PROCESS_INTEGRATION_CHOOSER_NOTE}
          </Text>
        )}
        <View style={{ flexDirection: 'row' }}>
          <Button size="sm" variant="ghost" disabled={busy} onPress={onCancel}>
            {PROCESS_INTEGRATION_CANCEL}
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View
      accessibilityLabel={PROCESS_INTEGRATION_DETAILS_HEAD[mode]}
      style={{ width: '100%', gap: nativeSpace[2] }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
        {PROCESS_INTEGRATION_DETAILS_HEAD[mode]}
      </Text>
      {options ? (
        <IntegrationDetails
          key={mode}
          mode={mode}
          options={options}
          workBranch={workBranch}
          submitLabel={submitLabel}
          busy={busy}
          onChoose={onChoose}
        />
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {error ?? PROCESS_INTEGRATION_FORM_LABELS.loading}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
        {fixed ? null : (
          <Button size="sm" variant="ghost" disabled={busy} onPress={() => setMode(undefined)}>
            {PROCESS_INTEGRATION_FORM_LABELS.back}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onPress={onCancel}>
          {PROCESS_INTEGRATION_CANCEL}
        </Button>
      </View>
    </View>
  )
}

type IntegrationDetailsProps = {
  mode: ProcessIntegrationMode
  options: ProcessIntegrationOptions
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>
  submitLabel: string
  busy: boolean
  onChoose: (decision: ProcessIntegrationDecision) => void
}

function IntegrationDetails({
  mode,
  options,
  workBranch,
  submitLabel,
  busy,
  onChoose,
}: IntegrationDetailsProps) {
  const { theme, status } = useNativeTheme()
  const [form, setForm] = useState<ProcessIntegrationForm>(() =>
    processIntegrationFormStart(mode, options),
  )
  const result = processIntegrationFormDecision(form, options)
  const preview = processIntegrationFormPreview(form, options, workBranch)
  const set = (patch: Partial<ProcessIntegrationForm>) => setForm((f) => ({ ...f, ...patch }))
  const label = { fontSize: 12, fontWeight: '500' as const, color: theme.text.secondary }
  const mono = { fontFamily: nativeFontFamilies.mono, fontSize: 12 }

  return (
    <View style={{ gap: nativeSpace[2] }}>
      {mode === 'pull-request' ? (
        <>
          <Text style={label}>{PROCESS_INTEGRATION_FORM_LABELS.account}</Text>
          <Select value={form.accountId ?? ''} onValueChange={(accountId) => set({ accountId })}>
            <SelectTrigger>
              <SelectValue placeholder={PROCESS_INTEGRATION_FORM_LABELS.account} />
            </SelectTrigger>
            <SelectContent>
              {options.accounts.map((a) => (
                <SelectItem key={a.credentialId} value={a.credentialId}>
                  {processIntegrationAccountLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text style={label}>{PROCESS_INTEGRATION_FORM_LABELS.prTitle}</Text>
          <Input
            value={form.prTitle}
            disabled={busy}
            onChangeText={(prTitle) => set({ prTitle })}
          />
          <Text style={label}>{PROCESS_INTEGRATION_FORM_LABELS.prBody}</Text>
          <Textarea
            rows={6}
            value={form.prBody}
            disabled={busy}
            onChangeText={(prBody) => set({ prBody })}
            style={mono}
          />
        </>
      ) : (
        <>
          <Text style={label}>{PROCESS_INTEGRATION_FORM_LABELS.identity}</Text>
          <Select value={form.identityId ?? ''} onValueChange={(identityId) => set({ identityId })}>
            <SelectTrigger>
              <SelectValue placeholder={PROCESS_INTEGRATION_FORM_LABELS.identity} />
            </SelectTrigger>
            <SelectContent>
              {options.identities.map((i) => (
                <SelectItem key={i.credentialId} value={i.credentialId}>
                  {processIntegrationIdentityLabel(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text style={label}>{PROCESS_INTEGRATION_FORM_LABELS.message}</Text>
          <Textarea
            rows={4}
            value={form.message}
            disabled={busy}
            onChangeText={(message) => set({ message })}
            style={mono}
          />
        </>
      )}

      <View
        style={{
          gap: 6,
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
        }}
      >
        <Text style={{ fontSize: 10.5, fontWeight: '600', color: theme.text.muted }}>
          {preview.where.toUpperCase()}
        </Text>
        {preview.entries.map((entry, i) => (
          <View key={`${i}-${entry.title}`} style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {entry.title}
            </Text>
            {entry.body ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{entry.body}</Text>
            ) : null}
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{entry.byline}</Text>
          </View>
        ))}
        {preview.more ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {PROCESS_INTEGRATION_FORM_LABELS.more(preview.more)}
          </Text>
        ) : null}
        {preview.note ? (
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{preview.note}</Text>
        ) : null}
      </View>

      {'problem' in result ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{result.problem}</Text>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <Button
          size="sm"
          variant="primary"
          disabled={busy || 'problem' in result}
          onPress={() => {
            if ('decision' in result) onChoose(result.decision)
          }}
        >
          {submitLabel}
        </Button>
      </View>
    </View>
  )
}
