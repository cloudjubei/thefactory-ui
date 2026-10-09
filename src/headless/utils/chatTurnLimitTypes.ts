/** The turn-limit half of a chat's completion settings. */
export type ChatTurnLimitSettings = {
  limitTurns?: boolean
  maxTurns?: number
}

/** The chat's "Limit turns per run" switch and slider, as the settings surface renders them. */
export interface ChatTurnLimit {
  /** True when a run is held to {@link maxTurns}; absent from the settings means unlimited. */
  limited: boolean
  /** The slider's value — kept while the limit is off, as the value it comes back on at. */
  maxTurns: number
}
