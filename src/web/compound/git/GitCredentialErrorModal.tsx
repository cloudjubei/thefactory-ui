import { GIT_CREDENTIAL_FIX_TEXT } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export type GitCredentialErrorOp = 'push' | 'pull' | 'fetch' | 'commit'

export type GitCredentialErrorModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Opens the git credentials settings — hosts pass `useGit().openCredentialSettings`
   *  after dismissing. Called instead of `onClose`. */
  onOpenSettings: () => void
  /** Which remote op tripped the error — drives the verb in the headline. */
  op?: GitCredentialErrorOp
  /** Raw git/SDK message — surfaced under the headline as a quoted block. */
  message?: string
  /** Repo URL the op was running against, if known. */
  repoUrl?: string
}

/**
 * App-wide modal shown when a git op fails because the configured git
 * credentials don't grant access to the project's repo, on any git host. Mounted once per
 * app (web + desktop) by reading `useGit().credentialError` and gating
 * `isOpen` on it. The native peer ([./GitCredentialErrorModal] native)
 * mirrors the prop surface for mobile.
 */
export default function GitCredentialErrorModal({
  isOpen,
  onClose,
  onOpenSettings,
  op,
  message,
  repoUrl,
}: GitCredentialErrorModalProps) {
  const verb = op ? GIT_CREDENTIAL_FIX_TEXT.ops[op] : GIT_CREDENTIAL_FIX_TEXT.anyOp
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={GIT_CREDENTIAL_FIX_TEXT.title} size="md">
      <div className="flex flex-col gap-3">
        <Alert variant="error">{GIT_CREDENTIAL_FIX_TEXT.refused(verb)}</Alert>
        {repoUrl ? (
          <div className="text-xs text-(--text-muted)">
            {GIT_CREDENTIAL_FIX_TEXT.repository}{' '}
            <code className="font-mono text-(--text-secondary)">{repoUrl}</code>
          </div>
        ) : null}
        {message ? (
          <details className="text-xs text-(--text-secondary)">
            <summary className="cursor-pointer select-none text-(--text-muted)">
              {GIT_CREDENTIAL_FIX_TEXT.details}
            </summary>
            <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded border border-(--border-subtle) bg-(--surface-muted) p-2 font-mono text-[11px] text-(--text-primary)">
              {message}
            </pre>
          </details>
        ) : null}
        <p className="text-sm text-(--text-secondary)">{GIT_CREDENTIAL_FIX_TEXT.hint}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {GIT_CREDENTIAL_FIX_TEXT.dismiss}
          </Button>
          <Button onClick={onOpenSettings}>{GIT_CREDENTIAL_FIX_TEXT.update}</Button>
        </div>
      </div>
    </Modal>
  )
}
