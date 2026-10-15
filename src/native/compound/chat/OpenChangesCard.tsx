import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { ChatOpenChangesCard } from 'thefactory-tools/types'

import { useChatOpenChanges } from '../../../headless/hooks/useChatOpenChanges'
import { openChangesCardView } from '../../../headless/utils/openChangesCard'
import { OPEN_CHANGES_CARD_COPY } from '../../../headless/utils/openChangesCardConstants'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck, IconWarningTriangle } from '../../icons'
import { Button } from '../../primitives/Button'

/** Native peer of web's `OpenChangesCardView`: drawn from the chat's open changes as they stand now. */
export function OpenChangesCardView({
  card,
  at,
  formatAt,
  renderReview,
}: {
  card: ChatOpenChangesCard
  at?: string
  formatAt: (ms: number) => string
  renderReview?: (runId: string) => ReactNode
}) {
  const { theme, status } = useNativeTheme()
  const live = useChatOpenChanges(card)
  const view = openChangesCardView({ card, ...live }, formatAt)
  const [showing, setShowing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const open = view.state === 'open'
  const headerColor = open ? status.on_hold.softFg : theme.text.secondary
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: open ? status.on_hold.bg : theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          ...(open ? { backgroundColor: status.on_hold.softBg } : {}),
        }}
      >
        {open ? (
          <IconWarningTriangle size={15} color={headerColor} />
        ) : (
          <IconCheck size={15} color={headerColor} />
        )}
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: headerColor }}
        >
          {view.title}
        </Text>
        {at ? <Text style={{ fontSize: 12, color: theme.text.secondary }}>{at}</Text> : null}
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 13.5, color: theme.text.primary }}>{view.detail}</Text>
        {view.conflictLine ? (
          <Text style={{ fontSize: 12.5, color: status.on_hold.softFg }}>{view.conflictLine}</Text>
        ) : view.error ? (
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.error}</Text>
        ) : null}
        {confirming ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {OPEN_CHANGES_CARD_COPY.confirmDiscard}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                size="sm"
                variant="danger"
                onPress={() => {
                  setConfirming(false)
                  void live.discard()
                }}
              >
                {OPEN_CHANGES_CARD_COPY.discard}
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setConfirming(false)}>
                {OPEN_CHANGES_CARD_COPY.keep}
              </Button>
            </View>
          </View>
        ) : view.viewRunId && (open || renderReview) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {renderReview ? (
              <Button size="sm" variant="outline" onPress={() => setShowing((s) => !s)}>
                {showing ? OPEN_CHANGES_CARD_COPY.hide : OPEN_CHANGES_CARD_COPY.view}
              </Button>
            ) : null}
            {open ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!view.canDiscard}
                onPress={() => setConfirming(true)}
              >
                {view.busy === 'discarding'
                  ? OPEN_CHANGES_CARD_COPY.discarding
                  : OPEN_CHANGES_CARD_COPY.discard}
              </Button>
            ) : null}
            {view.canRebuild || view.busy === 'rebuilding' ? (
              <Button size="sm" disabled={!view.canRebuild} onPress={() => void live.rebuild()}>
                {view.busy === 'rebuilding'
                  ? OPEN_CHANGES_CARD_COPY.rebuilding
                  : OPEN_CHANGES_CARD_COPY.rebuild}
              </Button>
            ) : null}
          </View>
        ) : null}
        {showing && view.viewRunId && renderReview ? renderReview(view.viewRunId) : null}
      </View>
    </View>
  )
}
