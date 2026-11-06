import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  TICKET_POST_TEXT,
  ticketPostView,
  useTicketPost,
  type TicketPostView,
} from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type TicketPostNoteProps = {
  view: TicketPostView
  /** Open on the comment, for a fixed showcase state. */
  startOpen?: boolean
}

/**
 * Native peer of web's `TicketPostNote`, in the layout that ships: the line, and
 * the comment word for word on a tap. The comment is agent-written, so text only.
 */
export default function TicketPostNote({ view, startOpen = false }: TicketPostNoteProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(startOpen)
  const { line, notes, comment } = view
  return (
    <View accessibilityRole="text" style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        <Text style={{ fontWeight: '500', color: theme.text.primary }}>
          {TICKET_POST_TEXT.heading}:{' '}
        </Text>
        {line}
      </Text>
      {notes.map((note) => (
        <Text key={note} style={{ fontSize: 13, color: theme.text.muted }}>
          {note}
        </Text>
      ))}
      {comment !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.accent.primary }}>
            {open ? TICKET_POST_TEXT.hideComment : TICKET_POST_TEXT.showComment}
          </Text>
        </Pressable>
      ) : null}
      {comment !== undefined && open ? (
        <ScrollView
          nestedScrollEnabled
          accessibilityLabel={TICKET_POST_TEXT.commentLabel}
          style={{
            maxHeight: 256,
            borderLeftWidth: 2,
            borderLeftColor: theme.border.default,
            backgroundColor: theme.surface.base,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.text.primary }}>{comment}</Text>
        </ScrollView>
      ) : null}
    </View>
  )
}

/** The note for one run's sign-off, read while its decision is open. */
export function RunTicketPostNote({ runId }: { runId: string }) {
  const { theme } = useNativeTheme()
  const { post, failed } = useTicketPost(runId)
  const view = ticketPostView(post)
  if (view) return <TicketPostNote view={view} />
  return failed ? (
    <Text style={{ fontSize: 13, color: theme.text.muted }}>{TICKET_POST_TEXT.failed}</Text>
  ) : null
}
