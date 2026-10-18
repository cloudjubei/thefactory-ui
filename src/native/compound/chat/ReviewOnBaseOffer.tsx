import { useState } from 'react'
import { Text, View } from 'react-native'

import type { ReviewOnBaseOfferView } from '../../../headless/utils/reviewOnBaseTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type ReviewOnBaseOfferProps = {
  view: ReviewOnBaseOfferView
  /** Close the review; `force` once the person confirmed a review the base lacks some of. */
  onClose: (force: boolean) => void
  /** Open with its confirm showing — how the showcase draws that state. */
  defaultConfirming?: boolean
}

/** Native peer of web's `ReviewOnBaseOffer`: why it may close, and the button — asking first when the base lacks some of it. */
export function ReviewOnBaseOffer({
  view,
  onClose,
  defaultConfirming = false,
}: ReviewOnBaseOfferProps) {
  const { theme, status } = useNativeTheme()
  const [confirming, setConfirming] = useState(defaultConfirming)
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.detail}</Text>
      {confirming && view.confirm ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, color: theme.text.primary }}>{view.confirm.text}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              size="sm"
              variant="danger"
              onPress={() => {
                setConfirming(false)
                onClose(true)
              }}
            >
              {view.confirm.action}
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setConfirming(false)}>
              {view.confirm.keep}
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Button
            size="sm"
            variant={view.confirm ? 'ghost' : 'secondary'}
            disabled={view.busy}
            onPress={() => (view.confirm ? setConfirming(true) : onClose(false))}
          >
            {view.busy ? view.busyLabel : view.label}
          </Button>
        </View>
      )}
      {view.error ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{view.error}</Text>
      ) : null}
    </View>
  )
}
