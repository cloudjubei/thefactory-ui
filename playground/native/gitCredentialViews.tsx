import { View } from 'react-native'
import { GIT_COMMIT_PUSH_TEXT } from 'thefactory-ui/headless'
import GitErrorAlert from '../../src/native/compound/git/GitErrorAlert'
import type { NativeView } from './views'

const noop = () => {}

const REFUSED =
  "git push origin dev failed: fatal: could not read Password for 'https://Perpetuating@dev.azure.com': terminal prompts disabled"

const REJECTED =
  'git push origin dev failed: ! [rejected] dev -> dev (fetch first) — the remote has work you do not have locally.'

/**
 * A push that failed after a commit, on a phone: refused for its credentials
 * (`?state=credentials`, with "Update credentials") or rejected for any other
 * reason (`?state=rejected`, no button).
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
]
