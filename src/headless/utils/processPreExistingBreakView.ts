import type { ProcessParkChoice, ProcessPreExistingBreak } from 'thefactory-tools/types'

import {
  PRE_EXISTING_BREAK_COPY,
  PRE_EXISTING_BREAK_SHA_LENGTH,
} from './processPreExistingBreakViewConstants'
import type { PreExistingBreakView } from './processPreExistingBreakViewTypes'

/** Where a break already fails: its base branch, at the commit it was seen on when one was recorded. Pure. */
export function preExistingBreakBase(
  brk: Pick<ProcessPreExistingBreak, 'baseRef' | 'baseSha'>,
): string {
  return brk.baseSha
    ? `${brk.baseRef}@${brk.baseSha.slice(0, PRE_EXISTING_BREAK_SHA_LENGTH)}`
    : brk.baseRef
}

/**
 * A break already at the base, laid out for its stop card: "Already broken
 * before this change", where it fails the same way, then its files, its checks
 * and its first failing lines. The same for a checks stop and a developer
 * that found it. Pure.
 */
export function preExistingBreakView(brk: ProcessPreExistingBreak): PreExistingBreakView {
  const failing = brk.headline.trim()
  return {
    headline: PRE_EXISTING_BREAK_COPY.headline,
    base: PRE_EXISTING_BREAK_COPY.base(preExistingBreakBase(brk)),
    files:
      brk.files.length > 0
        ? { title: PRE_EXISTING_BREAK_COPY.files, items: [...brk.files] }
        : undefined,
    checks: { title: PRE_EXISTING_BREAK_COPY.checks, items: [...brk.checks] },
    failing: failing ? { title: PRE_EXISTING_BREAK_COPY.failing, text: failing } : undefined,
  }
}

/** The break a stop's answers are about, off the first that carries it. Pure. */
export function preExistingBreakOfChoices(
  choices: readonly Pick<ProcessParkChoice, 'preExistingBreak'>[],
): ProcessPreExistingBreak | undefined {
  return choices.find((c) => c.preExistingBreak)?.preExistingBreak
}
