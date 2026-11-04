import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signOffSectionKey } from '../utils/groupSignOff'
import type { GroupSignOffData, SignOffOutputDocument } from '../utils/groupSignOffTypes'

const api = vi.hoisted(() => ({
  readGroupSignOff: vi.fn(),
  decideGroupSignOff: vi.fn(),
  retryGroupSignOff: vi.fn(),
  readSignOffOutput: vi.fn(),
  saveSignOffOutput: vi.fn(),
  readSignOffAttachment: vi.fn(),
}))

vi.mock('../api/groupSignOffApi', () => api)

import { GroupSignOffStore } from './groupSignOffStore'

const KEY = signOffSectionKey('PR Text', 'be')

const view = (evidenceId: string | undefined, over: Partial<GroupSignOffData> = {}) =>
  ({
    groupRunId: 'g1',
    title: 'Work',
    status: 'parked',
    canDecide: true,
    canRetry: false,
    canEditOutputs: true,
    tickets: [],
    repos: [],
    outputs: [
      {
        label: 'PR Text',
        perRepo: true,
        sections: [{ projectId: 'be', ...(evidenceId ? { evidenceId } : {}) }],
      },
    ],
    goingLive: { steps: [], words: '' },
    walkthrough: [],
    attachments: [],
    ...over,
  }) as GroupSignOffData

const doc = (evidenceId: string, text = `text of ${evidenceId}`): SignOffOutputDocument => ({
  evidenceId,
  projectId: 'be',
  label: 'PR Text',
  text,
  editable: true,
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const refused = (status: number, error: string) => ({
  isAxiosError: true,
  response: { status, data: { error } },
})

const store = () => new GroupSignOffStore('g1', () => 'web')

const opened = async (evidenceId = 'a') => {
  api.readGroupSignOff.mockResolvedValueOnce(view(evidenceId))
  const s = store()
  await s.refresh()
  return s
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  api.readSignOffOutput.mockImplementation(async (_g: string, id: string) => doc(id))
})

describe('reading the sign-off', () => {
  it('reads the view, then every written document', async () => {
    const s = await opened()
    expect(s.getState().data?.title).toBe('Work')
    expect(s.getState().documents.a?.text).toBe('text of a')
  })

  it('reads a document once across reads of the view', async () => {
    const s = await opened()
    api.readGroupSignOff.mockResolvedValueOnce(view('a'))
    await s.refresh()
    expect(api.readSignOffOutput).toHaveBeenCalledTimes(1)
  })

  it('reads nothing for a section not written', async () => {
    api.readGroupSignOff.mockResolvedValueOnce(view(undefined))
    await store().refresh()
    expect(api.readSignOffOutput).not.toHaveBeenCalled()
  })

  it('folds events during a read into one more read', async () => {
    const first = deferred<GroupSignOffData>()
    api.readGroupSignOff.mockReturnValueOnce(first.promise).mockResolvedValue(view('b'))
    const s = store()
    const reading = s.refresh()
    void s.refresh()
    void s.refresh()
    first.resolve(view('a'))
    await reading
    expect(api.readGroupSignOff).toHaveBeenCalledTimes(2)
    expect(s.getState().data?.outputs[0]?.sections[0]?.evidenceId).toBe('b')
  })

  it('says why it could not be read, and keeps what it showed', async () => {
    const s = await opened()
    api.readGroupSignOff.mockRejectedValueOnce(refused(500, 'Disk full.'))
    await s.refresh()
    expect(s.getState().readError).toBe('Disk full.')
    expect(s.getState().data).toBeDefined()
    api.readGroupSignOff.mockResolvedValueOnce(view('a'))
    await s.refresh()
    expect(s.getState().readError).toBeNull()
  })

  it('reads the view again when a document was superseded, then the new one', async () => {
    api.readGroupSignOff.mockResolvedValueOnce(view('old')).mockResolvedValueOnce(view('new'))
    api.readSignOffOutput.mockImplementation(async (_g: string, id: string) => {
      if (id === 'old') throw refused(404, 'Superseded.')
      return doc(id)
    })
    const s = store()
    await s.refresh()
    expect(s.getState().documents.new?.text).toBe('text of new')
    expect(s.getState().documentErrors).toEqual({})
  })

  it('stops asking when the view keeps naming a version that is gone', async () => {
    api.readGroupSignOff.mockResolvedValue(view('old'))
    api.readSignOffOutput.mockRejectedValue(refused(404, 'Superseded.'))
    const s = store()
    await s.refresh()
    expect(api.readGroupSignOff).toHaveBeenCalledTimes(2)
    expect(s.getState().documentErrors[KEY]).toBe('Superseded.')
  })

  it('says a document could not be read, and clears that once it can', async () => {
    api.readGroupSignOff.mockResolvedValue(view('a'))
    api.readSignOffOutput.mockRejectedValueOnce(refused(500, 'Nope.'))
    const s = store()
    await s.refresh()
    expect(s.getState().documentErrors[KEY]).toBe('Nope.')
    await s.refresh()
    expect(s.getState().documentErrors).toEqual({})
    expect(s.getState().documents.a).toBeDefined()
  })
})

describe('an edit', () => {
  it('starts from the document as it stands, and changes as typed', async () => {
    const s = await opened()
    s.startEdit(KEY)
    expect(s.getState().drafts[KEY]).toEqual({ text: 'text of a', baseEvidenceId: 'a' })
    s.changeDraft(KEY, 'mine')
    expect(s.getState().drafts[KEY]?.text).toBe('mine')
  })

  it('does not start on a section with no document, nor restart over one going', async () => {
    api.readGroupSignOff.mockResolvedValueOnce(view(undefined))
    const empty = store()
    await empty.refresh()
    empty.startEdit(KEY)
    expect(empty.getState().drafts).toEqual({})
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    s.startEdit(KEY)
    expect(s.getState().drafts[KEY]?.text).toBe('mine')
  })

  it('goes on cancel', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.cancelEdit(KEY)
    expect(s.getState().drafts).toEqual({})
  })

  it('saves on the version it started from, and takes the new version the answer gives', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockResolvedValueOnce(doc('b', 'mine'))
    api.readGroupSignOff.mockResolvedValueOnce(view('b'))
    expect(await s.saveDraft(KEY)).toBe(true)
    expect(api.saveSignOffOutput).toHaveBeenCalledWith('g1', 'a', 'mine')
    expect(s.getState().drafts).toEqual({})
    expect(s.getState().documents.b?.text).toBe('mine')
    expect(s.getState().data?.outputs[0]?.sections[0]?.evidenceId).toBe('b')
    expect(s.getState().saving).toEqual([])
  })

  it('never sends what the route would refuse', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, '  ')
    expect(await s.saveDraft(KEY)).toBe(false)
    expect(api.saveSignOffOutput).not.toHaveBeenCalled()
  })

  it('is not saved twice at once', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    const saving = deferred<SignOffOutputDocument>()
    api.saveSignOffOutput.mockReturnValueOnce(saving.promise)
    api.readGroupSignOff.mockResolvedValue(view('b'))
    const first = s.saveDraft(KEY)
    expect(await s.saveDraft(KEY)).toBe(false)
    saving.resolve(doc('b', 'mine'))
    await first
    expect(api.saveSignOffOutput).toHaveBeenCalledTimes(1)
  })

  it('survives a read of the view that moved the version, and says so', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.readGroupSignOff.mockResolvedValueOnce(view('b'))
    await s.refresh()
    expect(s.getState().drafts[KEY]).toEqual({
      text: 'mine',
      baseEvidenceId: 'a',
      notice: 'changed',
    })
  })

  it('survives a read that says the sign-off was decided, and says so', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.readGroupSignOff.mockResolvedValueOnce(view('a', { canEditOutputs: false }))
    await s.refresh()
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', notice: 'closed' })
  })

  it('keeps the text when its version was superseded on save, and reads the view again', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockRejectedValueOnce(refused(404, 'Superseded.'))
    api.readGroupSignOff.mockResolvedValueOnce(view('b'))
    expect(await s.saveDraft(KEY)).toBe(false)
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', notice: 'changed' })
    expect(s.getState().documents.b).toBeDefined()
  })

  it('keeps the text when the sign-off closed on save', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockRejectedValueOnce(refused(409, 'Decided.'))
    api.readGroupSignOff.mockResolvedValueOnce(view('a', { canEditOutputs: false }))
    expect(await s.saveDraft(KEY)).toBe(false)
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', notice: 'closed' })
  })

  it('says the sign-off closed even when the read after it fails', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockRejectedValueOnce(refused(409, 'Decided.'))
    api.readGroupSignOff.mockRejectedValueOnce(refused(500, 'Down.'))
    await s.saveDraft(KEY)
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', notice: 'closed' })
  })

  it('keeps the text and the reason when a save failed some other way', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockRejectedValueOnce(refused(500, 'Disk full.'))
    expect(await s.saveDraft(KEY)).toBe(false)
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', error: 'Disk full.' })
    expect(s.getState().saving).toEqual([])
  })

  it('clears a save’s error as the person types', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.saveSignOffOutput.mockRejectedValueOnce(refused(500, 'Disk full.'))
    await s.saveDraft(KEY)
    s.changeDraft(KEY, 'mine!')
    expect(s.getState().drafts[KEY]?.error).toBeUndefined()
  })

  it('goes over the new version when the person keeps it', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.readGroupSignOff.mockResolvedValueOnce(view('b'))
    await s.refresh()
    api.saveSignOffOutput.mockResolvedValueOnce(doc('c', 'mine'))
    api.readGroupSignOff.mockResolvedValueOnce(view('c'))
    expect(await s.keepEdit(KEY)).toBe(true)
    expect(api.saveSignOffOutput).toHaveBeenCalledWith('g1', 'b', 'mine')
    expect(s.getState().drafts).toEqual({})
  })

  it('cannot be kept over a section that no longer has a version', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.readGroupSignOff.mockResolvedValueOnce(view(undefined))
    await s.refresh()
    expect(await s.keepEdit(KEY)).toBe(false)
    expect(s.getState().drafts[KEY]?.text).toBe('mine')
  })

  it('is not undone by a read that started before the save', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    const stale = deferred<GroupSignOffData>()
    api.readGroupSignOff.mockReturnValueOnce(stale.promise).mockResolvedValue(view('b'))
    const reading = s.refresh()
    api.saveSignOffOutput.mockResolvedValueOnce(doc('b', 'mine'))
    await s.saveDraft(KEY)
    stale.resolve(view('a'))
    await reading
    expect(s.getState().data?.outputs[0]?.sections[0]?.evidenceId).toBe('b')
  })
})

describe('the decision', () => {
  it('sends who took it and shows the answer, without reading again', async () => {
    const s = await opened()
    api.decideGroupSignOff.mockResolvedValueOnce(
      view('a', { canDecide: false, canEditOutputs: false }),
    )
    expect(await s.decide({ choice: 'approve' })).toBe(true)
    expect(api.decideGroupSignOff).toHaveBeenCalledWith('g1', {
      choice: 'approve',
      decidedVia: 'web',
    })
    expect(s.getState().data?.canDecide).toBe(false)
    expect(s.getState().acting).toBeUndefined()
  })

  it('says the client it was taken on', async () => {
    api.readGroupSignOff.mockResolvedValueOnce(view('a'))
    const s = new GroupSignOffStore('g1', () => 'mobile')
    await s.refresh()
    api.decideGroupSignOff.mockResolvedValueOnce(view('a'))
    await s.decide({ choice: 'reject' })
    expect(api.decideGroupSignOff).toHaveBeenCalledWith('g1', {
      choice: 'reject',
      decidedVia: 'mobile',
    })
  })

  it('shows it is on its way', async () => {
    const s = await opened()
    const deciding = deferred<GroupSignOffData>()
    api.decideGroupSignOff.mockReturnValueOnce(deciding.promise)
    const sent = s.decide({ choice: 'reject' })
    expect(s.getState().acting).toBe('reject')
    deciding.resolve(view('a'))
    await sent
  })

  it('takes one decision at a time', async () => {
    const s = await opened()
    const deciding = deferred<GroupSignOffData>()
    api.decideGroupSignOff.mockReturnValueOnce(deciding.promise)
    const sent = s.decide({ choice: 'approve' })
    expect(await s.decide({ choice: 'reject' })).toBe(false)
    deciding.resolve(view('a'))
    await sent
    expect(api.decideGroupSignOff).toHaveBeenCalledTimes(1)
  })

  it('says why it was refused, and reads where things stand', async () => {
    const s = await opened()
    api.decideGroupSignOff.mockRejectedValueOnce(refused(400, 'Not ready.'))
    api.readGroupSignOff.mockResolvedValueOnce(view('a', { canDecide: false }))
    expect(await s.decide({ choice: 'approve' })).toBe(false)
    expect(s.getState().actionError).toBe('Not ready.')
    expect(s.getState().data?.canDecide).toBe(false)
  })

  it('clears the last refusal on the next decision', async () => {
    const s = await opened()
    api.decideGroupSignOff.mockRejectedValueOnce(refused(400, 'Not ready.'))
    api.readGroupSignOff.mockResolvedValueOnce(view('a'))
    await s.decide({ choice: 'approve' })
    api.decideGroupSignOff.mockResolvedValueOnce(view('a'))
    await s.decide({ choice: 'approve' })
    expect(s.getState().actionError).toBeNull()
  })

  it('is not undone by a read that started before it', async () => {
    const s = await opened()
    const stale = deferred<GroupSignOffData>()
    api.readGroupSignOff
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue(view('a', { canDecide: false }))
    const reading = s.refresh()
    api.decideGroupSignOff.mockResolvedValueOnce(view('a', { canDecide: false }))
    await s.decide({ choice: 'approve' })
    const seen: boolean[] = []
    s.subscribe(() => seen.push(s.getState().data?.canDecide === true))
    stale.resolve(view('a', { canDecide: true }))
    await reading
    expect(seen).not.toContain(true)
    expect(s.getState().data?.canDecide).toBe(false)
  })

  it('tells of an edit the decision closed', async () => {
    const s = await opened()
    s.startEdit(KEY)
    s.changeDraft(KEY, 'mine')
    api.decideGroupSignOff.mockResolvedValueOnce(
      view('a', { canDecide: false, canEditOutputs: false }),
    )
    await s.decide({ choice: 'request-changes', legId: 'be' })
    expect(s.getState().drafts[KEY]).toMatchObject({ text: 'mine', notice: 'closed' })
  })

  it('retries on the sign-off’s route, and says why not', async () => {
    const s = await opened()
    api.retryGroupSignOff.mockResolvedValueOnce(view('a', { canRetry: false }))
    expect(await s.retry()).toBe(true)
    api.retryGroupSignOff.mockRejectedValueOnce(refused(400, 'Nothing failed.'))
    api.readGroupSignOff.mockResolvedValueOnce(view('a'))
    expect(await s.retry()).toBe(false)
    expect(s.getState().actionError).toBe('Nothing failed.')
  })
})

describe('an attachment', () => {
  const attachment = {
    evidenceId: 'e',
    projectId: 'be',
    kind: 'file' as const,
    name: 'log.txt',
    downloadPath: '/projects/be/review-evidence/e/content?download=true',
  }

  it('is fetched by its path, busy until it comes', async () => {
    const s = store()
    const fetching = deferred<ArrayBuffer>()
    api.readSignOffAttachment.mockReturnValueOnce(fetching.promise)
    const read = s.readAttachment(attachment)
    expect(s.getState().fetches.e).toEqual({ busy: true })
    const bytes = new ArrayBuffer(1)
    fetching.resolve(bytes)
    expect(await read).toBe(bytes)
    expect(s.getState().fetches).toEqual({})
  })

  it('says when it could not be fetched', async () => {
    const s = store()
    api.readSignOffAttachment.mockRejectedValueOnce(refused(404, 'Gone.'))
    expect(await s.readAttachment(attachment)).toBeUndefined()
    expect(s.getState().fetches.e).toEqual({ busy: false, error: 'Gone.' })
  })

  it('has nothing to fetch for a link', async () => {
    expect(await store().readAttachment({ ...attachment, downloadPath: undefined })).toBeUndefined()
    expect(api.readSignOffAttachment).not.toHaveBeenCalled()
  })
})
