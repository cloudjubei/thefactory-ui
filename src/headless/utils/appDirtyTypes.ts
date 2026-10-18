/** What an embedded app posts as `overseer:app.dirty`, fire-and-forget, whenever its unsaved state changes. */
export interface AppDirtyPayload {
  dirty: boolean
  /** Shown in the host's leave confirmation; the host's default when absent. */
  message?: string
}
