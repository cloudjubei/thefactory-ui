import { PROOF_KINDS, PROOF_KIND_LABELS, PROOF_KIND_MEANINGS } from 'thefactory-tools/constants'
import type { ProcessProofChangeOffer, ProofKind } from 'thefactory-tools/types'
import { processProofChangeKeptKinds, processProofChangeProblem } from 'thefactory-tools/utils'

import type {
  ProofChangeDraft,
  ProofChangeKindView,
  ProofChangeView,
} from './processProofChangeViewTypes'
import {
  PROOF_CHANGE_HINT,
  PROOF_CHANGE_HINT_RUN_ONLY,
  PROOF_CHANGE_SCREENS_CAN_GO,
  PROOF_CHANGE_SCREENS_KEPT,
  PROOF_CHANGE_VIDEO_CAN_GO,
  PROOF_CHANGE_VIDEO_KEPT,
} from './processProofChangeViewConstants'
import { PROOF_KIND_STATUS_TONES, PROOF_KIND_STATUS_WORDS } from './proofPlanViewConstants'

const keptWhy = (kind: ProofKind) =>
  kind === 'ui-video' ? PROOF_CHANGE_VIDEO_KEPT : PROOF_CHANGE_SCREENS_KEPT

const canGoWhy = (kind: ProofKind) =>
  kind === 'ui-video' ? PROOF_CHANGE_VIDEO_CAN_GO : PROOF_CHANGE_SCREENS_CAN_GO

/**
 * How a kind that shows a change on screen stands in a draft: `held` when no
 * other such kind is picked — one of them always stays, so it cannot be
 * unpicked — `free` when another is picked beside it, and neither for a kind
 * the change is not kept to or one left unpicked beside a picked one.
 */
function keptStanding(
  offer: Pick<ProcessProofChangeOffer, 'current' | 'keepsScreens'>,
  picked: readonly ProofKind[],
  kind: ProofKind,
): 'held' | 'free' | undefined {
  const kept = processProofChangeKeptKinds(offer)
  if (!kept.includes(kind)) return undefined
  const others = kept.filter((k) => k !== kind && picked.includes(k))
  if (others.length === 0) return 'held'
  return picked.includes(kind) ? 'free' : undefined
}

/**
 * Where a change of proof starts: what proves the feature now, less the kinds
 * that stopped the step (unmet or unchecked) — what the person came to drop —
 * or all of it when nothing would be left. Of the screens and video of a
 * change that shows on screen (`keepsScreens`) one always stays: those that
 * stopped the step are dropped only while another of them stands, and all of
 * them stay picked when every one stopped it — the person picks which goes.
 * Nothing is saved and no why is said.
 */
export function proofChangeDraftStart(
  offer: Pick<ProcessProofChangeOffer, 'current' | 'standings' | 'keepsScreens'>,
): ProofChangeDraft {
  const short = new Set(
    offer.standings
      .filter((s) => s.status === 'unmet' || s.status === 'unchecked')
      .map((s) => s.kind),
  )
  const kept = processProofChangeKeptKinds(offer)
  const everyKeptShort = kept.every((kind) => short.has(kind))
  const left = offer.current.filter(
    (kind) => !short.has(kind) || (everyKeptShort && kept.includes(kind)),
  )
  return { kinds: left.length > 0 ? left : [...offer.current], save: false, note: '' }
}

/**
 * A kind's switch label where nothing fits beneath it: its name, then why it
 * is held, that it can go while another stays, or why the run cannot produce it.
 */
export function proofChangeKindLabel(
  kind: Pick<ProofChangeKindView, 'label' | 'kept' | 'canGo' | 'unavailable'>,
): string {
  const said = kind.kept ?? kind.canGo ?? kind.unavailable
  return said ? `${kind.label} — ${said}` : kind.label
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
 * of the screens and video of a change that shows on screen the last one
 * picked held picked with why, each free to go while another stays —
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
      const kept = keptStanding(offer, draft.kinds, kind)
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
        ...(kept === 'held' ? { kept: keptWhy(kind) } : {}),
        ...(kept === 'free' ? { canGo: canGoWhy(kind) } : {}),
        disabled:
          (kept === 'held' && draft.kinds.includes(kind)) ||
          (reason !== undefined && !offer.current.includes(kind)),
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
