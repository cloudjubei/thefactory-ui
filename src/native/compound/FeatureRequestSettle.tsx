import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'
import { Input } from '../primitives/Input'
import { Textarea } from '../primitives/Textarea'
import {
  featureRequestSettleFormReady,
  featureRequestSettleHint,
} from '../../headless/utils/featureRequestView'
import { FEATURE_REQUEST_SETTLE_WORDS as WORDS } from '../../headless/utils/featureRequestViewConstants'
import type {
  FeatureRequestLinkView,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
} from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'

export interface FeatureRequestSettleActionsProps {
  /** The asking project's name — its chat is told. */
  fromLabel: string
  /** Mark the request delivered by other work. Offers the action when given. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story. Offers the action when given. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  busy?: boolean
  /** Opens a form at once, for a fixed showcase state. */
  initialMode?: FeatureRequestSettleMode
}

function FieldLabel({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return <Text style={{ fontSize: 13, color: theme.text.primary }}>{children}</Text>
}

function SettleForm({
  mode,
  fromLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  mode: FeatureRequestSettleMode
  fromLabel: string
  busy?: boolean
  onCancel: () => void
  onSubmit: (values: { projectId: string; ref: string; note: string }) => void
}) {
  const { theme } = useNativeTheme()
  const [projectId, setProjectId] = useState('')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const ready = featureRequestSettleFormReady(mode, { projectId, ref })
  const handOver = mode === 'handed-over'
  return (
    <View
      style={{
        gap: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.muted,
        padding: nativeSpace[3],
      }}
    >
      {handOver ? (
        <View style={{ gap: nativeSpace[2] }}>
          <FieldLabel>{WORDS.handOverProject}</FieldLabel>
          <Input size="sm" value={projectId} autoCapitalize="none" onChangeText={setProjectId} />
        </View>
      ) : null}
      <View style={{ gap: nativeSpace[2] }}>
        <FieldLabel>{handOver ? WORDS.handOverRef : WORDS.deliveredRef}</FieldLabel>
        <Input
          size="sm"
          value={ref}
          autoCapitalize="none"
          placeholder={handOver ? WORDS.handOverRefPlaceholder : WORDS.deliveredRefPlaceholder}
          onChangeText={setRef}
        />
      </View>
      <Textarea rows={2} value={note} placeholder={WORDS.notePlaceholder} onChangeText={setNote} />
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {featureRequestSettleHint(fromLabel)}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
        <Button size="sm" variant="ghost" onPress={onCancel} disabled={busy}>
          {WORDS.cancel}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onPress={() => onSubmit({ projectId, ref, note })}
          disabled={busy || !ready}
        >
          {handOver ? WORDS.confirmHandOver : WORDS.confirmDelivered}
        </Button>
      </View>
    </View>
  )
}

/**
 * Native peer of web's `FeatureRequestSettleActions` — Mark as delivered… / Hand over…, each
 * opening its form in place. Renders nothing when the host offers neither.
 */
export function FeatureRequestSettleActions({
  fromLabel,
  onMarkDelivered,
  onHandOver,
  busy,
  initialMode,
}: FeatureRequestSettleActionsProps) {
  const [mode, setMode] = useState<FeatureRequestSettleMode | undefined>(initialMode)
  if (!onMarkDelivered && !onHandOver) return null
  if (mode) {
    return (
      <SettleForm
        mode={mode}
        fromLabel={fromLabel}
        busy={busy}
        onCancel={() => setMode(undefined)}
        onSubmit={({ projectId, ref, note }) =>
          mode === 'delivered'
            ? onMarkDelivered?.({ ref, note })
            : onHandOver?.({ projectId, ref, note })
        }
      />
    )
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
      {onMarkDelivered ? (
        <Button size="sm" variant="ghost" onPress={() => setMode('delivered')} disabled={busy}>
          {`${WORDS.markDelivered}…`}
        </Button>
      ) : null}
      {onHandOver ? (
        <Button size="sm" variant="ghost" onPress={() => setMode('handed-over')} disabled={busy}>
          {`${WORDS.handOver}…`}
        </Button>
      ) : null}
    </View>
  )
}

function RequestLink({
  link,
  onOpenRequest,
}: {
  link: FeatureRequestLinkView
  onOpenRequest?: (requestId: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onOpenRequest}
      onPress={() => onOpenRequest?.(link.requestId)}
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[3],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.text.primary }}>{link.label}</Text>
    </Pressable>
  )
}

/**
 * Native peer of web's `FeatureRequestSettledNote` — what delivered a request, the request it was
 * handed over to, and the requests it took over, each linked when the host can open requests.
 */
export function FeatureRequestSettledNote({
  settled,
  takenOver,
  onOpenRequest,
}: {
  settled?: FeatureRequestSettledView
  takenOver?: FeatureRequestLinkView[]
  onOpenRequest?: (requestId: string) => void
}) {
  const { theme } = useNativeTheme()
  if (!settled && !takenOver?.length) return null
  const row = {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: nativeSpace[2],
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {settled ? (
        <View style={row}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {settled.text}
          </Text>
          {settled.link ? <RequestLink link={settled.link} onOpenRequest={onOpenRequest} /> : null}
        </View>
      ) : null}
      {settled?.note ? (
        <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.text.secondary }}>
          “{settled.note}”
        </Text>
      ) : null}
      {takenOver?.length ? (
        <View style={row}>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{WORDS.takesOver}</Text>
          {takenOver.map((link) => (
            <RequestLink key={link.requestId} link={link} onOpenRequest={onOpenRequest} />
          ))}
        </View>
      ) : null}
    </View>
  )
}
