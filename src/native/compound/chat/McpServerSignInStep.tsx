import { Text, View } from 'react-native'

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
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface McpServerSignInStepProps {
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

/** Native peer of web's `McpServerSignInStep`: the sign-in left once a card's server is added. */
export default function McpServerSignInStep({
  url,
  pendingUrl,
  busy,
  error,
  onSignIn,
  onOpenPage,
  onCancel,
}: McpServerSignInStepProps) {
  const { theme, status: statusTokens } = useNativeTheme()
  const PAD = nativeSpace[4]

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: statusTokens.working.bg,
        paddingHorizontal: PAD,
        paddingVertical: PAD,
        gap: nativeSpace[2],
      }}
    >
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{MCP_CAPTURE_SIGN_IN_NOTE}</Text>
      {url ? <Text style={{ fontSize: 12, color: theme.text.primary }}>{url}</Text> : null}
      {pendingUrl ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {MCP_SERVER_SIGN_IN_PENDING}
          </Text>
          <Button size="sm" variant="secondary" onPress={() => onOpenPage(pendingUrl)}>
            {MCP_SERVER_ACTIONS.openPage}
          </Button>
        </View>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: nativeSpace[2],
          flexWrap: 'wrap',
        }}
      >
        <Button size="sm" variant="ghost" disabled={busy} onPress={onCancel}>
          {CAPTURE_CANCEL_LABEL}
        </Button>
        <Button
          size="sm"
          variant={pendingUrl ? 'secondary' : 'primary'}
          loading={busy}
          disabled={busy}
          onPress={onSignIn}
        >
          {pendingUrl ? MCP_SERVER_ACTIONS.signInAgain : MCP_SERVER_ACTIONS.signIn}
        </Button>
      </View>
    </View>
  )
}
