import { useEffect, useRef, useState, type FormEvent } from 'react'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'

export type ChatTopicCreateModalProps = {
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
 * Presentational shell for the "new chat topic" modal. Both web and
 * desktop use this — host wires its own `onCreate` callback that calls
 * the right `createTopicChat` / `createProjectTopic` action.
 *
 * The modal stays open if `onCreate` throws so the user can retry; it
 * closes after a successful resolution.
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
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setError(null)
      setBusy(false)
    }
  }, [isOpen])

  const canSubmit = title.trim().length > 0 && !busy && !disabledReason

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(title.trim())
      // Caller decides whether to close on success — the modal stays open
      // by default so an `await` chain (e.g. navigation) can finish first.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
      // Refocus the input so the user can immediately edit + retry.
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
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            loading={busy}
            disabled={!canSubmit}
          >
            Create
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <Alert>{error}</Alert> : null}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-(--text-primary)">Title</label>
          <Input
            ref={inputRef}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            disabled={busy}
          />
          {hint ? <p className="text-xs text-(--text-secondary)">{hint}</p> : null}
        </div>
        {disabledReason ? (
          <div className="text-xs text-(--text-secondary)">{disabledReason}</div>
        ) : null}
      </form>
    </Modal>
  )
}
