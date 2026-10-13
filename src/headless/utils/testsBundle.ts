import type { TestsResult } from '../api'
import type { TestsBundle, TestsDetail } from './testsBundleTypes'

/**
 * A project's tests after a read: the last run as read, and the detail as read
 * — or, when only the last run was read, the detail read before. Pure.
 */
export function nextTestsBundle(
  prev: TestsBundle | undefined,
  read: { lastRun: TestsResult | null; detail?: TestsDetail },
): TestsBundle {
  return { lastRun: read.lastRun, detail: read.detail ?? prev?.detail ?? null }
}

/**
 * Whether what was read is enough to show: the last run for a badge, the detail
 * too once the Tests screen is open. Pure.
 */
export function testsBundleShows(bundle: TestsBundle | undefined, detailWanted: boolean): boolean {
  return bundle !== undefined && (!detailWanted || bundle.detail !== null)
}
