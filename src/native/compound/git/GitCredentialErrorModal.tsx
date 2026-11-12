import { Text, View } from 'react-native'
import { GIT_CREDENTIAL_FIX_TEXT } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type GitCredentialErrorOp = 'push' | 'pull' | 'fetch' | 'commit'

export interface GitCredentialErrorModalProps {
  isOpen: boolean
  onClose: () => void
  /** Opens the git credentials settings — hosts pass `useGit().openCredentialSettings`
   *  after dismissing. Called instead of `onClose`. */
  onOpenSettings: () => void
  op?: GitCredentialErrorOp
  message?: string
  repoUrl?: string
}

/**
 * Native peer of web's [GitCredentialErrorModal](../../../web/compound/git/GitCredentialErrorModal.tsx)
 * — same prop surface, same content, rendered in a `Modal` with two
 * footer buttons (Dismiss + Update credentials).
 */
export default function GitCredentialErrorModal({
  isOpen,
  onClose,
  onOpenSettings,
  op,
  message,
  repoUrl,
}: GitCredentialErrorModalProps) {
  const { theme } = useNativeTheme()
  const verb = op ? GIT_CREDENTIAL_FIX_TEXT.ops[op] : GIT_CREDENTIAL_FIX_TEXT.anyOp
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={GIT_CREDENTIAL_FIX_TEXT.title}
      size="md"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="secondary" onPress={onClose}>
            {GIT_CREDENTIAL_FIX_TEXT.dismiss}
          </Button>
          <Button onPress={onOpenSettings}>{GIT_CREDENTIAL_FIX_TEXT.update}</Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <Alert variant="error">{GIT_CREDENTIAL_FIX_TEXT.refused(verb)}</Alert>
        {repoUrl ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {GIT_CREDENTIAL_FIX_TEXT.repository}{' '}
            <Text style={{ fontFamily: 'Menlo', color: theme.text.secondary }}>{repoUrl}</Text>
          </Text>
        ) : null}
        {message ? (
          <View
            style={{
              padding: nativeSpace[2],
              borderRadius: 6,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.muted,
            }}
          >
            <Text
              style={{
                fontFamily: 'Menlo',
                fontSize: 11,
                color: theme.text.primary,
              }}
            >
              {message}
            </Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {GIT_CREDENTIAL_FIX_TEXT.hint}
        </Text>
      </View>
    </Modal>
  )
}
