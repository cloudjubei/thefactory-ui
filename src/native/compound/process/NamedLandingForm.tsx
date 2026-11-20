import { useState } from 'react'
import { View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  PROCESS_NAMED_LANDING_COPY,
  processNamedLandingConfirm,
  processNamedLandingInput,
  useProcessRunNamedLanding,
  type ProcessNamedLandingAction,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'

export type NamedLandingFormProps = {
  action: ProcessNamedLandingAction
  /** Start open with this text — for a fixed showcase state. */
  initialText?: string
  /** Start on the confirm — for a fixed showcase state. */
  initialConfirming?: boolean
}

/**
 * Native peer of web's `NamedLandingForm`: "Merged another way?" — finish a
 * run as merged by the pull request that brought its work in, or the commit
 * on its base, once confirmed.
 */
export default function NamedLandingForm({
  action,
  initialText,
  initialConfirming = false,
}: NamedLandingFormProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(initialText !== undefined)
  const [text, setText] = useState(initialText ?? '')
  const [confirming, setConfirming] = useState(initialConfirming)
  const named = processNamedLandingInput(text)
  const ready = named !== undefined && !('error' in named)
  if (!open) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <Button size="sm" variant="ghost" onPress={() => setOpen(true)}>
          {PROCESS_NAMED_LANDING_COPY.open}
        </Button>
      </View>
    )
  }
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Field
        label={PROCESS_NAMED_LANDING_COPY.field}
        hint={PROCESS_NAMED_LANDING_COPY.hint}
        error={named && 'error' in named ? named.error : undefined}
      >
        <Input
          value={text}
          disabled={action.busy}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={PROCESS_NAMED_LANDING_COPY.field}
          onChangeText={setText}
        />
      </Field>
      {action.error ? <Alert>{action.error}</Alert> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <Button
          size="sm"
          disabled={!ready}
          loading={action.busy}
          onPress={() => setConfirming(true)}
        >
          {action.busy ? PROCESS_NAMED_LANDING_COPY.finishing : PROCESS_NAMED_LANDING_COPY.finish}
        </Button>
        <Button size="sm" variant="ghost" disabled={action.busy} onPress={() => setOpen(false)}>
          {PROCESS_NAMED_LANDING_COPY.cancel}
        </Button>
      </View>
      <ConfirmDialog
        isOpen={confirming && ready}
        onClose={() => setConfirming(false)}
        title={PROCESS_NAMED_LANDING_COPY.confirmTitle}
        description={ready ? processNamedLandingConfirm(named) : ''}
        confirmLabel={PROCESS_NAMED_LANDING_COPY.finish}
        cancelLabel={PROCESS_NAMED_LANDING_COPY.keep}
        onConfirm={() => {
          setConfirming(false)
          if (ready) void action.onSettle(named)
        }}
      />
    </View>
  )
}

/** "Merged another way?" on a run's page, wherever the run takes it; nothing elsewhere. */
export function RunNamedLandingPanel({ run }: { run: ProcessRun }) {
  const action = useProcessRunNamedLanding(run)
  if (!action) return null
  return (
    <View style={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[3] }}>
      <NamedLandingForm action={action} />
    </View>
  )
}
