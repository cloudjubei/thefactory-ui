import { PROCESS_USUAL_BASE_BRANCHES } from 'thefactory-tools/constants'
import type { ProcessBaseBranchOptions } from 'thefactory-tools/types'

import type { ProcessGroupLaunchLeg } from './processGroupLaunchTypes'
import type {
  BaseBranchChoiceView,
  BaseBranchMetadata,
  GroupBaseBranchMetadata,
} from './processBaseBranchTypes'

/**
 * The branch a launch works off as the card shows it: the person's pick, else
 * the branch the agent asked for, else the preselected one — each only when the
 * project has it.
 */
export function baseBranchChoice(
  options: ProcessBaseBranchOptions | undefined,
  asked: string | undefined,
  picked: string | undefined,
): string | undefined {
  if (!options) return undefined
  if (picked && options.branches.includes(picked)) return picked
  if (asked && options.branches.includes(asked)) return asked
  return options.preselected
}

/** The card's rows: the usual bases and the current branch first, the rest after. */
export function baseBranchChoiceView(
  options: ProcessBaseBranchOptions | undefined,
  asked: string | undefined,
  picked: string | undefined,
): BaseBranchChoiceView {
  const chosen = baseBranchChoice(options, asked, picked)
  const branches = options?.branches ?? []
  const row = (name: string) => ({ name, current: name === options?.current })
  const isUsual = (name: string) =>
    PROCESS_USUAL_BASE_BRANCHES.includes(name) || name === options?.current
  return {
    ...(chosen ? { picked: chosen } : {}),
    usual: branches.filter(isUsual).map(row),
    others: branches.filter((b) => !isUsual(b)).map(row),
    ...(options && asked && !branches.includes(asked) ? { askedMissing: asked } : {}),
  }
}

/** The approval's metadata for the chosen branch, or `undefined` when there is none. */
export function baseBranchMetadata(chosen: string | undefined): BaseBranchMetadata | undefined {
  return chosen ? { baseBranch: chosen } : undefined
}

/**
 * A group approval's branch per project — every leg whose project offers
 * branches, as its card shows it — or `undefined` when no leg has one.
 */
export function groupBaseBranchMetadata(
  legs: readonly Pick<ProcessGroupLaunchLeg, 'projectId' | 'baseBranches' | 'baseBranch'>[],
  picks: Readonly<Record<string, string>>,
): GroupBaseBranchMetadata | undefined {
  const chosen = legs.flatMap((leg) => {
    const branch = baseBranchChoice(leg.baseBranches, leg.baseBranch, picks[leg.projectId])
    return branch ? [[leg.projectId, branch] as const] : []
  })
  return chosen.length > 0 ? { legBaseBranches: Object.fromEntries(chosen) } : undefined
}
