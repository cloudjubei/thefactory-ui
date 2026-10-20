import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listProjectAgentTypes: vi.fn(),
  listGroupAgentTypes: vi.fn(),
  saveProjectAgentType: vi.fn(),
  saveGroupAgentType: vi.fn(),
  deleteProjectAgentType: vi.fn(),
  deleteGroupAgentType: vi.fn(),
  saveProjectAgentTypeSlots: vi.fn(),
  saveGroupAgentTypeSlots: vi.fn(),
}))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import {
  readAgentTypeSettings,
  removeAgentTypeFor,
  saveAgentTypeFor,
  saveAgentTypeSlotsFor,
} from './useAgentTypeSettings'

const PROJECT = { kind: 'project' as const, projectId: 'web' }
const GROUP = { kind: 'group' as const, groupId: 'web-team' }
const request = { id: 'builder', body: { label: 'Builder', baseRole: 'developer' as const } }

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: {} })
})

describe('the agent type settings calls', () => {
  it("read a project's types from its own route, and a group's from the group's", async () => {
    api.listProjectAgentTypes.mockResolvedValue({ data: { agentTypes: [], slotDefaults: {} } })
    api.listGroupAgentTypes.mockResolvedValue({
      data: { agentTypes: [{ id: 'g' }], slotDefaults: {} },
    })
    expect(await readAgentTypeSettings(PROJECT)).toEqual({ agentTypes: [], slotDefaults: {} })
    expect(await readAgentTypeSettings(GROUP)).toEqual({
      agentTypes: [{ id: 'g' }],
      slotDefaults: {},
    })
    expect(api.listProjectAgentTypes).toHaveBeenCalledWith({
      path: { projectId: 'web' },
      throwOnError: true,
    })
    expect(api.listGroupAgentTypes).toHaveBeenCalledWith({
      path: { groupId: 'web-team' },
      throwOnError: true,
    })
  })

  it('save a type under the id it names, to its owner', async () => {
    await saveAgentTypeFor(PROJECT, request)
    await saveAgentTypeFor(GROUP, request)
    expect(api.saveProjectAgentType).toHaveBeenCalledWith({
      path: { projectId: 'web', agentTypeId: 'builder' },
      body: request.body,
      throwOnError: true,
    })
    expect(api.saveGroupAgentType).toHaveBeenCalledWith({
      path: { groupId: 'web-team', agentTypeId: 'builder' },
      body: request.body,
      throwOnError: true,
    })
  })

  it('remove a type from its owner alone', async () => {
    await removeAgentTypeFor(GROUP, 'builder')
    expect(api.deleteGroupAgentType).toHaveBeenCalledWith({
      path: { groupId: 'web-team', agentTypeId: 'builder' },
      throwOnError: true,
    })
    expect(api.deleteProjectAgentType).not.toHaveBeenCalled()
    await removeAgentTypeFor(PROJECT, 'builder')
    expect(api.deleteProjectAgentType).toHaveBeenCalledWith({
      path: { projectId: 'web', agentTypeId: 'builder' },
      throwOnError: true,
    })
  })

  it("replace the owner's own slot defaults", async () => {
    await saveAgentTypeSlotsFor(PROJECT, { verifier: 'screen-checker' })
    await saveAgentTypeSlotsFor(GROUP, {})
    expect(api.saveProjectAgentTypeSlots).toHaveBeenCalledWith({
      path: { projectId: 'web' },
      body: { verifier: 'screen-checker' },
      throwOnError: true,
    })
    expect(api.saveGroupAgentTypeSlots).toHaveBeenCalledWith({
      path: { groupId: 'web-team' },
      body: {},
      throwOnError: true,
    })
  })

  it('pass a refusal on to the caller', async () => {
    api.saveProjectAgentType.mockRejectedValue({ error: 'writeFile is not a verifier’s.' })
    await expect(saveAgentTypeFor(PROJECT, request)).rejects.toEqual({
      error: 'writeFile is not a verifier’s.',
    })
  })
})
