import { useCallback, useEffect, useRef, useState } from 'react'
import {
  extractErrorMessage,
  updateProject,
  updateProjectsGroup,
  type UpdateProjectsGroupData,
} from '../api'
import { putProjectDataRecord, queryProjectData } from '../api/projectData'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import {
  AGENT_TOOL_SETS_KEY,
  AGENT_TOOL_SETS_RECORD_TYPE,
  capabilityFlagsKey,
  capabilitySettingsView,
  toolSetsKey,
  withDeviceAutomation,
  withGroupCapabilityFlag,
  withProjectCapabilityFlag,
  withToolSet,
} from '../utils/capabilitySettings'
import type {
  CapabilitySettingsOwner,
  CapabilitySettingsRow,
  CapabilitySettingsView,
} from '../utils/capabilitySettingsTypes'

export type UseCapabilitySettings = {
  /** The panel. Undefined until the project or group, and a project's tool-set record, are read. */
  view: CapabilitySettingsView | undefined
  loading: boolean
  /** Why the last read or change failed. */
  error: string | null
  busy: boolean
  toggle: (row: CapabilitySettingsRow, on: boolean) => void
  /** Drop a project's own flag so its main group applies again. */
  inherit: (row: CapabilitySettingsRow) => void
}

const SAVE_FAILED = 'Could not save that capability. Try again.'
const TOOL_SETS_FAILED = 'Could not read device automation and tool sets.'

/** Capabilities carried on a record the generated list type does not name yet. */
function capabilitiesField(value: unknown): unknown {
  if (!value || typeof value !== 'object') return undefined
  return (value as { capabilities?: unknown }).capabilities
}

type Held<T> = { ownerKey: string; key: string; value: T }

/**
 * Hold a value the person just wrote until the server echoes it, so a refresh
 * that has not caught up cannot flip the switch back. The hold belongs to one
 * owner — a different project or group shows that owner's value on this render,
 * and a save that started for the previous owner cannot put its flags back.
 */
function useHeld<T>(
  ownerKey: string,
  serverKey: string,
  serverValue: T,
): [T, (next: T, nextKey: string) => void] {
  const [held, setHeld] = useState<Held<T> | null>(null)
  if (held !== null && held.ownerKey !== ownerKey) setHeld(null)
  const showing = held !== null && held.ownerKey === ownerKey ? held : null
  useEffect(() => {
    if (showing !== null && showing.key === serverKey) setHeld(null)
  }, [showing, serverKey])
  const show = useCallback(
    (next: T, nextKey: string) => {
      setHeld({ ownerKey, key: nextKey, value: next })
    },
    [ownerKey],
  )
  return [showing ? showing.value : serverValue, show]
}

/**
 * Read and change one project or group's capabilities: device automation and
 * tool sets on the project's `agent-tool-sets` record, and the three flags on
 * the project (over its main group) or on the group. Every power stays off
 * until it is exactly turned on.
 */
export function useCapabilitySettings(owner: CapabilitySettingsOwner): UseCapabilitySettings {
  const { projects, isLoaded: projectsLoaded } = useProjects()
  const { groups, isLoaded: groupsLoaded } = useProjectsGroups()
  const project =
    owner.kind === 'project' ? projects.find((item) => item.id === owner.projectId) : undefined
  const group =
    owner.kind === 'group' ? groups.find((item) => item.id === owner.groupId) : undefined
  const mainGroup = project?.mainGroupId
    ? groups.find((item) => item.id === project.mainGroupId)
    : undefined

  const serverFlags =
    owner.kind === 'project' ? project?.metadata?.capabilities : capabilitiesField(group)
  const serverFlagKey = capabilityFlagsKey(serverFlags)
  const ownerKey =
    owner.kind === 'project' ? `project:${owner.projectId}` : `group:${owner.groupId}`
  const ownerKeyRef = useRef(ownerKey)
  ownerKeyRef.current = ownerKey
  // A finished save applies only while this epoch still matches — a newer
  // save, or leaving and coming back to the same owner, bumps it so the
  // stale request cannot roll the new toggle back or clear its busy flag.
  const saveEpochRef = useRef(0)
  const [flags, showFlags] = useHeld(ownerKey, serverFlagKey, serverFlags)

  const [toolContent, setToolContent] = useState<unknown>(undefined)
  const [toolStatus, setToolStatus] = useState<'loading' | 'ready' | 'failed'>(
    owner.kind === 'project' ? 'loading' : 'ready',
  )
  const [toolKey, setToolKey] = useState(toolSetsKey(undefined))
  const [heldToolKey, setHeldToolKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // A panel that stays mounted (project switcher, one group then another) must
  // not keep the previous owner's error, tool rows, or a save still in flight.
  const [seenOwner, setSeenOwner] = useState(ownerKey)
  if (seenOwner !== ownerKey) {
    setSeenOwner(ownerKey)
    setError(null)
    setBusy(false)
    saveEpochRef.current += 1
    setToolContent(undefined)
    setToolKey(toolSetsKey(undefined))
    setHeldToolKey(null)
    setToolStatus(owner.kind === 'project' ? 'loading' : 'ready')
  }

  useEffect(() => {
    if (owner.kind !== 'project') {
      setToolStatus('ready')
      return
    }
    let cancelled = false
    setToolStatus('loading')
    setError(null)
    void queryProjectData(owner.projectId, {
      type: AGENT_TOOL_SETS_RECORD_TYPE,
      key: AGENT_TOOL_SETS_KEY,
    })
      .then((records) => {
        if (cancelled) return
        setToolContent(records[0]?.content)
        setToolKey(toolSetsKey(records[0]?.content))
        setHeldToolKey(null)
        setToolStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setToolStatus('failed')
        setError(extractErrorMessage(err, TOOL_SETS_FAILED))
      })
    return () => {
      cancelled = true
    }
  }, [owner.kind, ownerKey, owner.kind === 'project' ? owner.projectId : ''])

  useEffect(() => {
    if (heldToolKey === null) return
    if (heldToolKey === toolKey) setHeldToolKey(null)
  }, [heldToolKey, toolKey])

  const fail = useCallback((err: unknown) => {
    setError(extractErrorMessage(err, SAVE_FAILED))
  }, [])

  const saveFlags = useCallback(
    async (next: unknown, previous: unknown) => {
      const savedFor = ownerKey
      const epoch = ++saveEpochRef.current
      setBusy(true)
      setError(null)
      showFlags(next, capabilityFlagsKey(next))
      const empty = capabilityFlagsKey(next) === capabilityFlagsKey(undefined)
      try {
        if (owner.kind === 'project') {
          if (!project) throw new Error('This project is not available.')
          // A project update replaces metadata whole, so every other key stays.
          const { capabilities: _previous, ...rest } = (project.metadata ?? {}) as Record<
            string,
            unknown
          >
          await updateProject({
            path: { id: owner.projectId },
            body: { metadata: empty ? rest : { ...rest, capabilities: next } },
            throwOnError: true,
          })
        } else {
          // `capabilities` is the group's stored flags. The generated edit body
          // lags that field; the tools contract accepts the object, or null to clear it.
          await updateProjectsGroup({
            path: { id: owner.groupId },
            body: {
              capabilities: empty ? null : next,
            } as unknown as UpdateProjectsGroupData['body'],
            throwOnError: true,
          })
        }
      } catch (err) {
        if (ownerKeyRef.current !== savedFor || saveEpochRef.current !== epoch) return
        showFlags(previous, capabilityFlagsKey(previous))
        fail(err)
      } finally {
        if (ownerKeyRef.current === savedFor && saveEpochRef.current === epoch) setBusy(false)
      }
    },
    [fail, owner, ownerKey, project, showFlags],
  )

  const saveTools = useCallback(
    async (next: { toolSets: string[]; deviceAutomation: boolean }, previous: unknown) => {
      if (owner.kind !== 'project') return
      const savedFor = ownerKey
      const epoch = ++saveEpochRef.current
      setBusy(true)
      setError(null)
      setToolContent(next)
      setHeldToolKey(toolSetsKey(next))
      try {
        await putProjectDataRecord(owner.projectId, {
          type: AGENT_TOOL_SETS_RECORD_TYPE,
          key: AGENT_TOOL_SETS_KEY,
          content: next,
        })
      } catch (err) {
        if (ownerKeyRef.current !== savedFor || saveEpochRef.current !== epoch) return
        setToolContent(previous)
        setHeldToolKey(toolSetsKey(previous))
        fail(err)
      } finally {
        if (ownerKeyRef.current === savedFor && saveEpochRef.current === epoch) setBusy(false)
      }
    },
    [fail, owner, ownerKey],
  )

  const toggle = useCallback(
    (row: CapabilitySettingsRow, on: boolean) => {
      if (busy || row.disabled || !row.switchable) return
      if (row.action.kind === 'device') {
        void saveTools(withDeviceAutomation(toolContent, on), toolContent)
        return
      }
      if (row.action.kind === 'tool-set') {
        void saveTools(withToolSet(toolContent, row.action.id, on), toolContent)
        return
      }
      const next =
        owner.kind === 'group'
          ? withGroupCapabilityFlag(flags, row.action.key, on)
          : withProjectCapabilityFlag(
              { capabilities: flags } as Record<string, unknown>,
              row.action.key,
              on,
            ).capabilities
      void saveFlags(next, flags)
    },
    [busy, flags, owner.kind, saveFlags, saveTools, toolContent],
  )

  const inherit = useCallback(
    (row: CapabilitySettingsRow) => {
      if (busy || owner.kind !== 'project' || row.action.kind !== 'flag') return
      const next = withProjectCapabilityFlag(
        { capabilities: flags } as Record<string, unknown>,
        row.action.key,
        undefined,
      ).capabilities
      void saveFlags(next, flags)
    },
    [busy, flags, owner.kind, saveFlags],
  )

  const ready =
    projectsLoaded && groupsLoaded && (owner.kind === 'group' || toolStatus !== 'loading')
  const missing = ready && (owner.kind === 'project' ? !project : !group)
  const view =
    !ready || missing
      ? undefined
      : capabilitySettingsView({
          scope: owner.kind,
          ...(group ? { groupKind: group.type } : {}),
          ...(mainGroup ? { groupTitle: mainGroup.title } : {}),
          own: flags,
          ...(owner.kind === 'project'
            ? { inherited: mainGroup ? capabilitiesField(mainGroup) : undefined }
            : {}),
          ...(owner.kind === 'project'
            ? toolStatus === 'failed'
              ? { toolSets: { ok: false as const } }
              : { toolSets: { ok: true as const, content: toolContent } }
            : {}),
        })

  return {
    view,
    loading: !ready && !missing,
    error: missing
      ? owner.kind === 'project'
        ? 'This project is not available.'
        : 'This group is not available.'
      : error,
    busy,
    toggle,
    inherit,
  }
}
