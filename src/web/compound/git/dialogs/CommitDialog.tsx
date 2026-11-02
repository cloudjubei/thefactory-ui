import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { ChatContext } from 'thefactory-tools/types'
import {
  GIT_COMMIT_PUSH_TEXT,
  GitPushAfterCommitError,
  commitButtonLabel,
  extractErrorMessage,
  gitHookRejection,
  useFixCommitChecks,
  useGit,
  type GitCommitAndPushOptions,
  type GitCommitPushPhase,
} from '../../../../headless'
import type { GitStatus } from '../../../../headless/api'
import { Alert, Button, Field, Modal, TerminalOutput, Textarea } from '../../..'

export type CommitDialogProps = {
  isOpen: boolean
  onClose: () => void
  /** Opens a chat — offered as "Fix with an agent" when the commit checks stop a commit. */
  onOpenChat?: (context: ChatContext) => void
}

export type CommitDialogViewProps = {
  isOpen: boolean
  onClose: () => void
  status: GitStatus | null
  /** Commits, then pushes at once when asked; a push that fails after the commit throws `GitPushAfterCommitError`. */
  onCommit: (
    input: { message: string; amend: boolean },
    options: GitCommitAndPushOptions,
  ) => Promise<unknown>
  /** Pushes again after a commit whose push failed. */
  onPush: () => Promise<unknown>
  /** Starts an agent on what the commit checks reported; offered only when given. */
  onFixWithAgent?: (input: {
    output: string
    stagedFiles: readonly string[]
    message: string
  }) => Promise<void>
  initial?: { message?: string; hookOutput?: string; pushError?: string }
}

export default function CommitDialog({ isOpen, onClose, onOpenChat }: CommitDialogProps) {
  const { commitAndPush, push, status } = useGit()
  const fixCommitChecks = useFixCommitChecks()
  return (
    <CommitDialogView
      isOpen={isOpen}
      onClose={onClose}
      status={status}
      onCommit={commitAndPush}
      onPush={() => push()}
      {...(onOpenChat
        ? { onFixWithAgent: async (input) => onOpenChat(await fixCommitChecks(input)) }
        : {})}
    />
  )
}

export function CommitDialogView({
  isOpen,
  onClose,
  status,
  onCommit,
  onPush,
  onFixWithAgent,
  initial,
}: CommitDialogViewProps) {
  const [fixing, setFixing] = useState(false)
  const [message, setMessage] = useState(initial?.message ?? '')
  const [amend, setAmend] = useState(false)
  const [pushAfter, setPushAfter] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<GitCommitPushPhase | undefined>(undefined)
  const [pushError, setPushError] = useState<string | null>(initial?.pushError ?? null)
  const [error, setError] = useState<string | null>(null)
  const [hookOutput, setHookOutput] = useState<string | null>(initial?.hookOutput ?? null)

  useEffect(() => {
    if (!isOpen) setPushError(null)
  }, [isOpen])

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
    (pushError !== null ||
      (merging
        ? merging.conflictedFiles.length === 0
        : amend
          ? true
          : stagedCount > 0 && trimmed.length > 0))

  const finish = () => {
    setMessage('')
    setAmend(false)
    setPushAfter(false)
    setPushError(null)
    onClose()
  }

  const onPushAgain = async () => {
    setSubmitting(true)
    setPhase('pushing')
    try {
      await onPush()
      finish()
    } catch (err) {
      setPushError(extractErrorMessage(err, 'Failed to push'))
    } finally {
      setPhase(undefined)
      setSubmitting(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (pushError !== null) return void (await onPushAgain())
    setSubmitting(true)
    setError(null)
    setHookOutput(null)
    try {
      await onCommit(
        { message: trimmed, amend: merging ? false : amend },
        { push: pushAfter, onPhase: setPhase },
      )
      finish()
    } catch (err) {
      const rejection = gitHookRejection(err)
      if (err instanceof GitPushAfterCommitError) {
        setMessage('')
        setAmend(false)
        setPushError(extractErrorMessage(err.cause, 'Failed to push'))
      } else if (rejection !== undefined) setHookOutput(rejection)
      else setError(extractErrorMessage(err, 'Failed to commit'))
    } finally {
      setPhase(undefined)
      setSubmitting(false)
    }
  }

  const onFixChecks = async () => {
    if (hookOutput === null || !onFixWithAgent) return
    setFixing(true)
    try {
      await onFixWithAgent({
        output: hookOutput,
        stagedFiles: status?.staged ?? [],
        message: trimmed,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start the chat'))
    } finally {
      setFixing(false)
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
        {pushError !== null ? <Alert>{GIT_COMMIT_PUSH_TEXT.pushFailed(pushError)}</Alert> : null}
        {hookOutput !== null ? (
          <div className="flex flex-col gap-2">
            <Alert>The commit checks stopped this commit. Nothing was committed.</Alert>
            <TerminalOutput text={hookOutput} label="Commit checks" />
            {onFixWithAgent ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  loading={fixing}
                  onClick={() => void onFixChecks()}
                >
                  Fix with an agent
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
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
            {GIT_COMMIT_PUSH_TEXT.pushAfter}
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs opacity-70">
            {stagedCount} file{stagedCount === 1 ? '' : 's'} staged
          </div>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {pushError !== null && !phase
              ? GIT_COMMIT_PUSH_TEXT.pushAgain
              : commitButtonLabel({ amend, merging: !!merging, push: pushAfter, phase })}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
