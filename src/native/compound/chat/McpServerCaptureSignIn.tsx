import { useState } from 'react'
import { Linking } from 'react-native'

import { useMcpServerSignIn } from '../../../headless/hooks/useMcpServerSignIn'
import { CAPTURE_CANCEL_ERROR } from '../../../headless/utils/credentialCaptureConstants'
import type { CredentialCapture } from '../../../headless/utils/credentialCaptureTypes'
import type { McpServerOwner } from '../../../headless/utils/mcpServersTypes'
import McpServerSignInStep from './McpServerSignInStep'

export interface McpServerCaptureSignInProps {
  capture: CredentialCapture
  owner: McpServerOwner
  onCancel: () => Promise<void>
}

/** Native peer of web's `McpServerCaptureSignIn`. The backend answers the card, not this. */
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
          if (page) void Linking.openURL(page)
        })
      }}
      onOpenPage={(url) => void Linking.openURL(url)}
      onCancel={cancel}
    />
  )
}
