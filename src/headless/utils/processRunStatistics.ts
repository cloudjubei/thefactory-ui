import type { ProcessRunStatistics } from 'thefactory-tools/types'

import { PROCESS_STATISTICS_COPY } from './processRunStatisticsConstants'
import type { ProcessStatisticsRow } from './processRunStatisticsTypes'

function rowOf(stats: ProcessRunStatistics): ProcessStatisticsRow {
  const { medianCostUsd, costSampleCount } = stats
  return {
    version: PROCESS_STATISTICS_COPY.version(stats.definitionVersion),
    runs: PROCESS_STATISTICS_COPY.runs(stats.runCount),
    firstPass: PROCESS_STATISTICS_COPY.firstPass(Math.round(stats.firstPassRate * 100)),
    iterations: PROCESS_STATISTICS_COPY.iterations(stats.medianIterations),
    ...(medianCostUsd !== undefined && costSampleCount > 0
      ? { cost: PROCESS_STATISTICS_COPY.cost(medianCostUsd.toFixed(2)) }
      : {}),
  }
}

const ofProcess = (
  all: readonly ProcessRunStatistics[],
  definitionId: string,
): ProcessRunStatistics[] =>
  all
    .filter((s) => s.definitionId === definitionId && s.runCount > 0)
    .sort((a, b) => b.definitionVersion - a.definitionVersion)

/** A process's versions that have ended runs, newest first. Pure. */
export function processStatisticsRows(
  all: readonly ProcessRunStatistics[],
  definitionId: string,
): ProcessStatisticsRow[] {
  return ofProcess(all, definitionId).map(rowOf)
}

/** A process's measures on one line: the version asked for, else its newest. Nothing before it has run. Pure. */
export function processStatisticsLine(
  all: readonly ProcessRunStatistics[],
  definitionId: string,
  version?: number,
): string | undefined {
  const versions = ofProcess(all, definitionId)
  const stats =
    version === undefined ? versions[0] : versions.find((s) => s.definitionVersion === version)
  if (!stats) return undefined
  const { runs, firstPass, iterations, cost } = rowOf(stats)
  return [runs, firstPass, iterations, ...(cost ? [cost] : [])].join(' · ')
}
