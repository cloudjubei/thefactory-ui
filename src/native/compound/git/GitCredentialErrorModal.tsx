import { Text, View } from 'react-native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export type GitCredentialErrorOp = 'push' | 'pull' | 'fetch' | 'commit'

export interface GitCredentialErrorModalProps {
  isOpen: boolean
  onClose: () => void
  /** Navigate to GitHub credentials settings (mobile route:
   *  `/settings/github`). Called instead of `onClose` so the host can
   *  navigate AND dismiss in one go. */
  onOpenSettings: () => void
  op?: GitCredentialErrorOp
  message?: string
  repoUrl?: string
}

const OP_LABEL: Record<GitCredentialErrorOp, string> = {
  push: 'push',
  pull: 'pull',
  fetch: 'fetch',
  commit: 'commit and push',
}

/**
 * Native peer of web's [GitCredentialErrorModal](../../../web/compound/git/GitCredentialErrorModal.tsx)
 * — same prop surface, same content, rendered in a `Modal` with two
 * footer buttons (Dismiss + Open GitHub Settings).
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GitHub credentials needed"
      size="md"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="secondary" onPress={onClose}>
            Dismiss
          </Button>
          <Button onPress={onOpenSettings}>Open GitHub Settings</Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <Alert variant="error">
          {`Couldn't ${verb} — the GitHub credentials configured for this project don't have access to its repository.`}
        </Alert>
        {repoUrl ? (
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
            Repository:{' '}
            <Text style={{ fontFamily: 'Menlo', color: nativeLightTheme.text.secondary }}>
              {repoUrl}
            </Text>
          </Text>
        ) : null}
        {message ? (
          <View
            style={{
              padding: nativeSpace[2],
              borderRadius: 6,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              backgroundColor: nativeLightTheme.surface.muted,
            }}
          >
            <Text
              style={{
                fontFamily: 'Menlo',
                fontSize: 11,
                color: nativeLightTheme.text.primary,
              }}
            >
              {message}
            </Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>
          Update your GitHub Personal Access Token in Settings → GitHub, or pick a
          credential set that has access to this repository.
        </Text>
      </View>
    </Modal>
  )
}
