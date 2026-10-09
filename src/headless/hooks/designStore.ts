/**
 * Each project's Design — apps, screens, drafts and built versions — and its
 * storage usage, kept in one module store so every surface showing a project's
 * design (its tab, a chip's preview) reads the same copy. Read through
 * {@link useDesign}; kept current by `design:updated`.
 */

import {
  approveDesignItem,
  createDesignApp,
  createDesignItem,
  createDesignScreen,
  deleteDesignApp,
  deleteDesignItem,
  deleteDesignScreen,
  getDesignItemContent,
  getProjectDesign,
  getProjectStorageUsage,
  getStorageUsage,
  grantProjectAppViewToken,
  renameDesignItem,
  renameDesignScreen,
  updateDesignApp,
} from '../api/generated'
import { computeRefreshDelayMs } from '../utils/viewTokenSchedule'
import type {
  DesignActions,
  DesignProjectState,
  DesignUploadInput,
  DesignViewToken,
  StorageTotalsState,
} from './designStoreTypes'

const EMPTY: DesignProjectState = {
  tree: { apps: [] },
  isLoaded: false,
  loadError: null,
  usage: undefined,
}

/** A view token is minted again this long before it runs out. */
const VIEW_TOKEN_LEAD_MS = 60_000

let byProject: Readonly<Record<string, DesignProjectState>> = {}
const epochs = new Map<string, number>()
const listeners = new Set<() => void>()
const loading = new Map<string, Promise<void>>()
const viewTokens = new Map<string, DesignViewToken>()
const minting = new Map<string, Promise<DesignViewToken>>()
let storageTotals: StorageTotalsState = { totals: undefined, error: null }

function emit(): void {
  for (const listener of listeners) listener()
}

function patch(projectId: string, change: Partial<DesignProjectState>): void {
  byProject = { ...byProject, [projectId]: { ...(byProject[projectId] ?? EMPTY), ...change } }
  emit()
}

export function subscribeDesign(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function designSnapshot(): Readonly<Record<string, DesignProjectState>> {
  return byProject
}

/** One project's state in a snapshot; empty and unloaded until it is loaded. */
export function designStateOf(
  snapshot: Readonly<Record<string, DesignProjectState>>,
  projectId: string | undefined,
): DesignProjectState {
  return (projectId && snapshot[projectId]) || EMPTY
}

/** Forget every project — for tests and a sign-out. */
export function resetDesignStore(): void {
  byProject = {}
  epochs.clear()
  loading.clear()
  viewTokens.clear()
  minting.clear()
  storageTotals = { totals: undefined, error: null }
  emit()
}

/** Load a project's design again. An answer a later load overtook is dropped; a failure keeps what was there. */
export async function refreshDesign(projectId: string): Promise<void> {
  const epoch = (epochs.get(projectId) ?? 0) + 1
  epochs.set(projectId, epoch)
  try {
    const { data } = await getProjectDesign({ path: { projectId }, throwOnError: true })
    if (epochs.get(projectId) !== epoch) return
    patch(projectId, { tree: data, isLoaded: true, loadError: null })
  } catch (err) {
    if (epochs.get(projectId) !== epoch) return
    patch(projectId, {
      isLoaded: true,
      loadError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

/**
 * Load a project's design for a surface that only shows it — a chip's preview:
 * once, however many ask at the same time, and again only when `changed`.
 */
export function ensureDesign(projectId: string, opts: { changed?: boolean } = {}): Promise<void> {
  const inFlight = loading.get(projectId)
  if (inFlight) return inFlight
  if (!opts.changed && byProject[projectId]?.isLoaded) return Promise.resolve()
  const load = refreshDesign(projectId).finally(() => loading.delete(projectId))
  loading.set(projectId, load)
  return load
}

/**
 * A view token for a project's `<img>` and `<iframe>` sources, shared by every
 * surface: minted once, kept while it is more than a minute from running out.
 * A refusal throws and is not kept.
 */
export function designViewTokenFor(projectId: string, now = Date.now()): Promise<DesignViewToken> {
  const held = viewTokens.get(projectId)
  if (held) {
    const delay = computeRefreshDelayMs({
      expiresAt: held.expiresAt,
      leadMs: VIEW_TOKEN_LEAD_MS,
      now,
    })
    if (delay !== null && delay > 0) return Promise.resolve(held)
  }
  const inFlight = minting.get(projectId)
  if (inFlight) return inFlight
  const mint = grantProjectAppViewToken({ path: { projectId }, throwOnError: true })
    .then(({ data }) => {
      viewTokens.set(projectId, data)
      return data
    })
    .finally(() => minting.delete(projectId))
  minting.set(projectId, mint)
  return mint
}

/** Every project's usage and how their total stands, as Settings shows it. */
export function storageTotalsSnapshot(): StorageTotalsState {
  return storageTotals
}

/** Read every project's usage again; a failure keeps what was there and says why. */
export async function refreshStorageTotals(): Promise<void> {
  try {
    const { data } = await getStorageUsage({ throwOnError: true })
    storageTotals = { totals: data, error: null }
  } catch (err) {
    storageTotals = {
      ...storageTotals,
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
  emit()
}

/** Load what the project keeps on this machine, and how the total stands; a failure keeps what was there. */
export async function refreshStorageUsage(projectId: string): Promise<void> {
  try {
    const { data } = await getProjectStorageUsage({ path: { projectId }, throwOnError: true })
    if (data) patch(projectId, { usage: data })
  } catch {
    return
  }
}

/**
 * What a person can do to a project's design. Each change reloads the design —
 * and, for a draft added or anything deleted, the usage — and then tells
 * `onChanged` (the reference cache), so a new `&design/…` resolves at once.
 */
export function designActionsFor(projectId: string, onChanged: () => void): DesignActions {
  const after = async <T>(made: T, usage = false): Promise<T> => {
    await Promise.all([
      refreshDesign(projectId),
      ...(usage ? [refreshStorageUsage(projectId)] : []),
    ])
    onChanged()
    return made
  }
  const path = { projectId }
  return {
    createApp: async (name, kind) =>
      after((await createDesignApp({ path, body: { name, kind }, throwOnError: true })).data),
    updateApp: async (appId, change) =>
      after(
        (await updateDesignApp({ path: { ...path, appId }, body: change, throwOnError: true }))
          .data,
      ),
    deleteApp: async (appId) => {
      await deleteDesignApp({ path: { ...path, appId }, throwOnError: true })
      await after(undefined, true)
    },
    createScreen: async (appId, name) =>
      after((await createDesignScreen({ path, body: { appId, name }, throwOnError: true })).data),
    renameScreen: async (screenId, name) =>
      after(
        (
          await renameDesignScreen({
            path: { ...path, screenId },
            body: { name },
            throwOnError: true,
          })
        ).data,
      ),
    deleteScreen: async (screenId) => {
      await deleteDesignScreen({ path: { ...path, screenId }, throwOnError: true })
      await after(undefined, true)
    },
    uploadDraft: async (screenId, file: DesignUploadInput, name) =>
      after(
        (
          await createDesignItem({
            path,
            body: { screenId, ...(name ? { name } : {}), source: { type: 'upload', ...file } },
            throwOnError: true,
          })
        ).data,
        true,
      ),
    addProjectFileDraft: async (screenId, filePath, name) =>
      after(
        (
          await createDesignItem({
            path,
            body: {
              screenId,
              ...(name ? { name } : {}),
              source: { type: 'project-file', path: filePath },
            },
            throwOnError: true,
          })
        ).data,
        true,
      ),
    addLinkDraft: async (screenId, url, name) =>
      after(
        (
          await createDesignItem({
            path,
            body: { screenId, ...(name ? { name } : {}), source: { type: 'link', url } },
            throwOnError: true,
          })
        ).data,
        true,
      ),
    renameItem: async (itemId, name) =>
      after(
        (await renameDesignItem({ path: { ...path, itemId }, body: { name }, throwOnError: true }))
          .data,
      ),
    approveItem: async (itemId, approved) =>
      after(
        (
          await approveDesignItem({
            path: { ...path, itemId },
            body: { approved },
            throwOnError: true,
          })
        ).data,
      ),
    deleteItem: async (itemId) => {
      await deleteDesignItem({ path: { ...path, itemId }, throwOnError: true })
      await after(undefined, true)
    },
    fetchContent: async (itemId, responseType) =>
      (
        await getDesignItemContent({
          path: { ...path, itemId },
          responseType,
          throwOnError: true,
        } as never)
      ).data as never,
    mintViewToken: async () => (await grantProjectAppViewToken({ path, throwOnError: true })).data,
  }
}
