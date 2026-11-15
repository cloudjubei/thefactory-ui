import { useEffect, useState } from 'react'
import { View } from 'react-native'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'
import {
  defaultSaveDestination,
  normalizeSaveDestination,
} from '../../../headless/utils/chatFileSave'
import { CHAT_FILE_SAVE_COPY } from '../../../headless/utils/chatFileSaveConstants'
import type { ChatFileSaveState } from '../../../headless/utils/chatFileSaveTypes'

export interface ChatFileSaveDialogProps {
  isOpen: boolean
  /** The shown file, project-relative. */
  source: string
  /** How its save stands: a failure fills the path it tried and says why. */
  state: ChatFileSaveState
  onSave: (destination: string, overwrite: boolean) => void
  onCancel: () => void
}

/**
 * Where to save a file an agent showed: one path, its name at the project's
 * root to start with. A taken path says so and offers Replace. Native mirror of
 * web's `ChatFileSaveDialog`.
 */
export default function ChatFileSaveDialog({
  isOpen,
  source,
  state,
  onSave,
  onCancel,
}: ChatFileSaveDialogProps) {
  const failed = state.status === 'failed' ? state : undefined
  const [path, setPath] = useState(() => failed?.destination ?? defaultSaveDestination(source))

  useEffect(() => {
    if (isOpen) setPath(failed?.destination ?? defaultSaveDestination(source))
  }, [isOpen, failed?.destination, source])

  const destination = normalizeSaveDestination(path)
  const errorShown = failed && failed.destination === destination ? failed : undefined
  const replace = errorShown?.exists === true

  const submit = () => {
    if (!destination) return
    onSave(destination, replace)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={CHAT_FILE_SAVE_COPY.title}
      size="sm"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
          <Button variant="ghost" onPress={onCancel}>
            {CHAT_FILE_SAVE_COPY.cancel}
          </Button>
          <Button variant={replace ? 'danger' : 'primary'} onPress={submit} disabled={!destination}>
            {replace ? CHAT_FILE_SAVE_COPY.replace : CHAT_FILE_SAVE_COPY.save}
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[4] }}>
        {errorShown ? <Alert variant="error">{errorShown.error}</Alert> : null}
        <Field label={CHAT_FILE_SAVE_COPY.pathLabel} hint={CHAT_FILE_SAVE_COPY.pathHint}>
          <Input
            value={path}
            onChangeText={setPath}
            onSubmitEditing={submit}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </Field>
      </View>
    </Modal>
  )
}
