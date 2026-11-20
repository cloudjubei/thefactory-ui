import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import {
  TICKET_UPDATE_COPY,
  useTicketUpdate,
  type ProcessDeliveryLink,
  type TicketUpdateCardView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import ToneBadge from '../chips/ToneBadge'
import { SignOffOutputText } from './signoff/SignOffOutputPanel'

export type TicketUpdateCardProps = {
  view: TicketUpdateCardView
  /** Post it, once confirmed. */
  onPost: () => unknown
  /** Start on the confirm — for a fixed showcase state. */
  initialConfirming?: boolean
}

function OutLink({ link }: { link: ProcessDeliveryLink }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={8}
      onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: theme.accent.primary,
          textDecorationLine: 'underline',
        }}
      >
        {`${link.label} ↗`}
      </Text>
    </Pressable>
  )
}

/**
 * Native peer of web's `TicketUpdateCard`: "Post the ticket update" on a
 * sign-off — the post word for word, its channel, what holds it back, a
 * confirm, and once posted where it went.
 */
export default function TicketUpdateCard({
  view,
  onPost,
  initialConfirming = false,
}: TicketUpdateCardProps) {
  const { theme, status } = useNativeTheme()
  const [confirming, setConfirming] = useState(initialConfirming)
  const posted = view.phase === 'posted'
  return (
    <View
      accessibilityLabel={view.title}
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {view.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.label}</Text>
        {posted ? <ToneBadge tone="done" label={TICKET_UPDATE_COPY.postedBadge} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
          {view.where}
        </Text>
        {view.channelLink ? <OutLink link={view.channelLink} /> : null}
      </View>
      {view.text !== undefined ? <SignOffOutputText segments={view.segments} /> : null}
      {view.phase === 'blocked' ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: status.on_hold.softFg }}>
            {TICKET_UPDATE_COPY.blocked}
          </Text>
          {view.problems.map((problem) => (
            <Text
              key={problem}
              style={{ fontSize: 12, lineHeight: 17, color: status.on_hold.softFg }}
            >
              {`• ${problem}`}
            </Text>
          ))}
        </View>
      ) : null}
      {posted ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, color: theme.text.primary }}>{view.postedLine}</Text>
          {view.postedLink ? <OutLink link={view.postedLink} /> : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Button
            size="sm"
            disabled={!view.canPost}
            loading={view.phase === 'posting'}
            onPress={() => setConfirming(true)}
          >
            {view.button}
          </Button>
        </View>
      )}
      {view.error ? <Alert>{view.error}</Alert> : null}
      <ConfirmDialog
        isOpen={confirming && view.canPost}
        onClose={() => setConfirming(false)}
        title={view.confirm.title}
        description={view.confirm.body}
        confirmLabel={view.confirm.confirm}
        cancelLabel={view.confirm.cancel}
        onConfirm={() => {
          setConfirming(false)
          void onPost()
        }}
      />
    </View>
  )
}

/** A run's own ticket update on its sign-off; nothing while it is not offered. */
export function RunTicketUpdatePanel({
  runId,
  revision,
}: {
  runId: string
  revision?: string | number
}) {
  const { card, post } = useTicketUpdate({ kind: 'run', runId }, revision)
  return card ? <TicketUpdateCard view={card} onPost={post} /> : null
}

/** A group run's ticket update on its one sign-off; nothing while it is not offered. */
export function GroupTicketUpdatePanel({
  groupRunId,
  revision,
}: {
  groupRunId: string
  revision?: string | number
}) {
  const { card, post } = useTicketUpdate({ kind: 'group', groupRunId }, revision)
  return card ? <TicketUpdateCard view={card} onPost={post} /> : null
}
