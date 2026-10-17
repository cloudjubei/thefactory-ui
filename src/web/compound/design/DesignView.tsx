import { useCallback, useEffect, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ChatContext, ResourceLink } from 'thefactory-tools/types'
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  DESIGN_TEXT,
  FILE_DROP_ZONE_ATTRIBUTE,
  attachmentUploadError,
  designDiscussDraft,
  designSelection,
  isFileDrag,
  projectShowsShellTab,
  useChats,
  useDesign,
  useDesignPlayground,
  useDesignViewToken,
  useProjects,
  type DesignProposeEntry,
  type DesignShown,
  type ShellTabProjectFlags,
} from '../../../headless'
import type { DesignEntryTarget, DesignProposal } from '../../../headless/api'
import Alert from '../../primitives/Alert'
import Spinner from '../../primitives/Spinner'
import { IconClose, IconPalette } from '../../icons'
import { arrayBufferToBase64 } from '../../utils/uploadEncoding'
import DesignAddDraft from './DesignAddDraft'
import DesignCompareOverlay, { type DesignCompareSide } from './DesignCompareOverlay'
import DesignFileViewer from './DesignFileViewer'
import DesignPage, { type DesignNavigation } from './DesignPage'
import DesignPlayground, { type DesignPlaygroundAt } from './DesignPlayground'
import type { DesignCellRef } from './DesignScreenGrid'
import { DesignStorageMeter, DesignStorageWarning } from './DesignStorageMeter'
import type { DesignDraftSource } from './designWebTypes'

export type DesignViewProps = {
  projectId: string | undefined
  /** Opens an in-app link — the project chat a Discuss puts the reference in. */
  onOpenResource?: (link: ResourceLink) => void
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function isHtml(name: string): boolean {
  return /\.html?$/i.test(name)
}

/**
 * A project's Design tab, wired to the project's design: the page, its address
 * (`?app=&tab=&screen=&state=&variant=&proposal=`), the viewer and the compare,
 * and proposing — files dropped anywhere, uploaded, picked from the project, or
 * linked arrive as a proposal for what is selected.
 */
export default function DesignView({ projectId, onOpenResource }: DesignViewProps) {
  const design = useDesign(projectId)
  const { token } = useDesignViewToken(projectId)
  const { projects } = useProjects()
  const { updateDraftState } = useChats()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState<string | undefined>(undefined)
  const [uploading, setUploading] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState<DesignShown | undefined>(undefined)
  const [comparing, setComparing] = useState<
    { current: DesignCompareSide; proposed: DesignCompareSide } | undefined
  >(undefined)

  const selection = designSelection(design.index, {
    app: params.get('app'),
    tab: params.get('tab'),
    screen: params.get('screen'),
    state: params.get('state'),
    variant: params.get('variant'),
    proposal: params.get('proposal'),
  })
  const playground = useDesignPlayground(projectId, { open: selection.tab === 'playground' })
  const [cell, setCell] = useState<DesignCellRef | undefined>(undefined)
  useEffect(() => {
    setCell(
      selection.stateId && selection.variant
        ? { stateId: selection.stateId, variant: selection.variant }
        : undefined,
    )
  }, [selection.stateId, selection.variant, selection.screenId])

  const srcOf = useCallback(
    (shown: DesignShown) =>
      token
        ? design.contentUrl(shown.ref, {
            viewToken: token,
            ...(shown.caseQuery ? { caseQuery: shown.caseQuery } : {}),
          })
        : undefined,
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

  const navigate = (to: DesignNavigation) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(to)) if (value) next.set(key, value)
    setParams(next)
  }

  /** The Playground's place, kept in the address so a reload or a link opens it there. */
  const onPlaygroundMove = useCallback(
    (at: DesignPlaygroundAt) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (at.address) next.set('at', at.address)
          else next.delete('at')
          next.set('theme', at.theme)
          next.set('device', at.device)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const discuss = (ref: { screenId: string; stateId?: string }) => {
    if (!projectId) return
    const context: ChatContext = { type: 'PROJECT', projectId }
    updateDraftState(context, (prev) => ({ ...prev, text: designDiscussDraft(prev.text, ref) }))
    onOpenResource?.({ kind: 'chat', context })
  }

  /** Where proposed files go: the selected cell's state, else the selected screen, else nowhere yet. */
  const target = (): { target?: DesignEntryTarget; variant?: string } => {
    if (selection.tab !== 'current' || !selection.screenId) return {}
    if (cell) {
      return {
        target: {
          screenId: selection.screenId,
          ...(cell.stateId
            ? { stateId: cell.stateId }
            : cell.stateName
              ? { stateName: cell.stateName }
              : {}),
        },
        variant: cell.variant,
      }
    }
    return { target: { screenId: selection.screenId } }
  }

  const propose = async (source: DesignDraftSource) => {
    const appId = selection.appId
    if (!appId) {
      setError('Add an app first — a proposal belongs to an app.')
      return
    }
    const where = target()
    const at = {
      ...(where.target ? { target: where.target } : {}),
      ...(where.variant ? { variant: where.variant } : {}),
    }
    let made: string | undefined
    if (source.type === 'link') {
      await run(async () => {
        made = (
          await design.propose({
            appId,
            title: source.name || source.url,
            entries: [{ ...at, source: { type: 'link', url: source.url } }],
          })
        ).id
      })
    } else if (source.type === 'paths') {
      const html = source.paths.filter(isHtml)
      const rest = source.paths.filter((p) => !isHtml(p))
      await run(async () => {
        for (const path of html) {
          made = (
            await design.proposeDraft({
              appId,
              source: { type: 'project-file', path },
              ...(where.target ? { target: where.target } : {}),
            })
          )[0]?.id
        }
        if (rest.length) {
          made = (
            await design.propose({
              appId,
              title: rest.length === 1 ? rest[0]!.split('/').pop()! : `${rest.length} files`,
              entries: rest.map((path) => ({ ...at, source: { type: 'project-file', path } })),
            })
          ).id
        }
      })
    } else {
      const refused = source.files
        .map((f) => attachmentUploadError(f, CHAT_ATTACHMENT_MAX_BYTES))
        .find(Boolean)
      if (refused) {
        setError(refused)
        return
      }
      setUploading(source.files.length)
      try {
        await run(async () => {
          const encoded = await Promise.all(
            source.files.map(async (f) => ({
              type: 'upload' as const,
              name: f.name,
              contentBase64: arrayBufferToBase64(await f.arrayBuffer()),
              ...(f.type ? { mediaType: f.type } : {}),
            })),
          )
          for (const file of encoded.filter((f) => isHtml(f.name))) {
            made = (
              await design.proposeDraft({
                appId,
                source: file,
                ...(where.target ? { target: where.target } : {}),
              })
            )[0]?.id
          }
          const images = encoded.filter((f) => !isHtml(f.name))
          if (images.length) {
            const entries: DesignProposeEntry[] = images.map((file) => ({ ...at, source: file }))
            made = (
              await design.propose({
                appId,
                title: images.length === 1 ? images[0]!.name : `${images.length} files`,
                entries,
              })
            ).id
          }
        })
      } finally {
        setUploading(0)
      }
    }
    if (made) navigate({ app: appId, tab: 'proposals', proposal: made })
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
    if (files.length > 0) void propose({ type: 'files', files })
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
        {uploading > 0 ? (
          <span className="flex items-center gap-2 text-[12.5px] text-(--text-secondary)">
            <Spinner size={14} /> Uploading {uploading} {uploading === 1 ? 'file' : 'files'}…
          </span>
        ) : null}
      </div>
      {!design.isLoaded ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={20} />
        </div>
      ) : (
        <DesignPage
          index={design.index}
          selection={selection}
          cell={cell}
          onCell={setCell}
          onNavigate={navigate}
          srcOf={srcOf}
          actions={design}
          run={run}
          onOpen={setViewing}
          onCompare={(current, proposed) =>
            setComparing({
              current: { shown: current, label: DESIGN_TEXT.current },
              proposed: { shown: proposed, label: DESIGN_TEXT.proposed },
            })
          }
          onDiscuss={discuss}
          proposeSlot={<DesignAddDraft compact onAdd={(source) => void propose(source)} />}
          {...(playground.status && playground.status.status !== 'none' && selection.appId
            ? {
                playgroundSlot: (
                  <DesignPlayground
                    index={design.index}
                    appId={selection.appId}
                    status={playground.status}
                    frameSrc={playground.frameUrl}
                    initial={{
                      ...(params.get('at') ? { address: params.get('at')! } : {}),
                      ...(params.get('theme') === 'dark' ? { theme: 'dark' as const } : {}),
                      ...(params.get('device') === 'phone' ? { device: 'phone' as const } : {}),
                    }}
                    onChange={onPlaygroundMove}
                    onRetry={playground.retry}
                    onSave={async (input) => {
                      let made: DesignProposal | undefined
                      await run(async () => {
                        made = await design.savePlaygroundState({
                          appId: selection.appId!,
                          ...input,
                        })
                      })
                      return made
                    }}
                    onOpenProposal={(proposal) =>
                      navigate({ app: selection.appId!, tab: 'proposals', proposal })
                    }
                  />
                ),
              }
            : {})}
        />
      )}
      {dragging ? (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-(--accent-primary) bg-(--accent-primary)/10">
          <span className="rounded-lg bg-(--accent-primary) px-4 py-2 text-sm font-medium text-white shadow-lg">
            {DESIGN_TEXT.dropHere}
          </span>
        </div>
      ) : null}
      <DesignFileViewer
        shown={viewing}
        src={viewing ? srcOf(viewing) : undefined}
        onClose={() => setViewing(undefined)}
      />
      <DesignCompareOverlay
        current={comparing?.current}
        proposed={comparing?.proposed}
        srcOf={srcOf}
        onClose={() => setComparing(undefined)}
      />
    </div>
  )
}
