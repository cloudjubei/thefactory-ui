import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useGit } from '../../../../headless'
import { Alert, Button, Field, Modal, Textarea } from '../../..'

export type CommitDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export default function CommitDialog({ isOpen, onClose }: CommitDialogProps) {
  const { commit, push, status } = useGit()
  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [pushAfter, setPushAfter] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const merging = status?.merging
  const mergeMessage = merging?.message
  useEffect(() => {
    if (isOpen && mergeMessage) setMessage((prev) => prev || mergeMessage)
  }, [isOpen, mergeMessage])

  const trimmed = message.trim()
  const stagedCount = status?.staged.length ?? 0
  // Match desktop: a normal commit requires staged files + a message; amend
  // is allowed without staged files (you can amend just the message) and
  // can technically also leave the message unchanged. A merge commits once
  // its conflicts are resolved; left empty, its message is the one git prepared.
  const canSubmit =
    !submitting &&
    (merging
      ? merging.conflictedFiles.length === 0
      : amend
        ? true
        : stagedCount > 0 && trimmed.length > 0)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await commit({ message: trimmed, amend: merging ? false : amend })
      // Chained client-side so a push failure surfaces independently from the
      // already-successful commit — backend's contract intentionally omits
      // upstream's `pushToOrigin` shortcut.
      if (pushAfter) await push()
      setMessage('')
      setAmend(false)
      setPushAfter(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit')
    } finally {
      setSubmitting(false)
    }
  }

  // Cmd/Ctrl+Enter submits — Enter alone keeps newlines in the message.
  const onMessageKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void onSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={merging ? 'Commit merge' : 'Commit staged changes'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Commit message">
          <Textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={onMessageKeyDown}
            rows={5}
            placeholder="Describe the change — first line is the subject"
          />
        </Field>
        {merging && merging.conflictedFiles.length > 0 ? (
          <Alert>
            {merging.conflictedFiles.length} file
            {merging.conflictedFiles.length === 1 ? ' is' : 's are'} still in conflict. Resolve and
            stage {merging.conflictedFiles.length === 1 ? 'it' : 'them'} before committing the
            merge.
          </Alert>
        ) : null}
        <div className="flex flex-col gap-2">
          {merging ? null : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={amend} onChange={(e) => setAmend(e.target.checked)} />
              Amend previous commit
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pushAfter}
              onChange={(e) => setPushAfter(e.target.checked)}
            />
            Push to origin after commit
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs opacity-70">
            {stagedCount} file{stagedCount === 1 ? '' : 's'} staged
          </div>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {amend ? 'Amend' : 'Commit'}
            {pushAfter ? ' & Push' : ''}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
