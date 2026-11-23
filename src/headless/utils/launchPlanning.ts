import { LAUNCH_PLANNING_COPY } from './launchPlanningConstants'
import type { LaunchPlanningMetadata } from './launchPlanningTypes'

/** Whether a launch preview says its run plans the story first, so the card offers the toggle. Pure. */
export function launchPlanningOffered(preview: unknown): boolean {
  if (typeof preview !== 'object' || preview === null) return false
  return (preview as { planning?: unknown }).planning === true
}

/** Whether the agent's launch ask turned planning off — `false`, or the string `'false'`; else nothing. Pure. */
export function launchPlanningAsked(args: unknown): false | undefined {
  if (typeof args !== 'object' || args === null) return undefined
  const asked = (args as { planning?: unknown }).planning
  return asked === false || asked === 'false' ? false : undefined
}

/**
 * The toggle as the card shows it: the person's pick, else the agent's ask,
 * else on; nothing while the launch offers none. Pure.
 */
export function launchPlanningChoice(
  offered: boolean,
  picked: boolean | undefined,
  asked?: boolean,
): boolean | undefined {
  return offered ? (picked ?? asked ?? true) : undefined
}

/**
 * What a launch carries of the toggle: `planning: false` when it is off;
 * `planning: true` only to turn back on an ask that had it off; else nothing,
 * since a launch plans first by default. Pure.
 */
export function launchPlanningMetadata(
  choice: boolean | undefined,
  asked?: boolean,
): LaunchPlanningMetadata {
  if (choice === false) return { planning: false }
  return choice === true && asked === false ? { planning: true } : {}
}

/** The one line under the toggle: what the run does. Pure. */
export function launchPlanningLine(on: boolean): string {
  return on ? LAUNCH_PLANNING_COPY.on : LAUNCH_PLANNING_COPY.off
}
