import { PROCESS_LAUNCH_OVERLAP_TEXT } from 'thefactory-tools/constants'
import type { ProcessLaunchOverlap } from 'thefactory-tools/types'
import { processLaunchOverlapLines } from 'thefactory-tools/utils'

import type { LaunchOverlapView } from './launchOverlapTypes'

/**
 * What a launch card warns of when other work touches the files its features
 * name: a heading and one line per live run, then the base branch — never a
 * block. `undefined` when nothing overlaps. Pure.
 */
export function launchOverlapView(
  overlap: ProcessLaunchOverlap | undefined,
): LaunchOverlapView | undefined {
  const lines = processLaunchOverlapLines(overlap)
  return lines.length > 0 ? { heading: PROCESS_LAUNCH_OVERLAP_TEXT.heading, lines } : undefined
}
