import { View } from 'react-native'
import { GIT_COMMIT_PUSH_TEXT } from 'thefactory-ui/headless'
import GitCredentialErrorModal from '../../src/native/compound/git/GitCredentialErrorModal'
import GitErrorAlert from '../../src/native/compound/git/GitErrorAlert'
import type { NativeView } from './views'

const noop = () => {}

const REFUSED =
  "git push origin dev failed: fatal: could not read Password for 'https://Perpetuating@dev.azure.com': terminal prompts disabled"

const REJECTED =
  'git push origin dev failed: ! [rejected] dev -> dev (fetch first) — the remote has work you do not have locally.'

const REPO = 'https://Perpetuating@dev.azure.com/perpetuating/covision/_git/covision-android'

/**
 * A push that failed after a commit, on a phone: refused for its credentials
 * (`?state=credentials`, with "Update credentials") or rejected for any other
 * reason (`?state=rejected`, no button). `git-credentials-popup` is the app-wide popup.
 */
export const GIT_CREDENTIAL_VIEWS: NativeView[] = [
  {
    id: 'git-push-error',
    title: 'A push error, with or without Update credentials',
    render: (address) => {
      const credential = address.get('state') !== 'rejected'
      const message = credential ? REFUSED : REJECTED
      return (
        <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>
          <GitErrorAlert error={{ message, credential }} onUpdateCredentials={noop}>
            {GIT_COMMIT_PUSH_TEXT.pushFailed(message)}
          </GitErrorAlert>
        </View>
      )
    },
  },
  {
    id: 'git-credentials-popup',
    title: 'Git credentials needed',
    render: () => (
      <GitCredentialErrorModal
        isOpen
        onClose={noop}
        onOpenSettings={noop}
        op="push"
        message={REFUSED}
        repoUrl={REPO}
      />
    ),
  },
]
