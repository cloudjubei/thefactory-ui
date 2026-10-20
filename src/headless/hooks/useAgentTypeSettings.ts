import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentTypeSlotMap } from 'thefactory-tools/types'

import {
  deleteGroupAgentType,
  deleteProjectAgentType,
  extractErrorMessage,
  listGroupAgentTypes,
  listProjectAgentTypes,
  saveGroupAgentType,
  saveGroupAgentTypeSlots,
  saveProjectAgentType,
  saveProjectAgentTypeSlots,
} from '../api'
import { useAuth } from '../api/AuthContext'
import type {
  AgentTypeOwner,
  AgentTypeSaveRequest,
  AgentTypeSettingsData,
} from '../utils/agentTypeSettingsTypes'

export type UseAgentTypeSettings = {
  /** The owner's types and slot defaults; undefined until they are read. */
  data: AgentTypeSettingsData | undefined
  /** Why the last read or change failed, in the backend's words. */
  error: string | null
  busy: boolean
  /** Create or update a type; resolves `false` and sets `error` when refused. */
  save: (request: AgentTypeSaveRequest) => Promise<boolean>
  /** Remove one of the owner's types. */
  remove: (agentTypeId: string) => Promise<boolean>
  /** Replace the owner's own slot defaults. */
  saveSlots: (slots: AgentTypeSlotMap) => Promise<boolean>
  refresh: () => Promise<void>
}

const ownerKey = (owner: AgentTypeOwner | undefined): string =>
  owner ? `${owner.kind}:${owner.kind === 'project' ? owner.projectId : owner.groupId}` : ''

/** Read an owner's agent types and slot defaults. */
export async function readAgentTypeSettings(owner: AgentTypeOwner): Promise<AgentTypeSettingsData> {
  const listed =
    owner.kind === 'project'
      ? (await listProjectAgentTypes({ path: { projectId: owner.projectId }, throwOnError: true }))
          .data
      : (await listGroupAgentTypes({ path: { groupId: owner.groupId }, throwOnError: true })).data
  return listed as AgentTypeSettingsData
}

/** Create or update one of an owner's agent types. */
export async function saveAgentTypeFor(
  owner: AgentTypeOwner,
  request: AgentTypeSaveRequest,
): Promise<void> {
  if (owner.kind === 'project') {
    await saveProjectAgentType({
      path: { projectId: owner.projectId, agentTypeId: request.id },
      body: request.body,
      throwOnError: true,
    })
    return
  }
  await saveGroupAgentType({
    path: { groupId: owner.groupId, agentTypeId: request.id },
    body: request.body,
    throwOnError: true,
  })
}

/** Remove one of an owner's agent types. */
export async function removeAgentTypeFor(
  owner: AgentTypeOwner,
  agentTypeId: string,
): Promise<void> {
  if (owner.kind === 'project') {
    await deleteProjectAgentType({
      path: { projectId: owner.projectId, agentTypeId },
      throwOnError: true,
    })
    return
  }
  await deleteGroupAgentType({ path: { groupId: owner.groupId, agentTypeId }, throwOnError: true })
}

/** Replace an owner's own slot defaults. */
export async function saveAgentTypeSlotsFor(
  owner: AgentTypeOwner,
  slots: AgentTypeSlotMap,
): Promise<void> {
  if (owner.kind === 'project') {
    await saveProjectAgentTypeSlots({
      path: { projectId: owner.projectId },
      body: slots,
      throwOnError: true,
    })
    return
  }
  await saveGroupAgentTypeSlots({
    path: { groupId: owner.groupId },
    body: slots,
    throwOnError: true,
  })
}

/**
 * A project's or a group's agent types and slot defaults, as its settings
 * manage them: read once per owner, and read again after every change so what
 * is shown is what the backend kept. Pass `undefined` to idle.
 */
export function useAgentTypeSettings(owner: AgentTypeOwner | undefined): UseAgentTypeSettings {
  const { token } = useAuth()
  const key = ownerKey(owner)
  const [data, setData] = useState<AgentTypeSettingsData | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const keyRef = useRef(key)
  keyRef.current = key
  const ownerRef = useRef(owner)
  ownerRef.current = owner

  const refresh = useCallback(async () => {
    const current = ownerRef.current
    if (!current) {
      setData(undefined)
      return
    }
    const readFor = ownerKey(current)
    try {
      const listed = await readAgentTypeSettings(current)
      if (keyRef.current !== readFor) return
      setData(listed)
      setError(null)
    } catch (err) {
      if (keyRef.current !== readFor) return
      setError(extractErrorMessage(err, 'Could not read the agent types.'))
    }
  }, [])

  useEffect(() => {
    setData(undefined)
    setError(null)
    if (!token || !key) return
    void refresh()
  }, [token, key, refresh])

  const act = useCallback(
    async (change: (current: AgentTypeOwner) => Promise<unknown>, fallback: string) => {
      const current = ownerRef.current
      if (!current) return false
      setBusy(true)
      setError(null)
      try {
        await change(current)
        await refresh()
        return true
      } catch (err) {
        setError(extractErrorMessage(err, fallback))
        return false
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const save = useCallback(
    (request: AgentTypeSaveRequest) =>
      act((current) => saveAgentTypeFor(current, request), 'Could not save the agent type.'),
    [act],
  )

  const remove = useCallback(
    (agentTypeId: string) =>
      act(
        (current) => removeAgentTypeFor(current, agentTypeId),
        'Could not delete the agent type.',
      ),
    [act],
  )

  const saveSlots = useCallback(
    (slots: AgentTypeSlotMap) =>
      act((current) => saveAgentTypeSlotsFor(current, slots), 'Could not save the slot defaults.'),
    [act],
  )

  return { data, error, busy, save, remove, saveSlots, refresh }
}
