import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DeliverySettings } from 'thefactory-tools/types'
import { saveGroupDelivery } from '../api/deliverySettingsApi'
import { extractErrorMessage } from '../api/errorMessage'
import { updateProject } from '../api/generated'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import {
  deliveryDraftOf,
  deliverySettingsOfDraft,
  deliverySettingsView,
  readDeliverySettings,
  withDeliverySettings,
} from '../utils/deliverySettings'
import { DELIVERY_SETTINGS_COPY } from '../utils/deliverySettingsConstants'
import type {
  DeliveryFormDraft,
  DeliveryOwner,
  DeliverySettingsView,
} from '../utils/deliverySettingsTypes'

export type UseDeliverySettings = {
  /** What the form shows; undefined until the owner is read. */
  view: DeliverySettingsView | undefined
  draft: DeliveryFormDraft
  change: (next: DeliveryFormDraft) => void
  /** Put the form back to what is saved. */
  reset: () => void
  /** Save the form: shown saved at once, put back with why when refused. Resolves `true` when kept. */
  save: () => Promise<boolean>
  error: string | null
}

/** A project's or a group's delivery settings, read and saved through the backend. */
export function useDeliverySettings(owner: DeliveryOwner): UseDeliverySettings {
  const { groups, refresh: refreshGroups } = useProjectsGroups()
  const { projects, refresh: refreshProjects } = useProjects()
  const project =
    owner.kind === 'project' ? projects.find((p) => p.id === owner.projectId) : undefined
  const group = owner.kind === 'group' ? groups.find((g) => g.id === owner.groupId) : undefined
  const mainGroup = project ? groups.find((g) => g.id === project.mainGroupId) : undefined
  const metadata = project?.metadata as Record<string, unknown> | undefined
  const stored = project ? readDeliverySettings(metadata) : readDeliverySettings(group)
  const [pending, setPending] = useState<DeliverySettings | undefined>()
  const saved = pending ?? stored
  const kind = owner.kind
  const [draft, setDraft] = useState<DeliveryFormDraft>(() => deliveryDraftOf(saved, kind))
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saving = useRef<Promise<boolean> | undefined>(undefined)
  const savedKey = JSON.stringify(saved ?? null)

  useEffect(() => {
    if (!touched) setDraft(deliveryDraftOf(saved, kind))
  }, [savedKey, kind, touched])

  const loaded = project !== undefined || group !== undefined
  const view = useMemo(
    () =>
      loaded
        ? deliverySettingsView({
            owner,
            title: project?.title ?? group?.title ?? '',
            ...(group ? { groupType: group.type } : {}),
            saved,
            draft,
            ...(mainGroup
              ? {
                  mainGroup: {
                    title: mainGroup.title,
                    type: mainGroup.type,
                    ...(readDeliverySettings(mainGroup)
                      ? { delivery: readDeliverySettings(mainGroup) }
                      : {}),
                  },
                }
              : {}),
          })
        : undefined,
    [loaded, owner, project, group, mainGroup, savedKey, draft],
  )

  const change = useCallback((next: DeliveryFormDraft) => {
    setTouched(true)
    setDraft(next)
  }, [])

  const reset = useCallback(() => {
    setTouched(false)
    setError(null)
    setDraft(deliveryDraftOf(saved, kind))
  }, [savedKey, kind])

  const save = useCallback((): Promise<boolean> => {
    if (saving.current) return saving.current
    if (!view?.canSave) return Promise.resolve(false)
    const next = deliverySettingsOfDraft(draft, kind)
    setPending(next)
    setTouched(false)
    setError(null)
    const write = async () => {
      if (owner.kind === 'group') {
        await saveGroupDelivery(owner.groupId, Object.keys(next).length > 0 ? next : null)
        await refreshGroups()
      } else {
        await updateProject({
          path: { id: owner.projectId },
          body: { metadata: withDeliverySettings(metadata, next) },
          throwOnError: true,
        })
        await refreshProjects()
      }
    }
    saving.current = write()
      .then(() => true)
      .catch((err: unknown) => {
        setTouched(true)
        setError(extractErrorMessage(err, DELIVERY_SETTINGS_COPY.saveFailed))
        return false
      })
      .finally(() => {
        setPending(undefined)
        saving.current = undefined
      })
    return saving.current
  }, [view, draft, kind, owner, metadata, refreshGroups, refreshProjects])

  return { view, draft, change, reset, save, error }
}
