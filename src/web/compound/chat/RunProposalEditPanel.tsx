import {
  PROOF_CHANGE_HEADING,
  PROOF_CHANGE_SAVE_LABEL,
  processLaunchTurnLimitView,
  proofChangeView,
  toggleProofChangeKind,
  type RunProposalEdit,
  type RunProposalEditState,
} from '../../../headless'
import { Switch } from '../../primitives/Switch'
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
 * run is left as, what proves a stopped feature — with the same controls the
 * run's own page uses.
 */
export function RunProposalEditPanel({ edit, state, busy, onChange }: RunProposalEditPanelProps) {
  const picked = state.proofChange
  const proof =
    edit.proofChange && picked
      ? proofChangeView(edit.proofChange, { ...picked, note: '' })
      : undefined
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
      {proof && picked ? (
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {PROOF_CHANGE_HEADING}
          </legend>
          {proof.kinds.map((kind) => (
            <Switch
              key={kind.kind}
              checked={kind.checked}
              disabled={busy || kind.disabled}
              onCheckedChange={() => {
                const next = toggleProofChangeKind({ ...picked, note: '' }, kind.kind)
                onChange({ ...state, proofChange: { kinds: next.kinds, save: next.save } })
              }}
              label={kind.unavailable ? `${kind.label} — ${kind.unavailable}` : kind.label}
            />
          ))}
          {proof.canSave ? (
            <Switch
              checked={picked.save}
              disabled={busy}
              onCheckedChange={(on) => onChange({ ...state, proofChange: { ...picked, save: on } })}
              label={PROOF_CHANGE_SAVE_LABEL}
            />
          ) : null}
        </fieldset>
      ) : null}
    </div>
  )
}

export default RunProposalEditPanel
