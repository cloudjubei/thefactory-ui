import { processLeftOutTargets, processRunPointsToTry } from 'thefactory-tools/utils'

import { preExistingBreakBase } from './processPreExistingBreakView'
import { SIGNOFF_CARRIED_COPY } from './processSignoffCarriedViewConstants'
import type {
  SignoffCarriedRun,
  SignoffCarriedView,
  SignoffLeftOutRow,
  SignoffPointsGroup,
} from './processSignoffCarriedViewTypes'

function eachOnce(runs: readonly SignoffCarriedRun[]): SignoffCarriedRun[] {
  return [...new Map(runs.filter((r) => r.plan?.steps).map((r) => [r.id, r])).values()]
}

/**
 * What a sign-off carries beside its build, over every run of its tree: the
 * points a person carried past a proving step that could not show them — each
 * with what that step did show — and the targets a person left out of the
 * proof, by their files, else their checks. A run read without its plan
 * carries nothing. `undefined` when there is neither. Pure.
 */
export function signoffCarriedView(
  runs: readonly SignoffCarriedRun[],
): SignoffCarriedView | undefined {
  const tree = eachOnce(runs)
  const groups: SignoffPointsGroup[] = tree.flatMap(processRunPointsToTry).map((item) => ({
    key: `${item.runId}:${item.entryId}`,
    ...(item.shown.length > 0 ? { shown: SIGNOFF_CARRIED_COPY.shown(item.shown) } : {}),
    points: item.points,
  }))
  const rows: SignoffLeftOutRow[] = tree.flatMap(processLeftOutTargets).map((left) => ({
    key: `${left.runId}:${left.entryId}`,
    target: (left.break.files.length > 0 ? left.break.files : left.break.checks).join(', '),
    detail: SIGNOFF_CARRIED_COPY.leftOutDetail(preExistingBreakBase(left.break), left.break.checks),
  }))
  if (groups.length === 0 && rows.length === 0) return undefined
  return {
    ...(groups.length > 0
      ? {
          tryThese: {
            title: SIGNOFF_CARRIED_COPY.tryTitle,
            note: SIGNOFF_CARRIED_COPY.tryNote,
            groups,
          },
        }
      : {}),
    ...(rows.length > 0 ? { leftOut: { title: SIGNOFF_CARRIED_COPY.leftOutTitle, rows } } : {}),
  }
}
