import type {
  ChangeScreensDecision,
  ProcessLedgerEntry,
  UiImpactStance,
} from 'thefactory-tools/types'

import {
  REVIEW_UI_IMPACT_DISAGREES,
  REVIEW_UI_IMPACT_JUDGED,
  SCREENS_DECISION_LABELS,
  UI_IMPACT_HIDDEN_LABEL,
  UI_IMPACT_JUDGE_WORDS,
  UI_IMPACT_SHOWS_LABEL,
} from './uiImpactViewConstants'
import type { ScreensDecisionNote, UiImpactNote } from './uiImpactViewTypes'

/**
 * What an attempt's agent judged of whether its change alters what users see
 * — "Shows on screen" or "Nothing on screen", who judged it and why — or
 * `undefined` when it judged nothing. Pure.
 */
export function attemptUiImpactNote(
  entry: Pick<ProcessLedgerEntry, 'uiImpact'>,
): UiImpactNote | undefined {
  const judged = entry.uiImpact
  if (!judged) return undefined
  return {
    tone: judged.visible ? 'shows' : 'hidden',
    label: judged.visible ? UI_IMPACT_SHOWS_LABEL : UI_IMPACT_HIDDEN_LABEL,
    by: UI_IMPACT_JUDGE_WORDS[judged.by],
    reason: judged.reason,
  }
}

/**
 * What a code review filed of whether the change alters what users see, led
 * by "Code review disagrees" when the newest judgement before it in `ledger`
 * said the other way — or `undefined` when it filed no view. Pure.
 */
export function reviewUiImpactNote(
  entry: Pick<ProcessLedgerEntry, 'id' | 'review'>,
  ledger: readonly Pick<ProcessLedgerEntry, 'id' | 'uiImpact'>[],
): UiImpactNote | undefined {
  const view = entry.review?.uiImpact
  if (!view) return undefined
  const at = ledger.findIndex((e) => e.id === entry.id)
  const before = (at < 0 ? [] : ledger.slice(0, at)).filter((e) => e.uiImpact).at(-1)?.uiImpact
  const lead =
    before && before.visible !== view.visible ? REVIEW_UI_IMPACT_DISAGREES : REVIEW_UI_IMPACT_JUDGED
  const way = view.visible ? UI_IMPACT_SHOWS_LABEL : UI_IMPACT_HIDDEN_LABEL
  return {
    tone: view.visible ? 'shows' : 'hidden',
    label: `${lead}: ${way.toLowerCase()}`,
    reason: view.reason,
  }
}

/**
 * Whether the story's change must be shown on screen, as its sign-off says it:
 * the need, what decided it and why, and every file users see a not-visible
 * judgement left unshown — or `undefined` when nothing decided it. Pure.
 */
export function screensDecisionNote(
  decision: ChangeScreensDecision | undefined,
): ScreensDecisionNote | undefined {
  if (!decision) return undefined
  return {
    tone:
      decision.need === 'required'
        ? 'needed'
        : decision.need === 'not-required'
          ? 'not-needed'
          : 'unknown',
    label: SCREENS_DECISION_LABELS[decision.need],
    reason: decision.reason,
    disputedUiPaths: [...(decision.disputedUiPaths ?? [])],
  }
}

/**
 * How the story's change was judged, as a decision made by a judgement or a
 * code review says it — what the proof a request for changes starts out
 * requiring follows — or `undefined` when its plan, files or work decided it.
 * Pure.
 */
export function screensDecisionUiImpact(
  decision: ChangeScreensDecision | undefined,
): UiImpactStance | undefined {
  if (!decision || (decision.basis !== 'judgement' && decision.basis !== 'review')) {
    return undefined
  }
  return { visible: decision.need === 'required', reason: decision.reason }
}
