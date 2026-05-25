import { useEffect, useRef, useState } from 'react'
import { Text, TextInput, View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ChatTopicCreateModalProps {
  isOpen: boolean
  onClose: () => void
  /** Fires when the user submits a valid title. Caller wires the actual
   * `createTopicChat` (or equivalent) call against its host context. */
  onCreate: (title: string) => Promise<void> | void
  /** Title shown in the modal chrome (e.g. "Create Project Topic"). */
  modalTitle?: string
  /** Placeholder + hint for the title field. */
  placeholder?: string
  hint?: string
  /** Optional precondition hint — shown when the host knows the topic can't
   * be created yet (e.g. no active project). When non-null the submit
   * button is disabled. */
  disabledReason?: string | null
}

/**
 * Native peer of
 * [web's `ChatTopicCreateModal`](../../../web/compound/chat/ChatTopicCreateModal.tsx).
 * Single-input modal for creating a new chat topic under the active project
 * / group. Mirrors web's copy + footer (single "Create" button, no Cancel —
 * the modal close affordance dismisses).
 *
 * Stays open if `onCreate` throws so the user can retry; the caller decides
 * whether to close on success.
 */
export default function ChatTopicCreateModal({
  isOpen,
  onClose,
  onCreate,
  modalTitle = 'New chat topic',
  placeholder = 'e.g. Architecture review',
  hint = 'Used as the topic name in the sidebar.',
  disabledReason = null,
}: ChatTopicCreateModalProps) {
  const { theme } = useNativeTheme()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<TextInput | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setError(null)
      setBusy(false)
    }
  }, [isOpen])

  const trimmed = title.trim()
  const canSubmit = trimmed.length > 0 && !busy && !disabledReason

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
      requestAnimationFrame(() => inputRef.current?.focus())
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (busy) return
        onClose()
      }}
      title={modalTitle}
      size="sm"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button onPress={() => void submit()} loading={busy} disabled={!canSubmit}>
            Create
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[4] }}>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label="Title" hint={hint}>
          <Input
            ref={inputRef}
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={() => void submit()}
            placeholder={placeholder}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="go"
            disabled={busy}
          />
        </Field>
        {disabledReason ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {disabledReason}
          </Text>
        ) : null}
      </View>
    </Modal>
  )
}
