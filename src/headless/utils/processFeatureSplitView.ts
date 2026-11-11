import type { ProcessFeatureSplitOffer } from 'thefactory-tools/types'
import { processFeatureSplitProblem } from 'thefactory-tools/utils'

import { proofChangeDraftStart, proofChangeView } from './processProofChangeView'
import type {
  FeatureSplitDraft,
  FeatureSplitResumeFields,
  FeatureSplitView,
} from './processFeatureSplitViewTypes'
import { FEATURE_SPLIT_COUNT, FEATURE_SPLIT_PICK_POINTS } from './processFeatureSplitViewConstants'

/**
 * Where a split starts: no point picked, no title, the proof as a change of
 * it would start ({@link proofChangeDraftStart}) where the stop offers one —
 * unused until the person switches it on — and no why.
 */
export function featureSplitDraftStart(
  offer: Pick<ProcessFeatureSplitOffer, 'proofChange'>,
): FeatureSplitDraft {
  return {
    moved: [],
    title: '',
    changeProof: false,
    ...(offer.proofChange ? { proof: proofChangeDraftStart(offer.proofChange) } : {}),
    note: '',
  }
}

/** The draft with the point at `index` picked or unpicked, picks kept in order. */
export function toggleFeatureSplitPoint(
  draft: FeatureSplitDraft,
  index: number,
): FeatureSplitDraft {
  const moved = draft.moved.includes(index)
    ? draft.moved.filter((i) => i !== index)
    : [...draft.moved, index].sort((a, b) => a - b)
  return { ...draft, moved }
}

/**
 * The split as its editor shows it: every acceptance point, picked or not,
 * how many move and stay, the proof editor while changing proof too, and
 * whether it can be sent — by the engine's own rule
 * (`processFeatureSplitProblem`), asking for a point first.
 */
export function featureSplitView(
  offer: ProcessFeatureSplitOffer,
  draft: FeatureSplitDraft,
): FeatureSplitView {
  const proofOffer = offer.proofChange
  const changing = draft.changeProof && !!proofOffer && !!draft.proof
  const problem =
    draft.moved.length === 0
      ? FEATURE_SPLIT_PICK_POINTS
      : processFeatureSplitProblem(
          offer,
          { movePoints: draft.moved.map((i) => i + 1), followUpTitle: draft.title },
          changing ? { kinds: draft.proof!.kinds } : undefined,
        )
  return {
    points: offer.points.map((text, index) => ({
      index,
      number: index + 1,
      text,
      picked: draft.moved.includes(index),
    })),
    title: draft.title,
    count: FEATURE_SPLIT_COUNT(draft.moved.length, offer.points.length - draft.moved.length),
    canChangeProof: !!proofOffer,
    changeProof: changing,
    ...(changing ? { proof: proofChangeView(proofOffer!, draft.proof!) } : {}),
    note: draft.note,
    ...(problem ? { problem } : {}),
    canSend: problem === undefined,
  }
}

/** What a split sends: its points by number from 1, the title and why trimmed, the proof only while changing it. */
export function featureSplitResumeFields(draft: FeatureSplitDraft): FeatureSplitResumeFields {
  const note = draft.note.trim()
  return {
    movePoints: draft.moved.map((i) => i + 1),
    followUpTitle: draft.title.trim(),
    ...(draft.changeProof && draft.proof ? { proofKinds: [...draft.proof.kinds] } : {}),
    ...(note ? { note } : {}),
  }
}

/** The choices a stop shows: moving points into a follow-up left out where nothing carries it out. */
export function parkChoicesWithSplit<T extends { choice: string }>(
  choices: readonly T[],
  canSplit: boolean,
): T[] {
  return canSplit ? [...choices] : choices.filter((c) => c.choice !== 'split-follow-up')
}
