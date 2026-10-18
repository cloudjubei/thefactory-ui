import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { FeatureRequest } from 'thefactory-tools/types'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { IconCheckCircle } from '../icons/IconCheckCircle'
import { IconXCircle } from '../icons/IconXCircle'
import { Button } from '../primitives/Button'
import { Textarea } from '../primitives/Textarea'
import {
  canSettleFeatureRequest,
  featureRequestAcceptHint,
  featureRequestPhase,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestSettledLine,
  featureRequestStatusView,
  featureRequestTakenOverLinks,
} from '../../headless/utils/featureRequestView'
import { FEATURE_REQUEST_OPEN_FULL_LABEL } from '../../headless/utils/featureRequestViewConstants'
import type { FeatureRequestSettleMode } from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'
import { FeatureRequestSettleActions, FeatureRequestSettledNote } from './FeatureRequestSettle'

export interface FeatureRequestDecisionProps {
  request: FeatureRequest
  /** The asking project's name. */
  fromLabel: string
  /** Accept the request — the work starts in the request's chat. The host owns the call. */
  onAccept: () => void
  /** Reject the request, with the reason the person typed (none when blank). */
  onReject: (reason?: string) => void
  /** A decision is on its way — the buttons wait. */
  busy?: boolean
  /** Why the last decision did not go through. */
  error?: string
  /** The story the work was placed on, once accepted; `onOpen` opens it. */
  placedOn?: { label: string; onOpen?: () => void }
  /** Open the whole request — offered beside the decision when given. */
  onOpenFull?: () => void
  /** Mark the request delivered by other work — offered while it can still be settled. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story — offered likewise. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  /** Another request's title, for the links between requests handed over and taken over. */
  requestTitle?: (requestId: string) => string | undefined
  /** Open another request, from those links. */
  onOpenRequest?: (requestId: string) => void
  /** Opens a settle form at once, for a fixed showcase state. */
  initialSettleMode?: FeatureRequestSettleMode
}

function OpenFull({ onOpenFull }: Pick<FeatureRequestDecisionProps, 'onOpenFull'>) {
  return onOpenFull ? (
    <Button size="sm" variant="ghost" onPress={onOpenFull}>
      {FEATURE_REQUEST_OPEN_FULL_LABEL}
    </Button>
  ) : null
}

function Pending({
  fromLabel,
  onAccept,
  onReject,
  busy,
  onOpenFull,
}: Pick<
  FeatureRequestDecisionProps,
  'fromLabel' | 'onAccept' | 'onReject' | 'busy' | 'onOpenFull'
>) {
  const { theme, status } = useNativeTheme()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  if (confirming) {
    return (
      <View
        style={{
          gap: nativeSpace[3],
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: status.stuck.softBorder,
          backgroundColor: status.stuck.softBg,
          padding: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 13, color: status.stuck.softFg }}>
          {featureRequestRejectPrompt(fromLabel)}
        </Text>
        <Textarea rows={2} value={reason} placeholder="Optional reason" onChangeText={setReason} />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button size="sm" variant="ghost" onPress={() => setConfirming(false)} disabled={busy}>
            Keep it
          </Button>
          <Button
            size="sm"
            variant="danger"
            onPress={() => onReject(reason.trim() || undefined)}
            disabled={busy}
          >
            Reject request
          </Button>
        </View>
      </View>
    )
  }
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <Button size="sm" variant="primary" onPress={onAccept} disabled={busy}>
          Accept &amp; start work
        </Button>
        <Button size="sm" variant="secondary" onPress={() => setConfirming(true)} disabled={busy}>
          Reject…
        </Button>
        <OpenFull onOpenFull={onOpenFull} />
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: theme.text.secondary }}>
        {featureRequestAcceptHint(fromLabel)}
      </Text>
    </>
  )
}

/**
 * Native peer of web's `FeatureRequestDecision` — Accept & start work / Reject… (with an optional
 * reason, confirmed in place) while the request waits; the story it was placed on and how the work
 * stands once accepted; who was told once rejected; where its work went once handed over. Mark as
 * delivered… and Hand over… stay offered until it is settled. Purely presentational.
 */
export default function FeatureRequestDecision(props: FeatureRequestDecisionProps) {
  const { request, fromLabel, error, placedOn, onOpenFull, busy } = props
  const { theme, status } = useNativeTheme()
  const view = featureRequestStatusView(request.status)
  const tone = status[view.tone]
  const titleOf = props.requestTitle ?? (() => undefined)
  const phase = featureRequestPhase(request)
  const pill = (
    <Text
      style={{
        fontSize: 11.5,
        fontWeight: '600',
        color: tone.softFg,
        backgroundColor: tone.softBg,
        borderRadius: nativeRadii.round,
        paddingHorizontal: nativeSpace[2],
        overflow: 'hidden',
      }}
    >
      {view.label}
    </Text>
  )
  return (
    <>
      {phase === 'settled' ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          {pill}
          <OpenFull onOpenFull={onOpenFull} />
        </View>
      ) : phase === 'pending' ? (
        <Pending {...props} />
      ) : phase === 'accepted' ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          <IconCheckCircle size={18} color={status.done.fg} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            Accepted
          </Text>
          {placedOn ? (
            <>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>· placed on</Text>
              <Pressable
                accessibilityRole="button"
                disabled={!placedOn.onOpen}
                onPress={placedOn.onOpen}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  borderRadius: nativeRadii[3],
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.text.primary }}>{placedOn.label}</Text>
              </Pressable>
            </>
          ) : null}
          {pill}
          <OpenFull onOpenFull={onOpenFull} />
        </View>
      ) : (
        <View style={{ gap: nativeSpace[2] }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: nativeSpace[2],
            }}
          >
            <IconXCircle size={18} color={status.stuck.fg} />
            <Text style={{ flexShrink: 1, fontSize: 13, color: theme.text.secondary }}>
              <Text style={{ fontWeight: '700', color: theme.text.primary }}>Rejected</Text> ·{' '}
              {featureRequestRejectedLine(fromLabel)}
            </Text>
            <OpenFull onOpenFull={onOpenFull} />
          </View>
          {request.rejectionReason ? (
            <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.text.secondary }}>
              “{request.rejectionReason}”
            </Text>
          ) : null}
        </View>
      )}
      <FeatureRequestSettledNote
        settled={featureRequestSettledLine(request, titleOf)}
        takenOver={featureRequestTakenOverLinks(request, titleOf)}
        onOpenRequest={props.onOpenRequest}
      />
      {canSettleFeatureRequest(request) ? (
        <FeatureRequestSettleActions
          fromLabel={fromLabel}
          onMarkDelivered={props.onMarkDelivered}
          onHandOver={props.onHandOver}
          busy={busy}
          initialMode={props.initialSettleMode}
        />
      ) : null}
      {error ? <Text style={{ fontSize: 12, color: status.stuck.fg }}>{error}</Text> : null}
    </>
  )
}
