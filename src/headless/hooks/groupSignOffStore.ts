import type { ProcessDecisionClient } from 'thefactory-tools/types'
import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import {
  decideGroupSignOff,
  readGroupSignOff,
  readSignOffAttachment,
  readSignOffOutput,
  retryGroupSignOff,
  saveSignOffOutput,
} from '../api/groupSignOffApi'
import { settleSignOffDrafts, signOffOutputProblem, signOffSectionKey } from '../utils/groupSignOff'
import { GROUP_SIGN_OFF_TEXT, SIGN_OFF_OUTPUT_TEXT } from '../utils/groupSignOffConstants'
import type {
  GroupSignOffAttachment,
  GroupSignOffData,
  GroupSignOffDecision,
  GroupSignOffState,
  SignOffOutputDocument,
  SignOffOutputDraft,
} from '../utils/groupSignOffTypes'

const EMPTY: GroupSignOffState = {
  data: undefined,
  readError: null,
  acting: undefined,
  actionError: null,
  documents: {},
  documentErrors: {},
  drafts: {},
  saving: [],
  fetches: {},
}

const without = <T>(map: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  const { [key]: _gone, ...rest } = map
  return rest
}

const sectionsOf = (data: GroupSignOffData | undefined) =>
  (data?.outputs ?? []).flatMap((output) =>
    output.sections.map((section) => ({
      key: signOffSectionKey(output.label, section.projectId),
      evidenceId: section.evidenceId,
    })),
  )

const withVersion = (
  data: GroupSignOffData,
  key: string,
  evidenceId: string,
): GroupSignOffData => ({
  ...data,
  outputs: data.outputs.map((output) => ({
    ...output,
    sections: output.sections.map((section) =>
      signOffSectionKey(output.label, section.projectId) === key
        ? { ...section, evidenceId }
        : section,
    ),
  })),
})

/**
 * One group run's sign-off, read whole on every update: a fill or an edit changes
 * a document's version, so what is on screen follows the view, and an edit in
 * progress is the one thing no read may take away.
 */
export class GroupSignOffStore {
  private _state: GroupSignOffState = EMPTY
  private _reading: Promise<void> | undefined
  private _readAgain = false
  /** Moves on with every answer that carries the view: a read begun before it is out of date. */
  private _version = 0
  /** Versions a read found gone, so a view still naming one is not asked again and again. */
  private readonly _gone = new Set<string>()
  private readonly _listeners = new Set<() => void>()
  private readonly _groupRunId: string
  private readonly _client: () => ProcessDecisionClient

  constructor(groupRunId: string, client: () => ProcessDecisionClient) {
    this._groupRunId = groupRunId
    this._client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): GroupSignOffState => this._state

  private _set(patch: Partial<GroupSignOffState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  private _take(data: GroupSignOffData): void {
    this._set({
      data,
      readError: null,
      drafts: settleSignOffDrafts(this._state.drafts, data, this._state.documents),
    })
  }

  /** Read the view. Updates that come during a read fold into one more read after it. */
  refresh = (): Promise<void> => {
    if (this._reading) {
      this._readAgain = true
      return this._reading
    }
    this._reading = this._read().finally(() => {
      this._reading = undefined
    })
    return this._reading
  }

  private async _read(): Promise<void> {
    do {
      this._readAgain = false
      const version = this._version
      try {
        const data = await readGroupSignOff(this._groupRunId)
        if (version === this._version) this._take(data)
        else this._readAgain = true
      } catch (err) {
        if (version === this._version) {
          this._set({ readError: extractErrorMessage(err, GROUP_SIGN_OFF_TEXT.readFailed) })
        }
      }
      if (await this._readDocuments()) this._readAgain = true
    } while (this._readAgain)
  }

  /** Read every document not held yet. Whether one was found superseded, so the view is out of date. */
  private async _readDocuments(): Promise<boolean> {
    const missing = sectionsOf(this._state.data).flatMap(({ key, evidenceId }) =>
      evidenceId && !this._state.documents[evidenceId] ? [{ key, evidenceId }] : [],
    )
    const stale = await Promise.all(
      missing.map(({ key, evidenceId }) => this._readDocument(key, evidenceId)),
    )
    return stale.includes(true)
  }

  private async _readDocument(key: string, evidenceId: string): Promise<boolean> {
    try {
      const filed = await readSignOffOutput(this._groupRunId, evidenceId)
      this._set({
        documents: { ...this._state.documents, [evidenceId]: filed },
        documentErrors: without(this._state.documentErrors, key),
      })
      return false
    } catch (err) {
      if (errorStatus(err) === 404 && !this._gone.has(evidenceId)) {
        this._gone.add(evidenceId)
        return true
      }
      this._set({
        documentErrors: {
          ...this._state.documentErrors,
          [key]: extractErrorMessage(err, SIGN_OFF_OUTPUT_TEXT.readFailed),
        },
      })
      return false
    }
  }

  private _setDraft(key: string, draft: SignOffOutputDraft): void {
    this._set({ drafts: { ...this._state.drafts, [key]: draft } })
  }

  startEdit = (key: string): void => {
    if (this._state.drafts[key]) return
    const evidenceId = sectionsOf(this._state.data).find((s) => s.key === key)?.evidenceId
    const filed = evidenceId ? this._state.documents[evidenceId] : undefined
    if (!filed) return
    this._setDraft(key, { text: filed.text, baseEvidenceId: filed.evidenceId })
  }

  changeDraft = (key: string, text: string): void => {
    const draft = this._state.drafts[key]
    if (!draft) return
    const { error: _cleared, ...kept } = draft
    this._setDraft(key, { ...kept, text })
  }

  cancelEdit = (key: string): void => {
    this._set({ drafts: without(this._state.drafts, key) })
  }

  saveDraft = async (key: string): Promise<boolean> => {
    const draft = this._state.drafts[key]
    if (!draft || this._state.saving.includes(key)) return false
    if (signOffOutputProblem(draft.text) !== undefined) return false
    this._set({ saving: [...this._state.saving, key] })
    this._version += 1
    try {
      const filed = await saveSignOffOutput(this._groupRunId, draft.baseEvidenceId, draft.text)
      this._saved(key, filed)
      return true
    } catch (err) {
      await this._saveFailed(key, draft, err)
      return false
    } finally {
      this._set({ saving: this._state.saving.filter((k) => k !== key) })
    }
  }

  private _saved(key: string, filed: SignOffOutputDocument): void {
    const { data, documents, drafts } = this._state
    this._set({
      ...(data ? { data: withVersion(data, key, filed.evidenceId) } : {}),
      documents: { ...documents, [filed.evidenceId]: filed },
      drafts: without(drafts, key),
    })
  }

  private async _saveFailed(key: string, draft: SignOffOutputDraft, err: unknown): Promise<void> {
    const status = errorStatus(err)
    if (status === 404 || status === 409) {
      this._setDraft(key, { ...draft, notice: status === 404 ? 'changed' : 'closed' })
      await this.refresh()
      return
    }
    this._setDraft(key, {
      ...draft,
      error: extractErrorMessage(err, SIGN_OFF_OUTPUT_TEXT.saveFailed),
    })
  }

  /** Put the person's edit over the version that moved on under it. */
  keepEdit = async (key: string): Promise<boolean> => {
    const draft = this._state.drafts[key]
    const evidenceId = sectionsOf(this._state.data).find((s) => s.key === key)?.evidenceId
    if (!draft || !evidenceId) return false
    const { notice: _answered, ...kept } = draft
    this._setDraft(key, { ...kept, baseEvidenceId: evidenceId })
    return this.saveDraft(key)
  }

  private async _act(
    acting: NonNullable<GroupSignOffState['acting']>,
    send: () => Promise<GroupSignOffData>,
    failed: string,
  ): Promise<boolean> {
    if (this._state.acting) return false
    this._set({ acting, actionError: null })
    this._version += 1
    try {
      this._take(await send())
      return true
    } catch (err) {
      this._set({ actionError: extractErrorMessage(err, failed) })
      await this.refresh()
      return false
    } finally {
      this._set({ acting: undefined })
    }
  }

  decide = (decision: GroupSignOffDecision): Promise<boolean> =>
    this._act(
      decision.choice,
      () => decideGroupSignOff(this._groupRunId, { ...decision, decidedVia: this._client() }),
      GROUP_SIGN_OFF_TEXT.decideFailed,
    )

  retry = (): Promise<boolean> =>
    this._act('retry', () => retryGroupSignOff(this._groupRunId), GROUP_SIGN_OFF_TEXT.retryFailed)

  /** An attachment's bytes, for a client to save. */
  readAttachment = async (attachment: GroupSignOffAttachment): Promise<ArrayBuffer | undefined> => {
    const { evidenceId, downloadPath } = attachment
    if (!downloadPath) return undefined
    this._set({ fetches: { ...this._state.fetches, [evidenceId]: { busy: true } } })
    try {
      const bytes = await readSignOffAttachment(downloadPath)
      this._set({ fetches: without(this._state.fetches, evidenceId) })
      return bytes
    } catch (err) {
      const error = extractErrorMessage(err, GROUP_SIGN_OFF_TEXT.downloadFailed)
      this._set({ fetches: { ...this._state.fetches, [evidenceId]: { busy: false, error } } })
      return undefined
    }
  }
}
