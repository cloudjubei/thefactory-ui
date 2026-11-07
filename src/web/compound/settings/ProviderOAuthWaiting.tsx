import { PROVIDER_OAUTH_COPY } from '../../../headless'
import { Alert, Button } from '../..'

export type ProviderOAuthWaitingProps = {
  error: string | null
  onOpenAgain: () => void
  /** Backs out of the sign-in, whatever became of the browser. */
  onBackOut: () => void
}

/** The sign-in is in the browser. It moves on by itself, and waits as long as the person does. */
export default function ProviderOAuthWaiting({
  error,
  onOpenAgain,
  onBackOut,
}: ProviderOAuthWaitingProps) {
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{PROVIDER_OAUTH_COPY.waitingTitle}</span>
        <span className="text-sm text-(--text-secondary)">{PROVIDER_OAUTH_COPY.waitingBody}</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onBackOut}>
          {PROVIDER_OAUTH_COPY.backOut}
        </Button>
        <Button type="button" variant="secondary" onClick={onOpenAgain}>
          {PROVIDER_OAUTH_COPY.openAgain}
        </Button>
      </div>
    </div>
  )
}
