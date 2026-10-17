import {
  PROOF_CHANGE_HEADING,
  PROOF_CHANGE_SAVE_LABEL,
  processLaunchTurnLimitView,
  proofChangeView,
  toggleProofChangeKind,
  type RunProposalEdit,
  type RunProposalEditState,
} from '../../../headless'
import { Text, View } from 'react-native'
import RetryChoiceOptions from '../process/RetryChoiceOptions'
import FeatureClosureList from '../process/FeatureClosureList'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'

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
  const { theme } = useNativeTheme()
  const picked = state.proofChange
  const proof =
    edit.proofChange && picked
      ? proofChangeView(edit.proofChange, { ...picked, note: '' })
      : undefined
  return (
    <View style={{ gap: nativeSpace[2], paddingVertical: nativeSpace[2] }}>
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
        <View style={{ gap: nativeSpace[2] }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 11,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: theme.text.muted,
            }}
          >
            {PROOF_CHANGE_HEADING}
          </Text>
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
        </View>
      ) : null}
    </View>
  )
}

export default RunProposalEditPanel
