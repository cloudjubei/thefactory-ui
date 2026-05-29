import Spinner from '../../primitives/Spinner'
import { Button } from '../../primitives/Button'

export type LoadingScreenProps = {
  label: string
  error?: string | null
  /**
   * Optional retry handler. When supplied AND `error` is set, the
   * error pane renders a "Retry" button that invokes it. Useful for
   * timed-out / aborted requests where the underlying op is safe to
   * re-issue (e.g. the GitContext bundle).
   */
  onRetry?: () => void
  /** Override the retry button label (default: "Retry"). */
  retryLabel?: string
}

/**
 * Pure presentational loading/error view. All orchestration (which stage
 * we're at, when to move on) is the caller's concern.
 */
export default function LoadingScreen({
  label,
  error = null,
  onRetry,
  retryLabel = 'Retry',
}: LoadingScreenProps) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3 max-w-md text-center px-6">
        {!error && <Spinner size={32} />}
        <div className="text-sm opacity-80">{label}</div>
        {error && (
          <div className="text-xs opacity-70 mt-2" style={{ color: 'var(--color-red-700)' }}>
            {error}
          </div>
        )}
        {error && onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry} className="mt-3">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
