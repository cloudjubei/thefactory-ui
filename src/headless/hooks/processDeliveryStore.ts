import type { ProcessDecisionClient } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import {
  publishProcessGroup,
  readProcessDelivery,
  saveProcessPublishEdits,
} from '../api/processDeliveryApi'
import {
  mergeProcessPublishEdits,
  processLegPublishBody,
  processPublishBody,
  processPublishEditsChanged,
} from '../utils/processDelivery'
import { PROCESS_PUBLISH_COPY } from '../utils/processDeliveryConstants'
import type {
  ProcessDeliveryData,
  ProcessDeliveryState,
  ProcessDeliveryTarget,
  ProcessLegPublish,
  ProcessPublishEdit,
} from '../utils/processDeliveryTypes'

const EMPTY: ProcessDeliveryState = {
  data: undefined,
  readError: null,
  edits: {},
  publishing: false,
  actionError: null,
  legs: {},
}

/**
 * One run's or group run's delivery: the repos to publish with the person's
 * edits, what was published, and how each merge goes. Publish — the whole
 * group's or one leg's — shows at once and rolls back on a refusal; pressing
 * it again while it goes is the same press.
 */
export class ProcessDeliveryStore {
  private _state: ProcessDeliveryState = EMPTY
  private _publish: Promise<boolean> | undefined
  private readonly _legPublishes = new Map<string, Promise<boolean>>()
  private _reading: Promise<void> | undefined
  private readonly _listeners = new Set<() => void>()
  private readonly _target: ProcessDeliveryTarget
  private readonly _client: () => ProcessDecisionClient

  constructor(target: ProcessDeliveryTarget, client: () => ProcessDecisionClient) {
    this._target = target
    this._client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): ProcessDeliveryState => this._state

  private _set(patch: Partial<ProcessDeliveryState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  private _take(data: ProcessDeliveryData): void {
    this._set({
      data,
      readError: null,
      edits: mergeProcessPublishEdits(this._state.data, this._state.edits, data),
    })
  }

  refresh = (): Promise<void> => {
    const sent = Object.keys(this._state.legs).filter(
      (id) => this._state.legs[id]!.phase === 'sent',
    )
    this._reading ??= readProcessDelivery(this._target)
      .then(
        (data) => {
          this._take(data)
          this._dropLegs(sent)
        },
        (err: unknown) =>
          this._set({ readError: extractErrorMessage(err, PROCESS_PUBLISH_COPY.readFailed) }),
      )
      .finally(() => {
        this._reading = undefined
      })
    return this._reading
  }

  setEdit = (projectId: string, field: keyof ProcessPublishEdit, value: string): void => {
    const repo = this._state.data?.repos.find((r) => r.projectId === projectId)
    if (!repo) return
    const was = this._state.edits[projectId] ?? { short: repo.short, prTitle: repo.prTitle }
    this._set({ edits: { ...this._state.edits, [projectId]: { ...was, [field]: value } } })
  }

  /**
   * Publish with the card's edits: a run keeps them, then `answer` answers its
   * gate; a group run publishes every leg in one call. Resolves `false` when
   * refused, with why in `actionError`.
   */
  publish = (answer?: () => Promise<boolean>): Promise<boolean> => {
    this._publish ??= this._publishNow(answer).finally(() => {
      this._publish = undefined
    })
    return this._publish
  }

  /**
   * Publish one leg of a group run on its own, with its card's edits, whatever
   * the other legs are doing. Each leg is its own press. Resolves `false` when
   * refused, with why on the leg.
   */
  publishLeg = (projectId: string): Promise<boolean> => {
    let going = this._legPublishes.get(projectId)
    if (!going) {
      going = this._publishLegNow(projectId).finally(() => this._legPublishes.delete(projectId))
      this._legPublishes.set(projectId, going)
    }
    return going
  }

  private async _publishLegNow(projectId: string): Promise<boolean> {
    const data = this._state.data
    if (this._target.kind !== 'group' || !data) return false
    const body = processLegPublishBody(data, this._state.edits, projectId)
    if (!body) return false
    this._setLeg(projectId, { phase: 'publishing' })
    try {
      this._take(
        await publishProcessGroup(this._target.groupRunId, { ...body, decidedVia: this._client() }),
      )
      this._setLeg(projectId, { phase: 'sent' })
      return true
    } catch (err) {
      this._setLeg(projectId, {
        phase: 'refused',
        error: extractErrorMessage(err, PROCESS_PUBLISH_COPY.publishFailed),
      })
      return false
    }
  }

  private _setLeg(projectId: string, leg: ProcessLegPublish): void {
    this._set({ legs: { ...this._state.legs, [projectId]: leg } })
  }

  private _dropLegs(projectIds: readonly string[]): void {
    const drop = projectIds.filter((id) => this._state.legs[id]?.phase === 'sent')
    this._set({
      legs: Object.fromEntries(
        Object.entries(this._state.legs).filter(([id]) => !drop.includes(id)),
      ),
    })
  }

  private async _publishNow(answer: (() => Promise<boolean>) | undefined): Promise<boolean> {
    const data = this._state.data
    if (!data) return false
    this._set({ publishing: true, actionError: null })
    try {
      const body = processPublishBody(data, this._state.edits)
      if (this._target.kind === 'group') {
        this._take(
          await publishProcessGroup(this._target.groupRunId, {
            ...body,
            decidedVia: this._client(),
          }),
        )
        return true
      }
      if (processPublishEditsChanged(data, this._state.edits)) {
        this._take(await saveProcessPublishEdits(this._target, body))
      }
      return answer ? await answer() : true
    } catch (err) {
      this._set({ actionError: extractErrorMessage(err, PROCESS_PUBLISH_COPY.publishFailed) })
      return false
    } finally {
      this._set({ publishing: false })
    }
  }
}
