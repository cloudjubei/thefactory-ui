import type { GetActivityResponse } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'

export type TrainerSuggestionState = {
  launching: boolean
  activityId?: string
  activity?: GetActivityResponse
  queued?: boolean
  error?: string
}

/** Shared by all rows showing the same suggestion, including after a chat remount. */
export class TrainerSuggestionStore {
  private state: TrainerSuggestionState = { launching: false }
  private listeners = new Set<() => void>()
  private reading = 0

  private launchRequest: () => Promise<{ activityId: string; queued: boolean }>
  private readRequest: (activityId: string) => Promise<GetActivityResponse>

  constructor(
    launchRequest: () => Promise<{ activityId: string; queued: boolean }>,
    readRequest: (activityId: string) => Promise<GetActivityResponse>,
  ) {
    this.launchRequest = launchRequest
    this.readRequest = readRequest
  }

  snapshot = () => this.state
  listen = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private set(state: TrainerSuggestionState) {
    this.state = state
    for (const listener of this.listeners) listener()
  }
  launch = async () => {
    if (this.state.launching || this.state.activityId) return
    this.set({ launching: true })
    try {
      const handle = await this.launchRequest()
      this.set({ launching: false, ...handle })
      await this.refresh()
    } catch (error) {
      this.set({
        ...this.state,
        launching: false,
        error: extractErrorMessage(error, 'Could not launch training.'),
      })
    }
  }
  refresh = async () => {
    const id = this.state.activityId
    if (!id) return
    const version = ++this.reading
    try {
      const activity = await this.readRequest(id)
      if (version === this.reading) this.set({ ...this.state, activity, error: undefined })
    } catch (error) {
      if (version === this.reading)
        this.set({
          ...this.state,
          error: extractErrorMessage(error, 'Could not read activity status.'),
        })
    }
  }
}

export function trainerActivityLabel(state: TrainerSuggestionState): string | undefined {
  if (state.launching) return 'Launching…'
  if (!state.activityId) return undefined
  const activity = state.activity
  if (!activity) return state.queued ? 'Queued' : 'Starting…'
  if (activity.status === 'running' && activity.isLive === false) return 'Paused — not progressing'
  const labels: Record<string, string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    aborted: 'Stopped',
  }
  return labels[activity.status] ?? activity.status
}

export type TrainerSuggestionLaunchProps = {
  suggestionId: string
  projectId?: string
  project?: string
}
