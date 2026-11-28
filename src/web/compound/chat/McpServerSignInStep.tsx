import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import {
  CAPTURE_CANCEL_LABEL,
  MCP_CAPTURE_SIGN_IN_NOTE,
} from '../../../headless/utils/credentialCaptureConstants'
import { MCP_SERVER_ACTIONS } from '../../../headless/utils/mcpServersConstants'

export type McpServerSignInStepProps = {
  /** The address of the server being signed in to. */
  url: string | undefined
  /** The sign-in press is on its way. */
  starting: boolean
  /** The card is being cancelled. */
  cancelling: boolean
  error: string | null
  /** Open the sign-in inside the app, or show the one open again. */
  onSignIn: () => void
  onCancel: () => void
}

/** What is left of a server card once its server is added: the same sign-in Settings offers, shown inside the app. */
export default function McpServerSignInStep({
  url,
  starting,
  cancelling,
  error,
  onSignIn,
  onCancel,
}: McpServerSignInStepProps) {
  return (
    <div className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2">
      <p className="text-[11px] text-(--text-secondary) wrap-break-word">
        {MCP_CAPTURE_SIGN_IN_NOTE}
      </p>
      {url ? <p className="text-[12px] wrap-break-word">{url}</p> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={cancelling} onClick={onCancel}>
          {CAPTURE_CANCEL_LABEL}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          loading={starting}
          disabled={cancelling}
          onClick={onSignIn}
        >
          {MCP_SERVER_ACTIONS.signIn}
        </Button>
      </div>
    </div>
  )
}
