import {
  processLaunchTurnLimitView,
  type RunProposalEdit,
  type RunProposalEditState,
} from '../../../headless'
import RetryChoiceOptions from '../process/RetryChoiceOptions'
import FeatureClosureList from '../process/FeatureClosureList'

export type RunProposalEditPanelProps = {
  edit: RunProposalEdit
  state: RunProposalEditState
  busy: boolean
  onChange: (state: RunProposalEditState) => void
}

/**
 * What a run action's card lets the person change before approving — how a
 * retried step's agent starts, the turn limit, what each feature of an ended
 * run is left as — with the same controls the run's own page uses.
 */
export function RunProposalEditPanel({ edit, state, busy, onChange }: RunProposalEditPanelProps) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {edit.retry || edit.turnLimit ? (
        <RetryChoiceOptions
          {...(edit.retry ? { retry: edit.retry } : {})}
          {...(edit.turnLimit
            ? { turnLimitView: processLaunchTurnLimitView(edit.turnLimit.runner) }
            : {})}
          pick={{
            ...(state.retryMode ? { retryMode: state.retryMode } : {}),
            ...(state.turnLimit ? { turnLimit: state.turnLimit } : {}),
          }}
          onPick={(pick) => onChange({ ...state, ...pick })}
        />
      ) : null}
      {state.closure ? (
        <FeatureClosureList
          rows={state.closure}
          disabled={busy}
          onPick={(featureId, pick) =>
            onChange({
              ...state,
              closure: state.closure?.map((r) =>
                r.featureId === featureId ? { ...r, ...pick } : r,
              ),
            })
          }
        />
      ) : null}
    </div>
  )
}

export default RunProposalEditPanel
