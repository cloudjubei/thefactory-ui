import type { LaunchProofPlan, ProofPlan } from 'thefactory-tools/types'

/** How a feature's live check on a test account is done, with the kind it rides on. */
export type LiveCheckOptions = NonNullable<ProofPlan['liveCheck']>

/** `required`: an agent checks it. `ask-me`: the person watches it on a device set up for them. */
export type LiveCheckMode = LiveCheckOptions['mode']

/** What the launch preview offers for one feature: the advice, the mode advised, an open logins note. */
export type LiveCheckOffer = NonNullable<LaunchProofPlan['liveCheckOffer']>

/** The launch row's three choices. */
export type LiveCheckChoice = 'off' | LiveCheckMode

/** One feature's live check as the launch card holds it before it is sent. */
export interface LiveCheckDraft {
  choice: LiveCheckChoice
  /** Walk the base build first; only meaningful while a mode is on. */
  beforeAndAfter: boolean
}

/** One choice on the row's switch. */
export interface LiveCheckChoiceOption {
  value: LiveCheckChoice
  label: string
}

/** The launch card's "Live check" row for one feature. */
export interface LaunchLiveCheckView {
  choice: LiveCheckChoice
  options: readonly LiveCheckChoiceOption[]
  /** The "Before and after" toggle shows only while a mode is on. */
  showsBeforeAndAfter: boolean
  beforeAndAfter: boolean
  /** What the picked choice does, in one short line. */
  line: string
  /** The agent's advice for this project and change. */
  advice: string
  recommended?: LiveCheckMode
  /** The collapsed row's chip: "Live check: Ask me". */
  chip: string
  /** The test logins sit in a note any agent may read: make it a secret. */
  secretHint?: string
  /** The test logins sit in a note that asks first: picking a check clears it for the run. */
  clearsLogins?: string
}

/** A feature of a group launch's leg that offers a live check. */
export interface GroupLegLiveCheckOffer {
  featureId: string
  title: string
  offer: LiveCheckOffer
}

/** A group launch's live-check picks, by project id then feature id. */
export type GroupLaunchLiveCheckPicks = Readonly<
  Record<string, Readonly<Record<string, LiveCheckDraft>>>
>

/** One offered feature of a group leg, as its row shows it. */
export interface GroupLegLiveCheckRow {
  featureId: string
  title: string
  view: LaunchLiveCheckView
}

/** What a group launch sends of the live checks switched on: by project id, then feature id. */
export interface GroupLaunchLiveCheckMetadata {
  liveChecks: Record<string, Record<string, LiveCheckOptions>>
}
