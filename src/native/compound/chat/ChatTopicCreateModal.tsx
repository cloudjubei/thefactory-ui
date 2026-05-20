import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'

export interface ChatTopicCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string) => void | Promise<void>
  /** When `true`, the Create button shows a busy state. */
  busy?: boolean
  title?: string
  placeholder?: string
}

/**
 * Native peer of
 * [web's `ChatTopicCreateModal`](../../../web/compound/chat/ChatTopicCreateModal.tsx).
 * Single-input modal for creating a new chat topic under the active project
 * / group. Trimmed value is passed to `onCreate`; empty submits are
 * rejected.
 */
export default function ChatTopicCreateModal({
  isOpen,
  onClose,
  onCreate,
  busy = false,
  title = 'New topic',
  placeholder = 'Topic title',
}: ChatTopicCreateModalProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!isOpen) setValue('')
  }, [isOpen])

  const trimmed = value.trim()
  const submit = () => {
    if (!trimmed || busy) return
    void onCreate(trimmed)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={submit} disabled={!trimmed || busy}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </View>
      }
    >
      <Field label="Title">
        <Input
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          placeholder={placeholder}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="go"
          disabled={busy}
        />
      </Field>
    </Modal>
  )
}
