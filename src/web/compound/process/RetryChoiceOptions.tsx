import {
  PROCESS_RETRY_MODE_DETAILS,
  PROCESS_RETRY_MODE_HEADING,
  PROCESS_RETRY_MODE_LABELS,
  processTurnLimitOfView,
  type ProcessRetryOffer,
  type ProcessRetryMode,
  type ProcessRetryPick,
  type ProcessRetrySpendView,
  type ProcessTurnLimitView,
} from '../../../headless'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import { TurnLimitField } from '../TurnLimitField'

export type RetryChoiceOptionsProps = {
  /** Whether the step's agent can carry on and what it does by default, when the retry offers the pick. */
  retry?: ProcessRetryOffer
  /** The turn-limit control's words and range, when the retry raises the limit. */
  turnLimitView?: ProcessTurnLimitView
  /** The spend raise's field, when the retry raises a spend limit. */
  spendView?: ProcessRetrySpendView
  /** The raise as the person types it. */
  onSpendChange?: (text: string) => void
  pick: ProcessRetryPick
  onPick: (pick: ProcessRetryPick) => void
}

const RETRY_MODES = ['continue', 'fresh'] as const

/**
 * What trying a step again lets the person pick beside the button: whether its
 * agent carries on where it left off or starts fresh, as a toggle so it never
 * reads as a second button to press — the step's default picked, with why — and, at a spent turn limit, the limit it runs on;
 * at a spend limit, the amount it may spend.
 */
export function RetryChoiceOptions({
  retry,
  turnLimitView,
  spendView,
  onSpendChange,
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
          {retry.canContinue ? (
            <SegmentedControl
              size="sm"
              ariaLabel={PROCESS_RETRY_MODE_HEADING}
              className="self-start"
              options={RETRY_MODES.map((mode) => ({
                value: mode,
                label: PROCESS_RETRY_MODE_LABELS[mode],
              }))}
              value={pick.retryMode ?? 'continue'}
              onChange={(mode) => onPick({ ...pick, retryMode: mode as ProcessRetryMode })}
            />
          ) : (
            <span className="text-[12px] font-medium text-(--text-primary)">
              {PROCESS_RETRY_MODE_LABELS.fresh}
            </span>
          )}
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
      {spendView && onSpendChange ? (
        <Field
          label={`${spendView.label} (${spendView.unit})`}
          hint={spendView.hint}
          {...(spendView.error ? { error: spendView.error } : {})}
        >
          <Input
            value={spendView.text}
            invalid={Boolean(spendView.error)}
            inputMode="decimal"
            aria-label={spendView.label}
            onChange={(e) => onSpendChange(e.target.value)}
          />
        </Field>
      ) : null}
    </div>
  )
}

export default RetryChoiceOptions
