import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupTicketTab, GroupTicketTabs } from '../utils/groupTicketTabTypes'

const api = vi.hoisted(() => ({ readGroupTicketTabs: vi.fn(), saveGroupTicketTabs: vi.fn() }))
vi.mock('../api/groupTicketTabsApi', () => api)

import { GroupTicketTabsEditorStore } from './groupTicketTabsEditorStore'

const tab = (id: string, over: Partial<GroupTicketTab> = {}): GroupTicketTab => ({
  id,
  name: `Tab ${id}`,
  statuses: [],
  sprint: 'open',
  yours: ['discuss'],
  others: ['discuss'],
  ...over,
})

const DEFAULTS: GroupTicketTabs = { tabs: [tab('todo'), tab('doing')], custom: false }

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const names = (store: GroupTicketTabsEditorStore) => store.getState().tabs?.tabs.map((t) => t.name)

const readStore = async (onSaved = vi.fn()) => {
  api.readGroupTicketTabs.mockResolvedValue(DEFAULTS)
  const store = new GroupTicketTabsEditorStore('osc', onSaved)
  await store.read()
  return store
}

beforeEach(() => {
  api.readGroupTicketTabs.mockReset()
  api.saveGroupTicketTabs.mockReset()
})

describe('GroupTicketTabsEditorStore', () => {
  it('reads the group’s tabs, and says why a read failed', async () => {
    const store = await readStore()
    expect(api.readGroupTicketTabs).toHaveBeenCalledWith('osc')
    expect(store.getState().tabs).toEqual(DEFAULTS)
    api.readGroupTicketTabs.mockRejectedValueOnce(new Error('down'))
    await store.read()
    expect(store.getState()).toMatchObject({ tabs: DEFAULTS, readError: 'down' })
  })

  it('shows a change at once as the group’s own tabs, saves it, and tells who follows the tabs', async () => {
    const onSaved = vi.fn()
    const store = await readStore(onSaved)
    const saving = deferred<GroupTicketTabs>()
    api.saveGroupTicketTabs.mockReturnValueOnce(saving.promise)
    store.change({ kind: 'rename', id: 'todo', name: 'Pending' })
    expect(names(store)).toEqual(['Pending', 'Tab doing'])
    expect(store.getState()).toMatchObject({ saving: 1, tabs: { custom: true } })
    const sent = api.saveGroupTicketTabs.mock.calls[0]?.[1] as GroupTicketTab[]
    expect(sent.map((t) => t.name)).toEqual(['Pending', 'Tab doing'])
    saving.resolve({ tabs: sent, custom: true })
    await store.idle()
    expect(store.getState().saving).toBe(0)
    expect(onSaved).toHaveBeenCalledWith({ tabs: sent, custom: true })
  })

  it('sends nothing for a change that changes nothing', async () => {
    const store = await readStore()
    store.change({ kind: 'move', id: 'todo', by: -1 })
    store.change({ kind: 'rename', id: 'todo', name: '' })
    expect(api.saveGroupTicketTabs).not.toHaveBeenCalled()
  })

  it('sends changes made while one is on its way as one save of the latest, after it', async () => {
    const store = await readStore()
    const first = deferred<GroupTicketTabs>()
    api.saveGroupTicketTabs.mockReturnValueOnce(first.promise)
    api.saveGroupTicketTabs.mockImplementation(async (_g: string, tabs: GroupTicketTab[]) => ({
      tabs,
      custom: true,
    }))
    store.change({ kind: 'rename', id: 'todo', name: 'A' })
    store.change({ kind: 'rename', id: 'todo', name: 'B' })
    store.change({ kind: 'rename', id: 'todo', name: 'C' })
    expect(api.saveGroupTicketTabs).toHaveBeenCalledTimes(1)
    first.resolve({ tabs: [tab('todo', { name: 'A' }), tab('doing')], custom: true })
    await store.idle()
    expect(api.saveGroupTicketTabs).toHaveBeenCalledTimes(2)
    expect((api.saveGroupTicketTabs.mock.calls[1]?.[1] as GroupTicketTab[])[0]?.name).toBe('C')
    expect(names(store)).toEqual(['C', 'Tab doing'])
  })

  it('undoes a refused change and any made after it, with why', async () => {
    const store = await readStore()
    const first = deferred<GroupTicketTabs>()
    api.saveGroupTicketTabs.mockReturnValueOnce(first.promise)
    store.change({ kind: 'remove', id: 'doing' })
    store.change({ kind: 'rename', id: 'todo', name: 'Pending' })
    first.reject(new Error('Tab names must differ.'))
    await store.idle()
    expect(store.getState()).toMatchObject({
      tabs: DEFAULTS,
      saving: 0,
      saveError: 'Tab names must differ.',
    })
    expect(api.saveGroupTicketTabs).toHaveBeenCalledTimes(1)
  })

  it('clears why the last change failed once another is made', async () => {
    const store = await readStore()
    api.saveGroupTicketTabs.mockRejectedValueOnce(new Error('no'))
    store.change({ kind: 'add' })
    await store.idle()
    expect(store.getState().saveError).toBe('no')
    api.saveGroupTicketTabs.mockResolvedValueOnce({ tabs: [], custom: true })
    store.change({ kind: 'add' })
    expect(store.getState().saveError).toBeNull()
  })

  it('goes back to the defaults by saving no tabs, and shows what the backend answers', async () => {
    const onSaved = vi.fn()
    const store = await readStore(onSaved)
    api.saveGroupTicketTabs.mockResolvedValueOnce(DEFAULTS)
    store.reset()
    expect(api.saveGroupTicketTabs).toHaveBeenCalledWith('osc', [])
    await store.idle()
    expect(store.getState().tabs).toEqual(DEFAULTS)
    expect(onSaved).toHaveBeenCalledWith(DEFAULTS)
  })

  it('keeps what was sent when the save answers without the tabs', async () => {
    const store = await readStore()
    api.saveGroupTicketTabs.mockResolvedValueOnce({ ok: true })
    store.change({ kind: 'rename', id: 'todo', name: 'Pending' })
    await store.idle()
    expect(store.getState().tabs).toMatchObject({ custom: true })
    expect(names(store)).toEqual(['Pending', 'Tab doing'])
  })

  it('changes nothing before the tabs were read', () => {
    const store = new GroupTicketTabsEditorStore('osc', vi.fn())
    store.change({ kind: 'add' })
    expect(api.saveGroupTicketTabs).not.toHaveBeenCalled()
  })
})
