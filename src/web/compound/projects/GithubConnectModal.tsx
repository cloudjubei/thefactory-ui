import { useEffect } from 'react'
import { Alert, Button, Modal, Spinner } from '../..'
import type { UseProjectGithubRepoResult } from '../../../headless'

export interface GithubConnectModalProps {
  isOpen: boolean
  onClose: () => void
  github: UseProjectGithubRepoResult
}

/**
 * The GitHub device-authorization flow in a popup: shows the one-time code to
 * enter at github.com, waits for authorization, and closes itself once the
 * account is connected. Dismissing it cancels the in-flight poll. Driven by
 * {@link useProjectGithubRepo}.
 */
export default function GithubConnectModal({ isOpen, onClose, github }: GithubConnectModalProps) {
  const { connected, connecting, device, connectError, connect, cancelConnect } = github

  // Connected → done; close the popup.
  useEffect(() => {
    if (isOpen && connected === true) onClose()
  }, [isOpen, connected, onClose])

  const close = () => {
    cancelConnect()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Connect GitHub" size="sm">
      <div className="flex flex-col gap-3">
        {connectError ? <Alert variant="error">{connectError}</Alert> : null}

        {device ? (
          <>
            <p className="text-sm text-(--text-primary)">
              1. Open{' '}
              <a
                className="underline"
                href={device.verificationUri}
                target="_blank"
                rel="noopener noreferrer"
              >
                {device.verificationUri}
              </a>
            </p>
            <p className="text-sm text-(--text-primary)">2. Enter this code:</p>
            <div className="flex items-center justify-center p-3 rounded-md border border-(--border-default) bg-(--surface-subtle)">
              <span className="font-mono text-2xl tracking-widest text-(--text-primary)">
                {device.userCode}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-(--text-secondary)">
              <Spinner size={12} /> Waiting for authorization…
            </div>
          </>
        ) : connecting ? (
          <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
            <Spinner size={14} /> Starting…
          </div>
        ) : connectError ? (
          <Button type="button" variant="outline" className="self-start" onClick={connect}>
            Try again
          </Button>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
