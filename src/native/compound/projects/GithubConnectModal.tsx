import { useEffect } from 'react'
import { Linking, Text, View } from 'react-native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import type { UseProjectGithubRepoResult } from '../../../headless'

export interface GithubConnectModalProps {
  isOpen: boolean
  onClose: () => void
  github: UseProjectGithubRepoResult
}

/**
 * Native peer of the web `GithubConnectModal`. The GitHub device-authorization
 * flow in a popup: shows the one-time code to enter at github.com, waits for
 * authorization, and closes once the account is connected. Dismissing it
 * cancels the in-flight poll. Driven by `useProjectGithubRepo`.
 */
export default function GithubConnectModal({ isOpen, onClose, github }: GithubConnectModalProps) {
  const { connected, connecting, device, connectError, connect, cancelConnect } = github

  useEffect(() => {
    if (isOpen && connected === true) onClose()
  }, [isOpen, connected, onClose])

  const close = () => {
    cancelConnect()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Connect GitHub" size="sm">
      <View style={{ gap: 12 }}>
        {connectError ? <Alert variant="error">{connectError}</Alert> : null}

        {device ? (
          <>
            <Text className="text-sm text-[var(--text-primary)]">
              Enter this code at github.com/login/device:
            </Text>
            <View
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)]"
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text
                className="text-[var(--text-primary)]"
                style={{ fontFamily: 'Courier', fontSize: 24, letterSpacing: 6 }}
              >
                {device.userCode}
              </Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => void Linking.openURL(device.verificationUri)}
            >
              Open GitHub
            </Button>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Spinner size={12} />
              <Text className="text-[11px] text-[var(--text-secondary)]">
                Waiting for authorization…
              </Text>
            </View>
          </>
        ) : connecting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Spinner size={14} />
            <Text className="text-[var(--text-secondary)]">Starting…</Text>
          </View>
        ) : connectError ? (
          <Button variant="outline" onPress={() => void connect()}>
            Try again
          </Button>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onPress={close}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  )
}
