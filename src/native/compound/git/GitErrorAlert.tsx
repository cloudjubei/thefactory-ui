import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { GIT_CREDENTIAL_FIX_TEXT, type GitOpError } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface GitErrorAlertProps {
  error: GitOpError
  /** Shown in place of `error.message`, e.g. "Committed. The push failed: …". */
  children?: ReactNode
  /** Offered as "Update credentials" when the error is a refused credential; hidden when absent. */
  onUpdateCredentials?: () => void
  onDismiss?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer of web's `GitErrorAlert`: a failed git op shown inline, with an
 * "Update credentials" button when the credentials were refused.
 */
export default function GitErrorAlert({
  error,
  children,
  onUpdateCredentials,
  onDismiss,
  style,
}: GitErrorAlertProps) {
  const { status } = useNativeTheme()
  const fix = error.credential ? onUpdateCredentials : undefined
  const body = children ?? error.message
  return (
    <Alert variant="error" {...(onDismiss ? { onDismiss } : {})} {...(style ? { style } : {})}>
      <View style={{ gap: nativeSpace[3] }}>
        {typeof body === 'string' ? (
          <Text style={{ fontSize: 14, color: status.stuck.softFg }}>{body}</Text>
        ) : (
          body
        )}
        {fix ? (
          <View style={{ flexDirection: 'row' }}>
            <Button size="sm" variant="secondary" onPress={fix}>
              {GIT_CREDENTIAL_FIX_TEXT.update}
            </Button>
          </View>
        ) : null}
      </View>
    </Alert>
  )
}
