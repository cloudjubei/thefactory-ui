/**
 * A project's known flaky tests — those its checks saw fail in a full run and
 * pass when their file ran again on its own — read for its checks view and for
 * a check's row. Pure: no React, no I/O.
 */

import type { ProjectCheckKnownFlake, VerificationCheckResult } from '../api/generated'
import {
  checkFlakyChipDetail,
  checkFlakyChipLabel,
  projectFlakeFixFiled,
  projectFlakeSeen,
} from './projectFlakesConstants'
import type { CheckFlakyChip, ProjectFlakeRow } from './projectFlakesTypes'
import { timeAgo } from './time'

/** The known flaky tests, most recently seen first. */
export function projectFlakeRows(
  flakes: readonly ProjectCheckKnownFlake[] | undefined,
  now: number,
): ProjectFlakeRow[] {
  return [...(flakes ?? [])]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((flake) => ({
      key: flake.key,
      test: flake.name ?? flake.suite,
      file: flake.module ? `${flake.module}:${flake.suite}` : flake.suite,
      seen: projectFlakeSeen(flake.runs.length),
      lastSeen: timeAgo(now, flake.lastSeenAt),
      ...(flake.feature ? { fix: projectFlakeFixFiled(flake.feature.title) } : {}),
    }))
}

/** The chip a check's row shows for its tests that failed in the full run and passed alone; none without. */
export function checkFlakyChip(
  check: Pick<VerificationCheckResult, 'flakyTests'>,
): CheckFlakyChip | undefined {
  const tests = check.flakyTests ?? []
  if (tests.length === 0) return undefined
  return {
    label: checkFlakyChipLabel(tests.length),
    detail: checkFlakyChipDetail(tests.map((t) => t.name ?? t.suite)),
  }
}
