import { Pressable, Text } from 'react-native'

import {
  LIVE_CHECK_COPY,
  openTestAccountNotes,
  useProjectNotes,
  useReferenceRendering,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconDocument } from '../../icons'

export type LiveCheckNoteLinkProps = {
  projectId: string
}

/** Native peer of the web `LiveCheckNoteLink`: the logins note by label, opened in place. */
export default function LiveCheckNoteLink({ projectId }: LiveCheckNoteLinkProps) {
  const { theme } = useNativeTheme()
  const { notes } = useProjectNotes(projectId)
  const onOpen = useReferenceRendering()?.onOpen
  const note = openTestAccountNotes(notes)[0]
  if (!note || !onOpen) return null
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${LIVE_CHECK_COPY.openNote}: ${note.label}`}
      testID="live-check-open-note"
      onPress={() => onOpen({ kind: 'note', projectId, noteId: note.id })}
      hitSlop={6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        minHeight: 32,
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.base,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 10,
      }}
    >
      <IconDocument size={12} color={theme.text.muted} />
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{note.label}</Text>
      <Text style={{ fontSize: 12, color: theme.accent.primary }}>
        · {LIVE_CHECK_COPY.openNote}
      </Text>
    </Pressable>
  )
}
