import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export type GitCredentialErrorOp = 'push' | 'pull' | 'fetch' | 'commit'

export type GitCredentialErrorModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Navigate the user to wherever the host renders the GitHub credentials
   *  settings (web: `/settings?tab=github`, desktop: same, mobile:
   *  `/settings/github`). Called instead of `onClose` so the host can
   *  navigate AND dismiss in one go if it wants. */
  onOpenSettings: () => void
  /** Which remote op tripped the error — drives the verb in the headline. */
  op?: GitCredentialErrorOp
  /** Raw git/SDK message — surfaced under the headline as a quoted block. */
  message?: string
  /** Repo URL the op was running against, if known. */
  repoUrl?: string
}

const OP_LABEL: Record<GitCredentialErrorOp, string> = {
  push: 'push',
  pull: 'pull',
  fetch: 'fetch',
  commit: 'commit and push',
}

/**
 * App-wide modal shown when a git op fails because the configured GitHub
 * credentials don't grant access to the project's repo. Mounted once per
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
  const verb = op ? OP_LABEL[op] : 'access'
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="GitHub credentials needed" size="md">
      <div className="flex flex-col gap-3">
        <Alert variant="error">
          {`Couldn't ${verb} — the GitHub credentials configured for this project don't have access to its repository.`}
        </Alert>
        {repoUrl ? (
          <div className="text-xs text-(--text-muted)">
            Repository:{' '}
            <code className="font-mono text-(--text-secondary)">{repoUrl}</code>
          </div>
        ) : null}
        {message ? (
          <details className="text-xs text-(--text-secondary)">
            <summary className="cursor-pointer select-none text-(--text-muted)">
              Show technical details
            </summary>
            <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded border border-(--border-subtle) bg-(--surface-muted) p-2 font-mono text-[11px] text-(--text-primary)">
              {message}
            </pre>
          </details>
        ) : null}
        <p className="text-sm text-(--text-secondary)">
          Update your GitHub Personal Access Token in Settings → GitHub, or pick a
          credential set that has access to this repository.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Dismiss
          </Button>
          <Button onClick={onOpenSettings}>Open GitHub Settings</Button>
        </div>
      </div>
    </Modal>
  )
}
