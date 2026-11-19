import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  REVIEW_REPLY_TEXT as TEXT,
  type ReviewCommitsView,
  type ReviewReplyBannerLayout,
  type ReviewReplyView,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat, IconCommit } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'

/** How each tone of what was pushed since review reads, from the theme. */
export function useReviewCommitsToneStyle(): (tone: ReviewCommitsView['tone']) => {
  color: string
  fontWeight?: '600'
} {
  const { theme, status } = useNativeTheme()
  return (tone) =>
    tone === 'news'
      ? { color: theme.accent.primary, fontWeight: '600' }
      : tone === 'warn'
        ? { color: status.working.softFg, fontWeight: '600' }
        : { color: theme.text.muted }
}

/** Who replied and when, then what was pushed since the last round, toned. */
export function ReviewReplyLine({ view }: { view: ReviewReplyView }) {
  const { theme } = useNativeTheme()
  const tone = useReviewCommitsToneStyle()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexShrink: 1 }}>
      <View style={{ paddingTop: 2 }}>
        <IconChat size={14} color={theme.accent.primary} />
      </View>
      <Text style={{ flexShrink: 1, fontSize: 13, color: theme.text.muted }}>
        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{view.who}</Text>
        {` · ${view.when}`}
        {view.commits ? (
          <>
            {' · '}
            <Text style={tone(view.commits.tone)}>{view.commits.label}</Text>
          </>
        ) : null}
      </Text>
    </View>
  )
}

/** What the reply says, cut to a few lines until opened, and how many files came with it. */
export function ReviewReplyText({
  view,
  expanded = false,
}: {
  view: ReviewReplyView
  expanded?: boolean
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(expanded)
  const small = { fontSize: 12, color: theme.text.secondary }
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 13,
          color: theme.text.primary,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.muted,
          padding: 8,
        }}
      >
        {open ? view.text : view.preview}
      </Text>
      {view.cut || view.filesLabel ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {view.cut ? (
            <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
              <Text style={[small, { textDecorationLine: 'underline' }]}>
                {open ? TEXT.showLess : TEXT.showAll}
              </Text>
            </Pressable>
          ) : null}
          {view.filesLabel ? <Text style={small}>{view.filesLabel}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

export type ReviewReplyBannerProps = {
  reply?: ReviewReplyView | undefined
  commits?: ReviewCommitsView | undefined
  layout?: ReviewReplyBannerLayout
  starting?: string | undefined
  onOpenRun?: (() => void) | undefined
  onStart: () => void
  onOpenChat?: (() => void) | undefined
  expanded?: boolean
}

/**
 * Native peer of web's `ReviewReplyBanner`: a reply waiting on the ticket's
 * review on top of its page — who replied and when, what was pushed since the
 * last round, what they wrote, and Start round N (Open run while a review run
 * holds it). A strip, or a line that opens. Without a reply, what was pushed
 * since review in one quiet line.
 */
export default function ReviewReplyBanner({
  reply,
  commits,
  layout = REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  starting,
  onOpenRun,
  onStart,
  onOpenChat,
  expanded = false,
}: ReviewReplyBannerProps) {
  const { theme, status } = useNativeTheme()
  const tone = useReviewCommitsToneStyle()
  const [open, setOpen] = useState(expanded)
  if (!reply) {
    if (!commits) return null
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconCommit size={14} color={theme.text.muted} />
        <Text style={[{ fontSize: 13 }, tone(commits.tone)]}>{commits.label}</Text>
      </View>
    )
  }
  const buttons: ReactNode = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {onOpenRun ? (
        <Button size="sm" variant="primary" onPress={onOpenRun}>
          {TEXT.openRun}
        </Button>
      ) : (
        <Button size="sm" variant="primary" disabled={starting !== undefined} onPress={onStart}>
          {starting !== undefined ? <Spinner size={12} /> : null}
          {starting ?? reply.startLabel}
        </Button>
      )}
      {onOpenChat ? (
        <Button size="sm" variant="secondary" onPress={onOpenChat}>
          {TEXT.openChat}
        </Button>
      ) : null}
    </View>
  )
  if (layout === 'line') {
    return (
      <View accessibilityLabel={reply.line} style={{ gap: 8 }}>
        <ReviewReplyLine view={reply} />
        <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
          <Text
            style={{ fontSize: 12, color: theme.text.secondary, textDecorationLine: 'underline' }}
          >
            {open ? TEXT.hide : TEXT.show}
          </Text>
        </Pressable>
        {open ? <ReviewReplyText view={reply} expanded /> : null}
        {buttons}
      </View>
    )
  }
  return (
    <View
      accessibilityLabel={reply.line}
      style={{
        gap: 8,
        padding: 12,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: status.review.softBorder,
        backgroundColor: status.review.softBg,
      }}
    >
      <ReviewReplyLine view={reply} />
      <ReviewReplyText view={reply} expanded={expanded} />
      {buttons}
    </View>
  )
}
