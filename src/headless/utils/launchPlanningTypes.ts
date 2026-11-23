/** What a launch carries of its Plan first toggle: `planning: false` when it is off, `true` only over an ask that had it off. */
export type LaunchPlanningMetadata = { planning: boolean } | Record<string, never>
