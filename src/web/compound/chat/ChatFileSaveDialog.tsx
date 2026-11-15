import { useEffect, useState, type FormEvent } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import {
  defaultSaveDestination,
  normalizeSaveDestination,
} from '../../../headless/utils/chatFileSave'
import { CHAT_FILE_SAVE_COPY } from '../../../headless/utils/chatFileSaveConstants'
import type { ChatFileSaveState } from '../../../headless/utils/chatFileSaveTypes'

export type ChatFileSaveDialogProps = {
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
 * root to start with. A taken path says so and offers Replace.
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

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {CHAT_FILE_SAVE_COPY.cancel}
          </Button>
          <Button
            type="button"
            variant={replace ? 'danger' : 'primary'}
            onClick={() => submit()}
            disabled={!destination}
          >
            {replace ? CHAT_FILE_SAVE_COPY.replace : CHAT_FILE_SAVE_COPY.save}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        {errorShown ? <Alert>{errorShown.error}</Alert> : null}
        <Field label={CHAT_FILE_SAVE_COPY.pathLabel} hint={CHAT_FILE_SAVE_COPY.pathHint}>
          <Input
            autoFocus
            value={path}
            onChange={(e) => setPath(e.target.value)}
            spellCheck={false}
          />
        </Field>
      </form>
    </Modal>
  )
}
