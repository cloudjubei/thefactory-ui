import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface SystemPromptViewerModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  /** When set, an "Edit" button reveals a textarea editor that calls back
   *  with the new content on save. Omit for read-only viewing. */
  onSave?: (next: string) => void
  title?: string
}

/**
 * Native peer of
 * [web's `SystemPromptViewerModal`](../../../web/compound/chat/SystemPromptViewerModal.tsx).
 * Read-only Markdown by default; pass `onSave` to enable the in-place
 * editor that swaps to a `<Textarea>` and persists on save.
 */
export default function SystemPromptViewerModal({
  isOpen,
  onClose,
  content,
  onSave,
  title = 'System prompt',
}: SystemPromptViewerModalProps) {
  const { theme } = useNativeTheme()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)

  const close = () => {
    setEditing(false)
    setDraft(content)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={title}
      size="lg"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="ghost" onPress={close}>
            Close
          </Button>
          {onSave &&
            (editing ? (
              <Button
                onPress={() => {
                  onSave(draft)
                  setEditing(false)
                  onClose()
                }}
              >
                Save
              </Button>
            ) : (
              <Button
                variant="secondary"
                onPress={() => {
                  setDraft(content)
                  setEditing(true)
                }}
              >
                Edit
              </Button>
            ))}
        </View>
      }
    >
      <ScrollView style={{ maxHeight: 480 }}>
        {editing ? (
          <Textarea value={draft} onChangeText={setDraft} rows={10} />
        ) : (
          // Render the prompt as plain monospace text — matches web's
          // `<pre>` system-prompt viewer. Keeps any `{{var}}` placeholders
          // visible verbatim and avoids stripping leading whitespace that
          // markdown would interpret as structural.
          <Text
            selectable
            style={{
              fontFamily: 'Menlo',
              fontSize: 12,
              lineHeight: 18,
              color: theme.text.primary,
            }}
          >
            {content || '(empty)'}
          </Text>
        )}
      </ScrollView>
    </Modal>
  )
}
