import { PROOF_KINDS } from 'thefactory-tools/constants'
import type { LaunchProofPlan } from 'thefactory-tools/types'

import {
  LIVE_CHECK_CHOICE_LINES,
  LIVE_CHECK_CHOICE_OPTIONS,
  LIVE_CHECK_COPY,
  LIVE_CHECK_PLACED_BEFORE,
  LIVE_CHECK_PROOF_KIND,
  LIVE_CHECK_STEP_CHIPS,
} from './liveCheckLaunchConstants'
import type {
  GroupLaunchLiveCheckMetadata,
  GroupLaunchLiveCheckPicks,
  GroupLegLiveCheckOffer,
  GroupLegLiveCheckRow,
  LaunchLiveCheckView,
  LiveCheckChoice,
  LiveCheckDraft,
  LiveCheckOffer,
  LiveCheckOptions,
} from './liveCheckLaunchTypes'
import type { ProposalChip } from './processProposalView'
import type { ProofPlanDraft } from './proofPlanViewTypes'

const OFF: LiveCheckDraft = { choice: 'off', beforeAndAfter: false }

/** Whether a value is a mode a live check runs in. Pure. */
export function isLiveCheckMode(value: unknown): value is LiveCheckOptions['mode'] {
  return value === 'required' || value === 'ask-me'
}

/** A plan draft's live check: its mode while it holds the kind (required when it names none), else off. Pure. */
export function liveCheckDraftOf(
  draft: Pick<ProofPlanDraft, 'kinds' | 'liveCheck'>,
): LiveCheckDraft {
  if (!draft.kinds.includes(LIVE_CHECK_PROOF_KIND)) return { ...OFF }
  const mode = draft.liveCheck?.mode
  return {
    choice: isLiveCheckMode(mode) ? mode : 'required',
    beforeAndAfter: draft.liveCheck?.beforeAndAfter === true,
  }
}

/** Where an offer starts the row: its recommended mode, else off; before and after always off. Pure. */
export function liveCheckOfferDraft(offer: Pick<LiveCheckOffer, 'recommended'>): LiveCheckDraft {
  return isLiveCheckMode(offer.recommended)
    ? { choice: offer.recommended, beforeAndAfter: false }
    : { ...OFF }
}

/** What a draft sends with the plan: nothing while off, `beforeAndAfter` only when on. Pure. */
export function liveCheckOptionsOf(draft: LiveCheckDraft): LiveCheckOptions | undefined {
  if (draft.choice === 'off') return undefined
  return { mode: draft.choice, ...(draft.beforeAndAfter ? { beforeAndAfter: true as const } : {}) }
}

/** A draft after the person's change; switching off also turns before and after off. Pure. */
export function changeLiveCheckDraft(
  draft: LiveCheckDraft,
  change: Partial<LiveCheckDraft>,
): LiveCheckDraft {
  const choice: LiveCheckChoice = change.choice ?? draft.choice
  if (choice === 'off') return { ...OFF }
  return { choice, beforeAndAfter: change.beforeAndAfter ?? draft.beforeAndAfter }
}

/** A plan draft holding the live check as `live` says: the kind in its canonical place, or gone. Pure. */
export function withLiveCheckDraft(draft: ProofPlanDraft, live: LiveCheckDraft): ProofPlanDraft {
  const options = liveCheckOptionsOf(live)
  const others = draft.kinds.filter((k) => k !== LIVE_CHECK_PROOF_KIND)
  const picked = options ? [...others, LIVE_CHECK_PROOF_KIND] : others
  const next: ProofPlanDraft = { ...draft, kinds: PROOF_KINDS.filter((k) => picked.includes(k)) }
  if (options) next.liveCheck = options
  else delete next.liveCheck
  return next
}

/**
 * The plan draft a launch starts a feature from: its plan as proposed, with the
 * offer's recommended live check added when the plan holds none. A feature
 * offered no live check keeps its plan as it is. Pure.
 */
export function launchStartDraft(
  plan: Pick<LaunchProofPlan, 'plan' | 'liveCheckOffer'>,
): ProofPlanDraft {
  const draft: ProofPlanDraft = {
    kinds: [...plan.plan.kinds],
    notes: plan.plan.notes ?? '',
    ...(plan.plan.liveCheck ? { liveCheck: { ...plan.plan.liveCheck } } : {}),
  }
  const offer = plan.liveCheckOffer
  if (!offer || draft.kinds.includes(LIVE_CHECK_PROOF_KIND)) return draft
  return withLiveCheckDraft(draft, liveCheckOfferDraft(offer))
}

/** The hint beside an offer whose test logins sit in a note any agent may read. Pure. */
export function liveCheckSecretHint(offer: Pick<LiveCheckOffer, 'openNote'>): string | undefined {
  return offer.openNote ? LIVE_CHECK_COPY.secretHint : undefined
}

/** The launch card's "Live check" row for one offer, at the draft's choice. Pure. */
export function launchLiveCheckView(
  offer: LiveCheckOffer,
  draft: LiveCheckDraft,
): LaunchLiveCheckView {
  const label =
    LIVE_CHECK_CHOICE_OPTIONS.find((o) => o.value === draft.choice)?.label ?? draft.choice
  const on = draft.choice !== 'off'
  const secretHint = liveCheckSecretHint(offer)
  return {
    choice: draft.choice,
    options: LIVE_CHECK_CHOICE_OPTIONS,
    showsBeforeAndAfter: on,
    beforeAndAfter: on && draft.beforeAndAfter,
    line: on
      ? `${LIVE_CHECK_CHOICE_LINES[draft.choice]} ${draft.beforeAndAfter ? LIVE_CHECK_COPY.beforeAndAfterOn : LIVE_CHECK_COPY.beforeAndAfterOff}`
      : LIVE_CHECK_CHOICE_LINES.off,
    advice: offer.advice,
    ...(offer.recommended ? { recommended: offer.recommended } : {}),
    chip: LIVE_CHECK_COPY.chip(label),
    ...(secretHint ? { secretHint } : {}),
  }
}

function legDraft(
  projectId: string,
  entry: GroupLegLiveCheckOffer,
  picks: GroupLaunchLiveCheckPicks,
): LiveCheckDraft {
  return picks[projectId]?.[entry.featureId] ?? liveCheckOfferDraft(entry.offer)
}

/** A group leg's offered features, each at the person's pick, else its offer's start. Pure. */
export function groupLegLiveCheckRows(
  leg: { projectId: string; liveCheckOffers?: readonly GroupLegLiveCheckOffer[] },
  picks: GroupLaunchLiveCheckPicks,
): GroupLegLiveCheckRow[] {
  return (leg.liveCheckOffers ?? []).map((entry) => ({
    featureId: entry.featureId,
    title: entry.title,
    view: launchLiveCheckView(entry.offer, legDraft(leg.projectId, entry, picks)),
  }))
}

/** The picks after one feature of one leg changed. Pure. */
export function changeGroupLiveCheckPick(
  legs: readonly { projectId: string; liveCheckOffers?: readonly GroupLegLiveCheckOffer[] }[],
  picks: GroupLaunchLiveCheckPicks,
  projectId: string,
  featureId: string,
  change: Partial<LiveCheckDraft>,
): GroupLaunchLiveCheckPicks {
  const entry = legs
    .find((l) => l.projectId === projectId)
    ?.liveCheckOffers?.find((o) => o.featureId === featureId)
  if (!entry) return picks
  const next = changeLiveCheckDraft(legDraft(projectId, entry, picks), change)
  return { ...picks, [projectId]: { ...(picks[projectId] ?? {}), [featureId]: next } }
}

/** What a group launch sends of the live checks switched on; nothing while none is on. Pure. */
export function groupLaunchLiveCheckMetadata(
  legs: readonly { projectId: string; liveCheckOffers?: readonly GroupLegLiveCheckOffer[] }[],
  picks: GroupLaunchLiveCheckPicks,
): GroupLaunchLiveCheckMetadata | undefined {
  const liveChecks: Record<string, Record<string, LiveCheckOptions>> = {}
  for (const leg of legs) {
    for (const entry of leg.liveCheckOffers ?? []) {
      const options = liveCheckOptionsOf(legDraft(leg.projectId, entry, picks))
      if (!options) continue
      liveChecks[leg.projectId] = {
        ...(liveChecks[leg.projectId] ?? {}),
        [entry.featureId]: options,
      }
    }
  }
  return Object.keys(liveChecks).length > 0 ? { liveChecks } : undefined
}

/**
 * A feature's chain with its live check as the card's choice has it: any live
 * check the preview placed taken out, and the picked one put in front of the
 * first report, gate or cleanup step, else last — the place the run gives it. Pure.
 */
export function withLiveCheckChip(
  chain: readonly ProposalChip[],
  draft: LiveCheckDraft,
): ProposalChip[] {
  const rest = chain.filter((c) => !c.liveCheck)
  if (draft.choice === 'off') return rest
  const step = LIVE_CHECK_STEP_CHIPS[draft.choice]
  const chip: ProposalChip = {
    id: step.id,
    name: step.name,
    agent: draft.choice === 'required',
    stepKind: draft.choice === 'required' ? 'agent' : 'gate',
    liveCheck: true,
  }
  const at = rest.findIndex((c) => c.stepKind && LIVE_CHECK_PLACED_BEFORE.includes(c.stepKind))
  return at === -1 ? [...rest, chip] : [...rest.slice(0, at), chip, ...rest.slice(at)]
}
