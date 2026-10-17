import { PROOF_KINDS, PROOF_KIND_LABELS, PROOF_KIND_MEANINGS } from 'thefactory-tools/constants'
import type { ProcessProofChangeOffer, ProofKind } from 'thefactory-tools/types'
import { processProofChangeProblem } from 'thefactory-tools/utils'

import type { ProofChangeDraft, ProofChangeView } from './processProofChangeViewTypes'
import { PROOF_CHANGE_HINT, PROOF_CHANGE_HINT_RUN_ONLY } from './processProofChangeViewConstants'
import { PROOF_KIND_STATUS_TONES, PROOF_KIND_STATUS_WORDS } from './proofPlanViewConstants'

/**
 * Where a change of proof starts: what proves the feature now, less the kinds
 * that stopped the step (unmet or unchecked) — what the person came to drop —
 * or all of it when nothing would be left. Nothing is saved and no why is said.
 */
export function proofChangeDraftStart(
  offer: Pick<ProcessProofChangeOffer, 'current' | 'standings'>,
): ProofChangeDraft {
  const stopped = new Set(
    offer.standings
      .filter((s) => s.status === 'unmet' || s.status === 'unchecked')
      .map((s) => s.kind),
  )
  const kept = offer.current.filter((kind) => !stopped.has(kind))
  return { kinds: kept.length > 0 ? kept : [...offer.current], save: false, note: '' }
}

/** The draft with `kind` picked or unpicked, kinds kept in their canonical order. */
export function toggleProofChangeKind(draft: ProofChangeDraft, kind: ProofKind): ProofChangeDraft {
  const picked = draft.kinds.includes(kind)
    ? draft.kinds.filter((k) => k !== kind)
    : [...draft.kinds, kind]
  return { ...draft, kinds: PROOF_KINDS.filter((k) => picked.includes(k)) }
}

/**
 * The change as its editor shows it: every kind of proof, picked or not, how
 * each the work needed stood when it stopped, the ones the run cannot produce
 * marked with why — and not pickable unless the work already needed them —
 * whether it can be saved onto a feature (only on a feature's run), and
 * whether it can be sent as it stands.
 */
export function proofChangeView(
  offer: ProcessProofChangeOffer,
  draft: ProofChangeDraft,
): ProofChangeView {
  const standings = new Map(offer.standings.map((s) => [s.kind, s]))
  const unavailable = new Map(offer.unavailable.map((u) => [u.kind, u.reason]))
  const canSave = offer.featureId !== undefined
  const problem = processProofChangeProblem(
    offer,
    { kinds: draft.kinds },
    offer.unavailable,
    canSave && draft.save,
  )
  return {
    ...(offer.featureId ? { featureId: offer.featureId } : {}),
    kinds: PROOF_KINDS.map((kind) => {
      const standing = standings.get(kind)
      const reason = unavailable.get(kind)
      return {
        kind,
        label: PROOF_KIND_LABELS[kind],
        meaning: PROOF_KIND_MEANINGS[kind],
        checked: draft.kinds.includes(kind),
        ...(standing
          ? {
              standing: {
                status: standing.status,
                word: PROOF_KIND_STATUS_WORDS[standing.status],
                tone: PROOF_KIND_STATUS_TONES[standing.status],
                detail: standing.detail,
              },
            }
          : {}),
        ...(reason ? { unavailable: reason } : {}),
        disabled: reason !== undefined && !offer.current.includes(kind),
      }
    }),
    hint: canSave ? PROOF_CHANGE_HINT : PROOF_CHANGE_HINT_RUN_ONLY,
    canSave,
    save: canSave && draft.save,
    note: draft.note,
    ...(problem ? { problem } : {}),
    canSend: problem === undefined,
  }
}
