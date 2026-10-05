import type { PendingToolGrant } from './chatTypes'
import { START_GROUP_WORK_TOOL_NAME } from './processGroupLaunchConstants'
import type {
  ProcessGroupLaunchPreview,
  ProcessGroupLegRequest,
  StartGroupWorkGrantSummary,
} from './processGroupLaunchTypes'

/** Whether a grant is the request to launch a group run. */
export function isStartGroupWorkGrant(grant: Pick<PendingToolGrant, 'toolName'>): boolean {
  return grant.toolName === START_GROUP_WORK_TOOL_NAME
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/**
 * The legs, brief and options of a `startGroupWork` ask, read defensively from
 * either transport's shape — a CLI action wraps the arguments (`{ tool, args }`),
 * an API tool call's detail IS them. A malformed leg is left out.
 */
export function startGroupWorkGrantSummary(
  grant: Pick<PendingToolGrant, 'detail'>,
): StartGroupWorkGrantSummary {
  const outer = isRecord(grant.detail) ? grant.detail : {}
  const record = isRecord(outer.args) ? outer.args : outer
  const legs: ProcessGroupLegRequest[] = []
  for (const raw of Array.isArray(record.legs) ? record.legs : []) {
    const projectId = isRecord(raw) ? text(raw.projectId) : undefined
    const storyId = isRecord(raw) ? text(raw.storyId) : undefined
    if (!isRecord(raw) || !projectId || !storyId) continue
    const dependsOn = Array.isArray(raw.dependsOn)
      ? raw.dependsOn.filter((d): d is string => typeof d === 'string' && d.length > 0)
      : []
    const processId = text(raw.processId)
    legs.push({ projectId, storyId, dependsOn, ...(processId ? { processId } : {}) })
  }
  const groupId = text(record.groupId)
  const title = text(record.title)
  const note = text(record.note)
  const runner = record.runner
  const spendCapUsd = record.spendCapUsd
  return {
    ...(groupId ? { groupId } : {}),
    ...(title ? { title } : {}),
    legs,
    ...(note ? { note } : {}),
    proofRequired: record.proofRequired !== false,
    ...(runner === 'cli' || runner === 'api' ? { runner } : {}),
    ...(typeof spendCapUsd === 'number' && spendCapUsd > 0 ? { spendCapUsd } : {}),
  }
}

/** The project titles of what a leg waits for, in the card's words. */
export function processGroupLegWaitsFor(
  preview: Pick<ProcessGroupLaunchPreview, 'legs'>,
  dependsOn: readonly string[],
): string | undefined {
  if (dependsOn.length === 0) return undefined
  const titles = dependsOn.map(
    (id) => preview.legs.find((l) => l.projectId === id)?.projectTitle ?? id,
  )
  return `Starts once ${titles.join(' and ')} ${titles.length === 1 ? 'is' : 'are'} merged`
}
