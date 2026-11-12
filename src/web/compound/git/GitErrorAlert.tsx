import type { ReactNode } from 'react'
import { GIT_CREDENTIAL_FIX_TEXT, type GitOpError } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'

export type GitErrorAlertProps = {
  error: GitOpError
  /** Shown in place of `error.message`, e.g. "Committed. The push failed: …". */
  children?: ReactNode
  /** Offered as "Update credentials" when the error is a refused credential; hidden when absent. */
  onUpdateCredentials?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * A failed git op shown inline. A credential error carries an "Update
 * credentials" button that takes the person to the project's git settings.
 */
export default function GitErrorAlert({
  error,
  children,
  onUpdateCredentials,
  onDismiss,
  className,
}: GitErrorAlertProps) {
  const fix = error.credential ? onUpdateCredentials : undefined
  return (
    <Alert {...(onDismiss ? { onDismiss } : {})} {...(className ? { className } : {})}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-words">{children ?? error.message}</span>
        {fix ? (
          <Button type="button" size="sm" variant="secondary" onClick={fix}>
            {GIT_CREDENTIAL_FIX_TEXT.update}
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}
