import { useState } from 'react'
import { PROVIDER_OAUTH_COPY } from '../../../headless'
import { Alert, Button, Field, Input } from '../..'

export type ProviderOAuthWaitingProps = {
  error: string | null
  finishing: boolean
  onOpenAgain: () => void
  /** Takes the address the browser ended on. It goes no further than the sign-in. */
  onFinish: (address: string) => void
  onStartOver: () => void
}

/** The sign-in is in the browser: the person pastes the page it ended on to finish here. */
export default function ProviderOAuthWaiting({
  error,
  finishing,
  onOpenAgain,
  onFinish,
  onStartOver,
}: ProviderOAuthWaitingProps) {
  const [address, setAddress] = useState('')
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{PROVIDER_OAUTH_COPY.waitingTitle}</span>
        <span className="text-sm text-(--text-secondary)">{PROVIDER_OAUTH_COPY.waitingBody}</span>
      </div>
      <Field label={PROVIDER_OAUTH_COPY.returnLabel}>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={PROVIDER_OAUTH_COPY.returnPlaceholder}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
      </Field>
      <Button type="button" variant="secondary" onClick={onOpenAgain}>
        {PROVIDER_OAUTH_COPY.openAgain}
      </Button>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onStartOver}>
          {PROVIDER_OAUTH_COPY.startOver}
        </Button>
        <Button
          type="button"
          loading={finishing}
          disabled={!address.trim() || finishing}
          onClick={() => onFinish(address)}
        >
          {PROVIDER_OAUTH_COPY.finish}
        </Button>
      </div>
    </div>
  )
}
