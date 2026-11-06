import { useState } from 'react'
import { useMcpServerSignIn } from '../../../headless/hooks/useMcpServerSignIn'
import { CAPTURE_CANCEL_ERROR } from '../../../headless/utils/credentialCaptureConstants'
import type { CredentialCapture } from '../../../headless/utils/credentialCaptureTypes'
import type { McpServerOwner } from '../../../headless/utils/mcpServersTypes'
import { openInBrowser } from '../settings/openInBrowser'
import McpServerSignInStep from './McpServerSignInStep'

export type McpServerCaptureSignInProps = {
  capture: CredentialCapture
  owner: McpServerOwner
  onCancel: () => Promise<void>
}

/**
 * A server card's sign-in, started as Settings starts it. Nothing here answers the
 * card: the backend does, when the browser comes back from the server.
 */
export default function McpServerCaptureSignIn({
  capture,
  owner,
  onCancel,
}: McpServerCaptureSignInProps) {
  const signIn = useMcpServerSignIn(owner, capture.mcpServer?.serverId ?? '')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const cancel = () => {
    setCancelling(true)
    setCancelError(null)
    void onCancel().catch((err: unknown) => {
      setCancelError(err instanceof Error ? err.message : CAPTURE_CANCEL_ERROR)
      setCancelling(false)
    })
  }

  return (
    <McpServerSignInStep
      url={capture.mcpServer?.url}
      pendingUrl={signIn.pendingUrl}
      busy={signIn.busy || cancelling}
      error={signIn.error ?? cancelError}
      onSignIn={() => {
        void signIn.signIn().then((page) => {
          if (page) openInBrowser(page)
        })
      }}
      onOpenPage={openInBrowser}
      onCancel={cancel}
    />
  )
}
