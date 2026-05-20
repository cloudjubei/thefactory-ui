import { useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import Markdown from '../Markdown'
import { nativeSpace } from '../../../tokens/native'

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
          <Markdown text={content || '_(empty)_'} />
        )}
      </ScrollView>
    </Modal>
  )
}
