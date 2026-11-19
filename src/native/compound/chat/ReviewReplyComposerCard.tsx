import type { ReactNode } from 'react'
import { View } from 'react-native'

import { REVIEW_REPLY_TEXT as TEXT, type ReviewReplyView } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ReviewReplyLine, ReviewReplyText } from '../groupStories/ReviewReplyBanner'

export type ReviewReplyComposerCardProps = {
  view: ReviewReplyView
  starting?: boolean
  error?: string | undefined
  modelChip?: ReactNode
  onStart: () => void
  onNotNow: () => void
  expanded?: boolean
}

/**
 * Native peer of web's `ReviewReplyComposerCard`: in an inline review chat,
 * in the composer's place, who replied and when, what was pushed since the
 * last round, what they wrote, and Start round N; Not now brings the
 * composer back.
 */
export default function ReviewReplyComposerCard({
  view,
  starting = false,
  error,
  modelChip,
  onStart,
  onNotNow,
  expanded = false,
}: ReviewReplyComposerCardProps) {
  return (
    <View accessibilityLabel={view.line} style={{ gap: 8 }}>
      <ReviewReplyLine view={view} />
      <ReviewReplyText view={view} expanded={expanded} />
      {error ? <Alert variant="error">{error}</Alert> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Button
          size="sm"
          variant="primary"
          disabled={starting}
          onPress={() => {
            if (!starting) onStart()
          }}
        >
          {starting ? TEXT.starting : view.startLabel}
        </Button>
        {modelChip}
        <Button size="sm" variant="ghost" disabled={starting} onPress={onNotNow}>
          {TEXT.notNow}
        </Button>
      </View>
    </View>
  )
}
