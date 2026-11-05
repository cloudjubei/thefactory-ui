import { describe, expect, it, vi } from 'vitest'
import {
  createProjectsGroupStatusStore,
  isProjectsGroupStatusSignal,
} from './useProjectsGroupStatus'

type Handler = (data: unknown) => void

function fakeWs() {
  const handlers = new Map<string, Set<Handler>>()
  const reconnects = new Set<() => void>()
  return {
    on: (event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)?.add(handler)
      return () => {
        handlers.get(event)?.delete(handler)
      }
    },
    onReconnect: (handler: () => void) => {
      reconnects.add(handler)
      return () => {
        reconnects.delete(handler)
      }
    },
    send: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
    listeners: (event: string) => handlers.get(event)?.size ?? 0,
  }
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('isProjectsGroupStatusSignal', () => {
  it('takes the group’s own signal, with or without a project', () => {
    expect(isProjectsGroupStatusSignal({ groupId: 'g1' }, 'g1')).toBe(true)
    expect(isProjectsGroupStatusSignal({ groupId: 'g1', projectId: 'p' }, 'g1')).toBe(true)
  })

  it('leaves another group’s alone, and anything else', () => {
    expect(isProjectsGroupStatusSignal({ groupId: 'g2' }, 'g1')).toBe(false)
    expect(isProjectsGroupStatusSignal(undefined, 'g1')).toBe(false)
    expect(isProjectsGroupStatusSignal('g1', 'g1')).toBe(false)
  })
})

describe('createProjectsGroupStatusStore', () => {
  it('reads a held group, and again on its signal', async () => {
    const ws = fakeWs()
    const load = vi.fn(async (id: string) => ({ groupId: id, generatedAt: 'now', members: [] }))
    const store = createProjectsGroupStatusStore(ws, load, 0)
    const release = store.retain('g1')
    await settled()
    expect(load).toHaveBeenCalledTimes(1)
    expect(store.snapshot('g1').data?.groupId).toBe('g1')

    ws.send('projects-group:status-updated', { groupId: 'g1' })
    await settled()
    expect(load).toHaveBeenCalledTimes(2)
    release()
  })

  it('does not read for another group’s signal', async () => {
    const ws = fakeWs()
    const load = vi.fn(async (id: string) => ({ groupId: id, generatedAt: 'now', members: [] }))
    const store = createProjectsGroupStatusStore(ws, load, 0)
    const release = store.retain('g1')
    await settled()
    ws.send('projects-group:status-updated', { groupId: 'g2' })
    await settled()
    expect(load).toHaveBeenCalledTimes(1)
    release()
  })

  it('reads again after the socket comes back', async () => {
    const ws = fakeWs()
    const load = vi.fn(async (id: string) => ({ groupId: id, generatedAt: 'now', members: [] }))
    const store = createProjectsGroupStatusStore(ws, load, 0)
    const release = store.retain('g1')
    await settled()
    ws.reconnect()
    await settled()
    expect(load).toHaveBeenCalledTimes(2)
    release()
  })

  it('stops listening once nothing holds the group', async () => {
    const ws = fakeWs()
    const load = vi.fn(async (id: string) => ({ groupId: id, generatedAt: 'now', members: [] }))
    const store = createProjectsGroupStatusStore(ws, load, 0)
    const release = store.retain('g1')
    await settled()
    release()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(ws.listeners('projects-group:status-updated')).toBe(0)
  })
})
