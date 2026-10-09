import { useCallback, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ChatContext, ResourceLink } from 'thefactory-tools/types'
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  DESIGN_TEXT,
  FILE_DROP_ZONE_ATTRIBUTE,
  attachmentUploadError,
  designCompareBaseline,
  designDiscussDraft,
  designScreenItems,
  designSelection,
  isFileDrag,
  useChats,
  projectShowsShellTab,
  useDesign,
  useDesignViewToken,
  useProjects,
  type ShellTabProjectFlags,
} from '../../../headless'
import type { DesignAppKind, DesignItem, DesignScreenTree } from '../../../headless/api'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import Spinner from '../../primitives/Spinner'
import { IconChat, IconClose, IconPalette } from '../../icons'
import { arrayBufferToBase64 } from '../../utils/uploadEncoding'
import DesignAddDraft from './DesignAddDraft'
import DesignCompareOverlay from './DesignCompareOverlay'
import DesignItemCard from './DesignItemCard'
import DesignItemViewer from './DesignItemViewer'
import DesignSidebar, { NewAppFields } from './DesignSidebar'
import { DesignStorageMeter, DesignStorageWarning } from './DesignStorageMeter'
import type { DesignDraftSource, DesignUploadRow } from './designWebTypes'

export type DesignViewProps = {
  projectId: string | undefined
  /** Opens an in-app link — the project chat a Discuss puts the reference in. */
  onOpenResource?: (link: ResourceLink) => void
}

const NEW_APP = '__new__'

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Asks where drafts go when there is no screen yet: an app (picked or new) and a screen. */
function NewScreenForm({
  apps,
  pending,
  onCreate,
  onCancel,
}: {
  apps: { id: string; name: string }[]
  pending: DesignDraftSource | undefined
  onCreate: (target: {
    appId?: string
    appName?: string
    kind: DesignAppKind
    screenName: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const [appId, setAppId] = useState(apps[0]?.id ?? NEW_APP)
  const [appName, setAppName] = useState('')
  const [kind, setKind] = useState<DesignAppKind>('product')
  const [screenName, setScreenName] = useState('')
  const [busy, setBusy] = useState(false)
  const isNew = appId === NEW_APP
  const valid = screenName.trim() !== '' && (!isNew || appName.trim() !== '')
  const waiting =
    pending?.type === 'files'
      ? `${pending.files.length} ${pending.files.length === 1 ? 'file' : 'files'}`
      : pending?.type === 'paths'
        ? `${pending.paths.length} project ${pending.paths.length === 1 ? 'file' : 'files'}`
        : pending?.type === 'link'
          ? 'a link'
          : undefined
  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-(--border-subtle) p-4"
      style={{ background: 'var(--surface-raised)' }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid) return
        setBusy(true)
        try {
          await onCreate({
            ...(isNew ? { appName: appName.trim() } : { appId }),
            kind,
            screenName: screenName.trim(),
          })
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="text-sm font-semibold text-(--text-primary)">
        {waiting ? `Which screen are ${waiting} for?` : DESIGN_TEXT.addDraft}
      </div>
      {apps.length > 0 ? (
        <NativeSelect
          size="sm"
          aria-label="App"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
        >
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
          <option value={NEW_APP}>New app…</option>
        </NativeSelect>
      ) : null}
      {isNew ? (
        <NewAppFields name={appName} kind={kind} onName={setAppName} onKind={setKind} autoFocus />
      ) : null}
      <Input
        size="sm"
        placeholder="Screen name, e.g. Login"
        aria-label="Screen name"
        value={screenName}
        autoFocus={!isNew}
        onChange={(e) => setScreenName(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={!valid} loading={busy}>
          {waiting ? 'Add here' : DESIGN_TEXT.addScreen}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Column({
  title,
  count,
  children,
  actions,
}: {
  title: string
  count: number
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-semibold text-(--text-primary)">
          {title} <span className="font-normal text-(--text-muted)">{count}</span>
        </h3>
        {actions ? <div className="ml-auto">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

/**
 * A project's Design tab: its apps and screens on the left; a screen's drafts —
 * one of them the approved design — beside the versions runs built, newest
 * first. Everything opens in a viewer as stored; a built version compares with
 * the approved design or the one before it; files dropped anywhere become
 * drafts. Honours `?screen=&item=` links.
 */
export default function DesignView({ projectId, onOpenResource }: DesignViewProps) {
  const design = useDesign(projectId)
  const { token } = useDesignViewToken(projectId)
  const { projects } = useProjects()
  const { updateDraftState } = useChats()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState<string | undefined>(undefined)
  const [uploads, setUploads] = useState<DesignUploadRow[]>([])
  const [asking, setAsking] = useState<{ pending: DesignDraftSource | undefined } | undefined>(
    undefined,
  )
  const [dragging, setDragging] = useState(false)
  const [comparing, setComparing] = useState<string | undefined>(undefined)

  const selection = designSelection(design.tree, {
    screen: params.get('screen'),
    item: params.get('item'),
  })
  const selected = selection.screenId ? design.findScreen(selection.screenId) : undefined
  const viewing = selection.itemId ? design.findItem(selection.itemId)?.item : undefined
  const srcOf = useCallback(
    (itemId: string) => (token ? design.contentUrl(itemId, token) : undefined),
    [token, design],
  )

  const run = useCallback(async (change: () => Promise<unknown>): Promise<boolean> => {
    try {
      await change()
      setError(undefined)
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    }
  }, [])

  const selectScreen = (screenId: string) => setParams({ screen: screenId })
  const openItem = (item: DesignItem) => setParams({ screen: item.screenId, item: item.id })
  const closeItem = () => {
    const next = new URLSearchParams(params)
    next.delete('item')
    setParams(next, { replace: true })
  }

  const discuss = (ref: { screenId: string; itemId?: string }) => {
    if (!projectId) return
    const context: ChatContext = { type: 'PROJECT', projectId }
    updateDraftState(context, (prev) => ({ ...prev, text: designDiscussDraft(prev.text, ref) }))
    onOpenResource?.({ kind: 'chat', context })
  }

  const uploadFile = async (screenId: string, file: File) => {
    const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tooLarge = attachmentUploadError(file, CHAT_ATTACHMENT_MAX_BYTES)
    if (tooLarge) {
      setUploads((u) => [
        ...u,
        { key, name: file.name, screenId, status: 'failed', error: tooLarge },
      ])
      return
    }
    setUploads((u) => [...u, { key, name: file.name, screenId, status: 'uploading' }])
    try {
      const contentBase64 = arrayBufferToBase64(await file.arrayBuffer())
      await design.uploadDraft(screenId, {
        name: file.name,
        contentBase64,
        ...(file.type ? { mediaType: file.type } : {}),
      })
      setUploads((u) => u.filter((r) => r.key !== key))
    } catch (err) {
      setUploads((u) =>
        u.map((r) => (r.key === key ? { ...r, status: 'failed', error: errorText(err) } : r)),
      )
    }
  }

  const addDrafts = async (screenId: string, source: DesignDraftSource) => {
    if (source.type === 'files') {
      await Promise.all(source.files.map((f) => uploadFile(screenId, f)))
    } else if (source.type === 'paths') {
      for (const path of source.paths) await run(() => design.addProjectFileDraft(screenId, path))
    } else {
      await run(() => design.addLinkDraft(screenId, source.url, source.name))
    }
  }

  const addOrAsk = (source: DesignDraftSource) => {
    if (selected) void addDrafts(selected.screen.id, source)
    else setAsking({ pending: source })
  }

  const createTarget = async (target: {
    appId?: string
    appName?: string
    kind: DesignAppKind
    screenName: string
  }) => {
    let screenId: string | undefined
    const ok = await run(async () => {
      const appId = target.appId ?? (await design.createApp(target.appName ?? '', target.kind)).id
      screenId = (await design.createScreen(appId, target.screenName)).id
    })
    if (!ok || !screenId) return
    const pending = asking?.pending
    setAsking(undefined)
    selectScreen(screenId)
    if (pending) await addDrafts(screenId, pending)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer?.types)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dragging) setDragging(true)
  }
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    setDragging(false)
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer?.types)) return
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length > 0) addOrAsk({ type: 'files', files })
  }

  if (!projectId) return null
  const metadata = projects.find((p) => p.id === projectId)?.metadata as ShellTabProjectFlags
  if (!projectShowsShellTab('design', metadata)) {
    return (
      <div className="flex h-full flex-col items-start gap-2 p-6">
        <h2 className="text-base font-semibold">{DESIGN_TEXT.notUiTitle}</h2>
        <p className="max-w-md text-sm text-(--text-secondary)">{DESIGN_TEXT.notUiBody}</p>
      </div>
    )
  }

  const screen = selected?.screen
  const items = screen ? designScreenItems(screen) : { designs: [], built: [] }
  const comparingItem = comparing ? design.findItem(comparing)?.item : undefined
  const baseline = screen && comparing ? designCompareBaseline(screen, comparing) : undefined
  const screenUploads = uploads.filter((u) => u.screenId === screen?.id)

  const card = (item: DesignItem, opts: { current?: boolean; s: DesignScreenTree }) => (
    <DesignItemCard
      key={item.id}
      projectId={projectId}
      item={item}
      src={srcOf(item.id)}
      {...(opts.current ? { current: true } : {})}
      onOpen={() => openItem(item)}
      onDiscuss={() => discuss({ screenId: item.screenId, itemId: item.id })}
      onRename={(name) => run(() => design.renameItem(item.id, name))}
      onDelete={() => run(() => design.deleteItem(item.id))}
      {...(item.kind === 'design'
        ? { onApprove: (approved: boolean) => run(() => design.approveItem(item.id, approved)) }
        : {})}
      {...(item.kind === 'built' && designCompareBaseline(opts.s, item.id)
        ? { onCompare: () => setComparing(item.id) }
        : {})}
      onOpenRun={(runId) =>
        navigate(
          `/projects/${encodeURIComponent(projectId)}/process-runs/${encodeURIComponent(runId)}`,
        )
      }
    />
  )

  return (
    <div
      {...{ [FILE_DROP_ZONE_ATTRIBUTE]: '' }}
      className="relative flex h-full min-h-0 flex-col"
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-(--border-subtle) px-4 py-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-(--text-primary)">
          <IconPalette className="h-4 w-4" />
          Design
        </h2>
        <span className="ml-auto">
          <DesignStorageMeter usage={design.usage} />
        </span>
      </header>
      <div className="flex shrink-0 flex-col gap-2 px-4 pt-2 empty:hidden">
        <DesignStorageWarning usage={design.usage} />
        {error ? (
          <Alert>
            <span className="flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setError(undefined)}>
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </span>
          </Alert>
        ) : null}
        {design.loadError ? <Alert>{design.loadError.message}</Alert> : null}
      </div>
      {!design.isLoaded ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={20} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="shrink-0 overflow-auto border-b border-(--border-subtle) p-3 md:w-64 md:border-r md:border-b-0">
            <DesignSidebar
              design={design}
              selectedScreenId={screen?.id}
              onSelectScreen={selectScreen}
              run={run}
            />
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
            {asking ? (
              <div className="flex justify-center py-6">
                <NewScreenForm
                  apps={design.tree.apps}
                  pending={asking.pending}
                  onCreate={createTarget}
                  onCancel={() => setAsking(undefined)}
                />
              </div>
            ) : !screen ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <IconPalette className="h-8 w-8" />
                <div className="text-[15px] font-semibold text-(--text-primary)">
                  {design.tree.apps.length === 0 ? DESIGN_TEXT.emptyTitle : DESIGN_TEXT.noScreen}
                </div>
                <p className="max-w-md text-sm text-(--text-secondary)">{DESIGN_TEXT.emptyBody}</p>
                <DesignAddDraft onAdd={(source) => setAsking({ pending: source })} />
                <Button variant="ghost" onClick={() => setAsking({ pending: undefined })}>
                  {design.tree.apps.length === 0
                    ? `${DESIGN_TEXT.addApp} and a screen`
                    : DESIGN_TEXT.addScreen}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-[15px] font-semibold text-(--text-primary)">
                    <span className="text-(--text-secondary)">{selected?.app.name} › </span>
                    {screen.name}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => discuss({ screenId: screen.id })}
                  >
                    <IconChat className="h-3.5 w-3.5" />
                    {DESIGN_TEXT.discuss}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Column
                    title={DESIGN_TEXT.designs}
                    count={items.designs.length}
                    actions={<DesignAddDraft compact onAdd={addOrAsk} />}
                  >
                    {screenUploads.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {screenUploads.map((u) => (
                          <li
                            key={u.key}
                            className="flex items-center gap-2 rounded-md border border-(--border-subtle) px-2 py-1.5 text-[12.5px]"
                          >
                            {u.status === 'uploading' ? <Spinner size={14} /> : null}
                            <span className="min-w-0 flex-1 truncate">{u.name}</span>
                            {u.status === 'failed' ? (
                              <>
                                <span className="text-(--status-stuck-soft-fg)">{u.error}</span>
                                <button
                                  type="button"
                                  aria-label={`Dismiss ${u.name}`}
                                  onClick={() =>
                                    setUploads((all) => all.filter((r) => r.key !== u.key))
                                  }
                                >
                                  <IconClose className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-(--text-muted)">Uploading…</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {items.designs.length === 0 ? (
                      <p className="rounded-md border border-dashed border-(--border-default) px-3 py-6 text-center text-[12.5px] text-(--text-muted)">
                        {DESIGN_TEXT.noDesigns}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {items.designs.map((item) => card(item, { s: screen }))}
                      </ul>
                    )}
                  </Column>
                  <Column title={DESIGN_TEXT.built} count={items.built.length}>
                    {items.built.length === 0 ? (
                      <p className="rounded-md border border-dashed border-(--border-default) px-3 py-6 text-center text-[12.5px] text-(--text-muted)">
                        {DESIGN_TEXT.noBuilt}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {items.built.map((item, i) => card(item, { current: i === 0, s: screen }))}
                      </ul>
                    )}
                  </Column>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
      {dragging ? (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-(--accent-primary) bg-(--accent-primary)/10">
          <span className="rounded-lg bg-(--accent-primary) px-4 py-2 text-sm font-medium text-white shadow-lg">
            {screen ? `${DESIGN_TEXT.dropHere} — ${screen.name}` : DESIGN_TEXT.dropHere}
          </span>
        </div>
      ) : null}
      <DesignItemViewer
        item={viewing}
        src={viewing ? srcOf(viewing.id) : undefined}
        onClose={closeItem}
        actions={
          viewing ? (
            <div className="flex gap-1.5">
              {viewing.kind === 'design' ? (
                <Button
                  size="sm"
                  variant={viewing.approved ? 'secondary' : 'primary'}
                  onClick={() => void run(() => design.approveItem(viewing.id, !viewing.approved))}
                >
                  {viewing.approved ? DESIGN_TEXT.unapprove : DESIGN_TEXT.approve}
                </Button>
              ) : null}
              {viewing.kind === 'built' && screen && designCompareBaseline(screen, viewing.id) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    closeItem()
                    setComparing(viewing.id)
                  }}
                >
                  {DESIGN_TEXT.compare}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => discuss({ screenId: viewing.screenId, itemId: viewing.id })}
              >
                <IconChat className="h-3.5 w-3.5" />
                {DESIGN_TEXT.discuss}
              </Button>
            </div>
          ) : undefined
        }
      />
      <DesignCompareOverlay
        built={comparingItem}
        baseline={baseline}
        srcOf={srcOf}
        onClose={() => setComparing(undefined)}
      />
    </div>
  )
}
