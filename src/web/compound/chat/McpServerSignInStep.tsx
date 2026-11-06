import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import {
  CAPTURE_CANCEL_LABEL,
  MCP_CAPTURE_SIGN_IN_NOTE,
} from '../../../headless/utils/credentialCaptureConstants'
import {
  MCP_SERVER_ACTIONS,
  MCP_SERVER_SIGN_IN_PENDING,
} from '../../../headless/utils/mcpServersConstants'

export type McpServerSignInStepProps = {
  /** The address of the server being signed in to. */
  url: string | undefined
  /** The page a sign-in opened, while it is not finished. */
  pendingUrl: string | undefined
  busy: boolean
  error: string | null
  onSignIn: () => void
  onOpenPage: (url: string) => void
  onCancel: () => void
}

/** What is left of a server card once its server is added: the same sign-in Settings offers. */
export default function McpServerSignInStep({
  url,
  pendingUrl,
  busy,
  error,
  onSignIn,
  onOpenPage,
  onCancel,
}: McpServerSignInStepProps) {
  return (
    <div className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2">
      <p className="text-[11px] text-(--text-secondary) wrap-break-word">
        {MCP_CAPTURE_SIGN_IN_NOTE}
      </p>
      {url ? <p className="text-[12px] wrap-break-word">{url}</p> : null}
      {pendingUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-(--text-secondary)">{MCP_SERVER_SIGN_IN_PENDING}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenPage(pendingUrl)}>
            {MCP_SERVER_ACTIONS.openPage}
          </Button>
        </div>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          {CAPTURE_CANCEL_LABEL}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pendingUrl ? 'secondary' : 'primary'}
          loading={busy}
          disabled={busy}
          onClick={onSignIn}
        >
          {pendingUrl ? MCP_SERVER_ACTIONS.signInAgain : MCP_SERVER_ACTIONS.signIn}
        </Button>
      </div>
    </div>
  )
}
