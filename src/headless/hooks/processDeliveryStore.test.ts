import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  readProcessDelivery: vi.fn(),
  saveProcessPublishEdits: vi.fn(),
  publishProcessGroup: vi.fn(),
}))

vi.mock('../api/processDeliveryApi', () => api)

import { PROCESS_PUBLISH_COPY } from '../utils/processDeliveryConstants'
import type { ProcessDeliveryData, ProcessDeliveryRepo } from '../utils/processDeliveryTypes'
import { ProcessDeliveryStore } from './processDeliveryStore'

const repo = (over: Partial<ProcessDeliveryRepo> = {}): ProcessDeliveryRepo => ({
  runId: 'run-web',
  projectId: 'web',
  name: 'Web',
  branchTemplate: 'feature/{ticket}-{short}',
  short: 'dark-mode',
  prTitle: 'Add dark mode',
  baseBranch: 'main',
  account: 'builder',
  changed: true,
  ...over,
})
const DATA: ProcessDeliveryData = { repos: [repo()] }
const RUN = { kind: 'run', runId: 'run-web' } as const

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  api.readProcessDelivery.mockResolvedValue(DATA)
})

describe('ProcessDeliveryStore', () => {
  it('reads the delivery and starts the card on the host’s fields', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    expect(api.readProcessDelivery).toHaveBeenCalledWith(RUN)
    expect(store.getState()).toMatchObject({
      data: DATA,
      readError: null,
      edits: { web: { short: 'dark-mode', prTitle: 'Add dark mode' } },
    })
  })

  it('reads once for reads asked together', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await Promise.all([store.refresh(), store.refresh()])
    expect(api.readProcessDelivery).toHaveBeenCalledTimes(1)
  })

  it('says why a read failed', async () => {
    api.readProcessDelivery.mockRejectedValue(new Error('down'))
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    expect(store.getState().readError).toBe('down')
  })

  it('keeps the person’s edit over a new read, and takes the host’s other fields', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    store.setEdit('web', 'short', 'night theme')
    api.readProcessDelivery.mockResolvedValue({ repos: [repo({ prTitle: 'Dark mode' })] })
    await store.refresh()
    expect(store.getState().edits.web).toEqual({ short: 'night theme', prTitle: 'Dark mode' })
  })

  it('ignores an edit of a repo it does not hold', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    store.setEdit('api', 'short', 'x')
    expect(store.getState().edits.api).toBeUndefined()
  })

  it('tells its listeners of each change, until they leave', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    const listener = vi.fn()
    const leave = store.subscribe(listener)
    await store.refresh()
    expect(listener).toHaveBeenCalled()
    leave()
    listener.mockClear()
    store.setEdit('web', 'short', 'x')
    expect(listener).not.toHaveBeenCalled()
  })

  it('answers a run’s gate straight away when nothing was edited', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    const answer = vi.fn().mockResolvedValue(true)
    expect(await store.publish(answer)).toBe(true)
    expect(api.saveProcessPublishEdits).not.toHaveBeenCalled()
    expect(answer).toHaveBeenCalledTimes(1)
  })

  it('keeps the edits first, then answers the gate', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    store.setEdit('web', 'prTitle', ' Night theme ')
    api.saveProcessPublishEdits.mockResolvedValue({ repos: [repo({ prTitle: 'Night theme' })] })
    const order: string[] = []
    api.saveProcessPublishEdits.mockImplementation(async () => {
      order.push('save')
      return { repos: [repo({ prTitle: 'Night theme' })] }
    })
    const answer = vi.fn(async () => {
      order.push('answer')
      return true
    })
    expect(await store.publish(answer)).toBe(true)
    expect(api.saveProcessPublishEdits).toHaveBeenCalledWith(RUN, {
      repos: [{ projectId: 'web', short: 'dark-mode', prTitle: 'Night theme' }],
    })
    expect(order).toEqual(['save', 'answer'])
  })

  it('shows publishing at once, and stops once it is done', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    const gate = deferred<boolean>()
    const going = store.publish(() => gate.promise)
    expect(store.getState().publishing).toBe(true)
    gate.resolve(true)
    await going
    expect(store.getState().publishing).toBe(false)
  })

  it('makes a second press while it goes the same press', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    const gate = deferred<boolean>()
    const answer = vi.fn(() => gate.promise)
    const first = store.publish(answer)
    const second = store.publish(answer)
    gate.resolve(true)
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(answer).toHaveBeenCalledTimes(1)
  })

  it('rolls back when the edits are refused, without answering the gate', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    store.setEdit('web', 'short', 'x')
    api.saveProcessPublishEdits.mockRejectedValue(new Error('Someone else pushed to it.'))
    const answer = vi.fn()
    expect(await store.publish(answer)).toBe(false)
    expect(answer).not.toHaveBeenCalled()
    expect(store.getState()).toMatchObject({
      publishing: false,
      actionError: 'Someone else pushed to it.',
      edits: { web: { short: 'x' } },
    })
  })

  it('rolls back when the gate’s answer is refused', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    expect(await store.publish(async () => false)).toBe(false)
    expect(store.getState().publishing).toBe(false)
  })

  it('says a generic reason when a refusal has none', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    await store.refresh()
    expect(await store.publish(() => Promise.reject(undefined))).toBe(false)
    expect(store.getState().actionError).toBe(PROCESS_PUBLISH_COPY.publishFailed)
  })

  it('publishes nothing before the delivery is read', async () => {
    const store = new ProcessDeliveryStore(RUN, () => 'web')
    const answer = vi.fn()
    expect(await store.publish(answer)).toBe(false)
    expect(answer).not.toHaveBeenCalled()
  })

  it('publishes a group run in one call, saying which client did', async () => {
    const two = { repos: [repo(), repo({ projectId: 'api', runId: 'run-api', legId: 'api' })] }
    api.readProcessDelivery.mockResolvedValue(two)
    api.publishProcessGroup.mockResolvedValue(two)
    const store = new ProcessDeliveryStore({ kind: 'group', groupRunId: 'g1' }, () => 'mobile')
    await store.refresh()
    expect(await store.publish()).toBe(true)
    expect(api.publishProcessGroup).toHaveBeenCalledWith('g1', {
      repos: [
        { projectId: 'web', short: 'dark-mode', prTitle: 'Add dark mode' },
        { projectId: 'api', short: 'dark-mode', prTitle: 'Add dark mode' },
      ],
      decidedVia: 'mobile',
    })
  })

  describe('one leg of a group run', () => {
    const GROUP = { kind: 'group', groupRunId: 'g1' } as const
    const docs = repo({ projectId: 'docs', runId: 'run-docs', legId: 'docs', short: 'guide' })
    const TWO = { repos: [repo(), docs] }
    const published = {
      repos: [
        repo(),
        {
          ...docs,
          publication: {
            remoteBranch: 'feature/guide',
            localBranch: 'feature/guide',
            sha: 'a',
            onto: 'b',
            status: 'open',
            at: 1,
          },
        },
      ],
    } as ProcessDeliveryData
    const groupStore = async () => {
      api.readProcessDelivery.mockResolvedValue(TWO)
      const store = new ProcessDeliveryStore(GROUP, () => 'desktop')
      await store.refresh()
      return store
    }

    it('publishes that leg alone, with its edits and who did', async () => {
      const store = await groupStore()
      store.setEdit('docs', 'prTitle', ' Write the guide ')
      api.publishProcessGroup.mockResolvedValue(published)
      expect(await store.publishLeg('docs')).toBe(true)
      expect(api.publishProcessGroup).toHaveBeenCalledWith('g1', {
        projectId: 'docs',
        repos: [{ projectId: 'docs', short: 'guide', prTitle: 'Write the guide' }],
        decidedVia: 'desktop',
      })
      expect(store.getState()).toMatchObject({
        data: published,
        legs: { docs: { phase: 'sent' } },
        publishing: false,
        actionError: null,
      })
    })

    it('shows the leg going at once, the other legs untouched', async () => {
      const store = await groupStore()
      const reply = deferred<ProcessDeliveryData>()
      api.publishProcessGroup.mockReturnValue(reply.promise)
      const going = store.publishLeg('docs')
      expect(store.getState().legs).toEqual({ docs: { phase: 'publishing' } })
      reply.resolve(published)
      await going
      expect(store.getState().legs).toEqual({ docs: { phase: 'sent' } })
    })

    it('makes a second press while it goes the same press', async () => {
      const store = await groupStore()
      const reply = deferred<ProcessDeliveryData>()
      api.publishProcessGroup.mockReturnValue(reply.promise)
      const first = store.publishLeg('docs')
      const second = store.publishLeg('docs')
      reply.resolve(published)
      expect(await Promise.all([first, second])).toEqual([true, true])
      expect(api.publishProcessGroup).toHaveBeenCalledTimes(1)
    })

    it('publishes two legs side by side, each its own press', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockResolvedValue(published)
      await Promise.all([store.publishLeg('docs'), store.publishLeg('web')])
      expect(api.publishProcessGroup).toHaveBeenCalledTimes(2)
      expect(store.getState().legs).toEqual({ docs: { phase: 'sent' }, web: { phase: 'sent' } })
    })

    it('presses again once the first is done', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockRejectedValueOnce(new Error('down'))
      api.publishProcessGroup.mockResolvedValueOnce(published)
      expect(await store.publishLeg('docs')).toBe(false)
      expect(await store.publishLeg('docs')).toBe(true)
      expect(api.publishProcessGroup).toHaveBeenCalledTimes(2)
    })

    it('rolls back with the host’s reason, the edits kept', async () => {
      const store = await groupStore()
      store.setEdit('docs', 'short', 'user quotes')
      api.publishProcessGroup.mockRejectedValue(new Error('docs is not at its publish gate.'))
      expect(await store.publishLeg('docs')).toBe(false)
      expect(store.getState()).toMatchObject({
        data: TWO,
        legs: { docs: { phase: 'refused', error: 'docs is not at its publish gate.' } },
        edits: { docs: { short: 'user quotes' } },
        actionError: null,
      })
    })

    it('says a generic reason when a refusal has none', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockRejectedValue(undefined)
      await store.publishLeg('docs')
      expect(store.getState().legs.docs).toEqual({
        phase: 'refused',
        error: PROCESS_PUBLISH_COPY.publishFailed,
      })
    })

    it('clears the reason on the next press', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockRejectedValueOnce(new Error('down'))
      await store.publishLeg('docs')
      const reply = deferred<ProcessDeliveryData>()
      api.publishProcessGroup.mockReturnValue(reply.promise)
      const going = store.publishLeg('docs')
      expect(store.getState().legs.docs).toEqual({ phase: 'publishing' })
      reply.resolve(published)
      await going
    })

    it('shows the card again on a read asked after it was sent, in case the leg is back at its gate', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockResolvedValue(published)
      await store.publishLeg('docs')
      api.readProcessDelivery.mockResolvedValue(published)
      await store.refresh()
      expect(store.getState().legs).toEqual({})
      expect(store.getState().data).toEqual(published)
    })

    it('keeps it sent through a read asked before it was sent', async () => {
      const store = await groupStore()
      const reply = deferred<ProcessDeliveryData>()
      api.publishProcessGroup.mockReturnValue(reply.promise)
      const going = store.publishLeg('docs')
      const read = deferred<ProcessDeliveryData>()
      api.readProcessDelivery.mockReturnValue(read.promise)
      const reading = store.refresh()
      reply.resolve(published)
      await going
      read.resolve(TWO)
      await reading
      expect(store.getState().legs).toEqual({ docs: { phase: 'sent' } })
    })

    it('keeps a leg pressed again while a read goes as it is', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockResolvedValueOnce(published)
      await store.publishLeg('docs')
      const read = deferred<ProcessDeliveryData>()
      api.readProcessDelivery.mockReturnValue(read.promise)
      const reading = store.refresh()
      const reply = deferred<ProcessDeliveryData>()
      api.publishProcessGroup.mockReturnValue(reply.promise)
      const going = store.publishLeg('docs')
      read.resolve(published)
      await reading
      expect(store.getState().legs).toEqual({ docs: { phase: 'publishing' } })
      reply.resolve(published)
      await going
    })

    it('keeps a refusal’s reason through a new read', async () => {
      const store = await groupStore()
      api.publishProcessGroup.mockRejectedValue(new Error('down'))
      await store.publishLeg('docs')
      await store.refresh()
      expect(store.getState().legs.docs).toEqual({ phase: 'refused', error: 'down' })
    })

    it('publishes nothing for a repo it does not hold, or before the delivery is read', async () => {
      const store = await groupStore()
      expect(await store.publishLeg('gone')).toBe(false)
      const unread = new ProcessDeliveryStore(GROUP, () => 'web')
      expect(await unread.publishLeg('docs')).toBe(false)
      expect(api.publishProcessGroup).not.toHaveBeenCalled()
      expect(store.getState().legs).toEqual({})
    })

    it('publishes no leg of a single run', async () => {
      const store = new ProcessDeliveryStore(RUN, () => 'web')
      await store.refresh()
      expect(await store.publishLeg('web')).toBe(false)
      expect(api.publishProcessGroup).not.toHaveBeenCalled()
    })
  })
})
