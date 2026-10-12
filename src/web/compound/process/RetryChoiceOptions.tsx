import {
  PROCESS_RETRY_MODE_DETAILS,
  PROCESS_RETRY_MODE_HEADING,
  PROCESS_RETRY_MODE_LABELS,
  processTurnLimitOfView,
  type ProcessRetryOffer,
  type ProcessRetryPick,
  type ProcessTurnLimitView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { TurnLimitField } from '../TurnLimitField'

export type RetryChoiceOptionsProps = {
  /** Whether the step's agent can carry on and what it does by default, when the retry offers the pick. */
  retry?: ProcessRetryOffer
  /** The turn-limit control's words and range, when the retry raises the limit. */
  turnLimitView?: ProcessTurnLimitView
  pick: ProcessRetryPick
  onPick: (pick: ProcessRetryPick) => void
}

/**
 * What trying a step again lets the person pick beside the button: whether its
 * agent carries on where it left off or starts fresh — the step's default
 * picked, with why — and, at a spent turn limit, the limit it runs on.
 */
export function RetryChoiceOptions({
  retry,
  turnLimitView,
  pick,
  onPick,
}: RetryChoiceOptionsProps) {
  const limit = pick.turnLimit
  return (
    <div className="flex flex-col gap-3 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2">
      {retry ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-(--text-secondary)">
            {PROCESS_RETRY_MODE_HEADING}
          </span>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(['continue', 'fresh'] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={pick.retryMode === mode ? 'primary' : 'secondary'}
                disabled={mode === 'continue' && !retry.canContinue}
                aria-pressed={pick.retryMode === mode}
                title={PROCESS_RETRY_MODE_DETAILS[mode]}
                onClick={() => onPick({ ...pick, retryMode: mode })}
              >
                {PROCESS_RETRY_MODE_LABELS[mode]}
              </Button>
            ))}
          </div>
          <span className="text-[10px] text-(--text-tertiary)">
            {pick.retryMode ? PROCESS_RETRY_MODE_DETAILS[pick.retryMode] : ''} {retry.reason}
          </span>
        </div>
      ) : null}
      {turnLimitView && limit ? (
        <TurnLimitField
          {...turnLimitView}
          limited={limit.limitTurns}
          maxTurns={limit.maxTurns}
          onChange={(next) => onPick({ ...pick, turnLimit: processTurnLimitOfView(next) })}
        />
      ) : null}
    </div>
  )
}

export default RetryChoiceOptions
