import { useState } from 'react'
import { Text, View } from 'react-native'

import type { OpenChangesNoticeView } from '../../../headless/utils/openChangesNoticeTypes'
import { OPEN_CHANGES_NOTICE_COPY } from '../../../headless/utils/openChangesNoticeConstants'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconWarningTriangle } from '../../icons'
import { Button } from '../../primitives/Button'

export type OpenChangesNoticeProps = {
  view: OpenChangesNoticeView
  onDiscard: () => void
  onRebuild: () => void
}

/** Native peer of web's `OpenChangesNotice`: a line on the change card, never a card of its own. */
export function OpenChangesNotice({ view, onDiscard, onRebuild }: OpenChangesNoticeProps) {
  const { status } = useNativeTheme()
  const [confirming, setConfirming] = useState(false)
  const color = status.on_hold.softFg
  return (
    <View
      style={{
        gap: 8,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: status.on_hold.bg,
        backgroundColor: status.on_hold.softBg,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <IconWarningTriangle size={15} color={color} />
        <View style={{ flex: 1, gap: 2 }}>
          {view.waiting ? (
            <Text style={{ fontSize: 12.5, fontWeight: '600', color }}>{view.waiting}</Text>
          ) : null}
          {view.unfit ? <Text style={{ fontSize: 12.5, color }}>{view.unfit}</Text> : null}
        </View>
      </View>
      {confirming ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12.5, color }}>{OPEN_CHANGES_NOTICE_COPY.confirmDiscard}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              size="sm"
              variant="danger"
              onPress={() => {
                setConfirming(false)
                onDiscard()
              }}
            >
              {OPEN_CHANGES_NOTICE_COPY.discard}
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setConfirming(false)}>
              {OPEN_CHANGES_NOTICE_COPY.keep}
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            size="sm"
            variant="outline"
            disabled={!view.canDiscard}
            onPress={() => setConfirming(true)}
          >
            {view.busy === 'discarding'
              ? OPEN_CHANGES_NOTICE_COPY.discarding
              : OPEN_CHANGES_NOTICE_COPY.discard}
          </Button>
          {view.canRebuild || view.busy === 'rebuilding' ? (
            <Button size="sm" disabled={!view.canRebuild} onPress={onRebuild}>
              {view.busy === 'rebuilding'
                ? OPEN_CHANGES_NOTICE_COPY.rebuilding
                : OPEN_CHANGES_NOTICE_COPY.rebuild}
            </Button>
          ) : null}
        </View>
      )}
      {view.conflictLine ? (
        <Text style={{ fontSize: 12.5, color }}>{view.conflictLine}</Text>
      ) : view.error ? (
        <Text style={{ fontSize: 12.5, color }}>{view.error}</Text>
      ) : null}
    </View>
  )
}
