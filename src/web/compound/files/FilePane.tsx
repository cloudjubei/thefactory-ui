import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOptionalFiles } from '../../../headless/contexts/FilesContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import type { FormEvent, ReactNode } from 'react'

import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import Tooltip from '../../primitives/Tooltip'
import { IconCopy, IconDelete, IconEdit, IconSave } from '../../icons'

import { default as FilePaneHeader } from './FilePaneHeader'
import FileMergeDialog from './FileMergeDialog'
import type { FileMergeInput } from '../../../headless/hooks/useFileMerge'
import { default as ImageViewer } from './ImageViewer'
import { default as PdfViewer } from './PdfViewer'
import VideoViewer from './VideoViewer'
import { default as MarkdownEditor, MARKDOWN_PANE_OPTIONS } from '../MarkdownEditor'
import type { MarkdownEditorPaneView } from '../MarkdownEditor'
import { default as HtmlEditor } from './HtmlEditor'
import type { FileInfoData } from './FileInfoButton'
import { classifyFileByExtension, type FilePaneKind } from '../../../headless/utils/filePaneKind'
import type { PendingFileChange } from '../../../headless/utils/pendingFileChange'
import { revealTextLine } from '../../utils/revealTextLine'
import {
  retainedReferences,
  saveRetainedMarkdown,
  shiftRetainedReferences,
} from './retainedMarkdownReferences'

export { classifyFileByExtension }
export type { FilePaneKind }

export type FilePaneProps = {
  filePath: string | null
  fileName?: string
  fileSize?: number | null
  /** Text content for `markdown`/`text` files. `null` while loading or for non-text. */
  content: string | null
  isContentLoading?: boolean
  contentError?: string | null
  /**
   * Persists the working draft. Throws to surface an error to the user.
   * Without it the file is shown to read: no Save, and its text cannot change.
   */
  onWrite?: (path: string, content: string) => Promise<void>
  /** Renames the current file. Throws to surface an error. Without it, no Rename. */
  onRename?: (from: string, to: string) => Promise<void>
  /** Deletes the current file. Throws to surface an error. Without it, no Delete. */
  onDelete?: (path: string) => Promise<void>
  /**
   * Returns a URL the image, PDF or video viewer can load. For video, return
   * the signed media URL directly so the browser can stream byte ranges;
   * images and PDFs may also use blob or data URLs.
   * Called only when the current file's kind is `image`, `pdf` or `video`.
   */
  getBinaryUrl?: (path: string) => Promise<string>
  /**
   * Disposes of a URL returned by `getBinaryUrl`. Useful for blob-URL revocation.
   * Not called for `data:` URLs.
   */
  revokeBinaryUrl?: (url: string) => void
  /** Optional override; defaults to extension-based classification. */
  classifyFile?: (path: string | null | undefined) => FilePaneKind
  /**
   * Full file metadata. Powers the info button in the header (path / size /
   * type / mtime / ctime callout) and the fallback info card for the
   * `binary` kind. The header's info button is only rendered when this is
   * provided.
   */
  fileInfo?: FileInfoData
  /** Opens a text file scrolled to this 1-based line, selected — where a search result matched. */
  focusLine?: number
  /** Which panes a markdown or html file opens with. Defaults to both. */
  initialPaneView?: MarkdownEditorPaneView
  /** A small line over the name in the header: where the file is from, in a popup. */
  headerCaption?: string
  /** After the header's tools: a popup's own buttons. */
  headerTrailing?: ReactNode
  /** Override the callout's built-in merge review for the displayed disk version and canonical draft. */
  onReviewFileChange?: (change: PendingFileChange, draft: string) => void
}

type ModalRoute = { kind: 'rename'; from: string } | { kind: 'delete'; path: string } | null

export function FilePane({
  filePath,
  fileName,
  fileSize,
  content,
  isContentLoading = false,
  contentError,
  onWrite,
  onRename,
  onDelete,
  getBinaryUrl,
  revokeBinaryUrl,
  classifyFile = classifyFileByExtension,
  fileInfo,
  focusLine,
  initialPaneView = 'both',
  headerCaption,
  headerTrailing,
  onReviewFileChange,
}: FilePaneProps) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [merge, setMerge] = useState<{
    input: FileMergeInput
    change: PendingFileChange
    save: boolean
  } | null>(null)
  const [modal, setModal] = useState<ModalRoute>(null)
  const [paneView, setPaneView] = useState<MarkdownEditorPaneView>(initialPaneView)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [blobError, setBlobError] = useState<string | null>(null)

  const kind = useMemo(() => classifyFile(filePath), [classifyFile, filePath])
  const resolvedName = fileName ?? filePath?.split('/').pop() ?? ''

  // Reset edit state synchronously when the user switches files, so we never
  // render the previous file's text under the new header while the next
  // file's content is in flight. The content-sync effect below picks up the
  // new content as soon as it arrives.
  useEffect(() => {
    setDraft('')
    setSaveError(null)
    setMerge(null)
  }, [filePath])

  // A markdown file is edited with its references as a person types them —
  // `#3.2`, `&qa-login` — and saved with them as ids again. What the file
  // already said in typed form (a `#12` meaning an issue) is left as it is.
  const references = useReferenceRendering()?.references
  const typesReferences = kind === 'markdown' && references !== undefined
  const shown = useMemo(
    () => (content === null || !typesReferences ? content : references.toTyped(content)),
    [content, typesReferences, references],
  )
  const files = useOptionalFiles()
  const reportFileDraft = files?.reportFileDraft
  const tracksSelection = !!filePath && files?.selectedPath === filePath
  const diskBase = tracksSelection && files?.isDeletedOnDisk ? null : content

  // Keep mine updates the disk base for conflict detection, not the text
  // against which the editor resolves references in the retained draft.
  const [keptDraft, setKeptDraft] = useState<{
    path: string | null
    diskBase: string | null
    typed: string
    refs: ReturnType<typeof retainedReferences>
  } | null>(null)
  const kept = keptDraft?.path === filePath && keptDraft.diskBase === diskBase ? keptDraft : null
  const toSave = useCallback(
    (text: string) => {
      if (kept && kind === 'markdown') {
        return saveRetainedMarkdown(text, kept.refs, references?.canonicalize)
      }
      return typesReferences && content !== null ? references.canonicalize(text, content) : text
    },
    [typesReferences, references, content, kept, kind],
  )

  // A new version of the file replaces the draft; the same file reading
  // differently once its references load leaves an edited draft alone.
  const shownRef = useRef<{
    content: string | null
    diskBase: string | null
    shown: string | null
  }>({
    content: null,
    diskBase: null,
    shown: null,
  })
  useEffect(() => {
    shownRef.current = { content: null, diskBase: null, shown: null }
  }, [filePath])
  useEffect(() => {
    const before = shownRef.current
    shownRef.current = { content, diskBase, shown }
    if (kept) return
    if (keptDraft) setKeptDraft(null)
    if (shown === null) {
      if (before.content !== null) setDraft('')
      return
    }
    if (before.content !== content || before.diskBase !== diskBase) setDraft(shown)
    else setDraft((d) => (d === before.shown ? shown : d))
  }, [filePath, content, diskBase, shown, kept, keptDraft])

  const isText = kind === 'text' || kind === 'markdown' || kind === 'html'
  const readOnly = !onWrite
  // A retained Markdown draft can look identical to the remote in the
  // editor while storing different references; a deleted-on-disk file stays
  // dirty until recreated on save.
  const isDirty = isText && shown !== null && (kept ? toSave(draft) !== diskBase : draft !== shown)
  const pendingChange = tracksSelection && !readOnly && isText ? files?.pendingFileChange : null
  const checkingChange = tracksSelection && files?.isCheckingFileChange
  const changeCheckFailed = tracksSelection && !readOnly && isText && files?.fileChangeCheckFailed
  const hasUncheckedFileChange = tracksSelection ? files?.hasUncheckedFileChange : undefined
  useEffect(() => {
    if (!tracksSelection || !filePath || readOnly || !isText) return
    reportFileDraft?.(filePath, isDirty ? toSave(draft) : null)
  }, [tracksSelection, filePath, reportFileDraft, readOnly, isText, isDirty, draft, toSave])
  useEffect(() => {
    if (!tracksSelection || !filePath || readOnly || !isText) return
    return () => reportFileDraft?.(filePath, null)
  }, [tracksSelection, filePath, reportFileDraft, readOnly, isText])

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const editMarkdown = (next: string) => {
    if (kept) {
      const editor = editorRef.current
      const caret = editor?.value === next ? editor.selectionStart : undefined
      setKeptDraft({
        ...kept,
        typed: next,
        refs: shiftRetainedReferences(kept.refs, kept.typed, next, caret),
      })
    }
    setDraft(next)
  }
  const revealedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!filePath || focusLine === undefined || isContentLoading || shown === null) return
    if (draft !== shown) return
    const key = `${filePath}#${focusLine}`
    if (revealedRef.current === key || !editorRef.current) return
    revealedRef.current = key
    revealTextLine(editorRef.current, focusLine)
  }, [filePath, focusLine, isContentLoading, shown, draft])

  useEffect(() => {
    if (!filePath || !getBinaryUrl) return
    if (kind !== 'image' && kind !== 'pdf' && kind !== 'video') {
      setBlobUrl(null)
      setBlobError(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    setBlobUrl(null)
    setBlobError(null)
    getBinaryUrl(filePath)
      .then((url) => {
        if (cancelled) {
          if (revokeBinaryUrl) revokeBinaryUrl(url)
          return
        }
        createdUrl = url
        setBlobUrl(url)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setBlobError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
      if (createdUrl && revokeBinaryUrl) revokeBinaryUrl(createdUrl)
    }
  }, [filePath, kind, getBinaryUrl, revokeBinaryUrl])

  const persist = async (path: string, text: string) => {
    if (!onWrite) return
    setSaving(true)
    setSaveError(null)
    try {
      await onWrite(path, text)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const retainDraft = (path: string, nextDiskBase: string | null, canonical: string) => {
    const toTyped = typesReferences ? references.toTyped : (value: string) => value
    const typed = toTyped(canonical)
    setKeptDraft({
      path,
      diskBase: nextDiskBase,
      typed,
      refs: kind === 'markdown' ? retainedReferences(canonical, toTyped) : [],
    })
    setDraft(typed)
  }

  useEffect(() => {
    if (merge && pendingChange?.kind === 'deleted') {
      setMerge(null)
    }
  }, [merge, pendingChange])

  const openMerge = (save: boolean) => {
    if (
      !filePath ||
      content === null ||
      !pendingChange ||
      pendingChange.kind === 'deleted' ||
      merge ||
      saving ||
      hasUncheckedFileChange?.()
    )
      return
    const ours = toSave(draft)
    if (!save && onReviewFileChange) {
      onReviewFileChange(pendingChange, ours)
      return
    }
    setMerge({
      input: { path: filePath, base: content, ours, theirs: pendingChange.remote },
      change: pendingChange,
      save,
    })
  }

  const save = async () => {
    if (!filePath || !onWrite || !isDirty || saving || merge || hasUncheckedFileChange?.()) return
    if (pendingChange) openMerge(true)
    else await persist(filePath, toSave(draft))
  }

  const mergeStale =
    !!merge &&
    (merge.change !== pendingChange ||
      merge.input.ours !== toSave(draft) ||
      !!checkingChange ||
      !!changeCheckFailed)
  const finishMerge = (text: string) => {
    if (!merge || mergeStale || !files || !onWrite || merge.input.path !== filePath) return
    // The provider also checks notifications received before the next render.
    if (!files.acceptFileChangeBase(merge.change, 'keep')) return
    retainDraft(merge.input.path, merge.input.theirs, text)
    files.reportFileDraft(merge.input.path, text === merge.input.theirs ? null : text)
    setMerge(null)
    if (merge.save) void persist(merge.input.path, text)
  }

  const previewText = useMemo(
    () => (typesReferences ? toSave(draft) : undefined),
    [typesReferences, toSave, draft],
  )

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full opacity-60 text-sm">
        Select a file to view its contents.
      </div>
    )
  }

  const hasPaneToggle = kind === 'markdown' || kind === 'html'

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(draft ?? '')
    } catch {
      // best-effort
    }
  }

  const actions = (
    <>
      {isText && (
        <Tooltip content="Copy file contents">
          <Button variant="secondary" size="icon" onClick={copyAll} aria-label="Copy file contents">
            <IconCopy className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
      {isText && !readOnly && (
        <Tooltip
          content={
            changeCheckFailed
              ? 'Retry the remote check before saving'
              : checkingChange
                ? 'Waiting to verify remote edits'
                : pendingChange
                  ? pendingChange.kind === 'deleted'
                    ? 'File deleted remotely'
                    : 'Review incoming edits before saving'
                  : isDirty
                    ? 'Save'
                    : 'No unsaved changes'
          }
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={save}
            disabled={
              !isDirty ||
              saving ||
              !!merge ||
              pendingChange?.kind === 'deleted' ||
              checkingChange ||
              changeCheckFailed
            }
            aria-label="Save"
          >
            <IconSave className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
      {hasPaneToggle && (
        <SegmentedControl
          size="sm"
          ariaLabel="Pane visibility"
          value={paneView}
          onChange={(v) => setPaneView(v as MarkdownEditorPaneView)}
          options={MARKDOWN_PANE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
            icon: o.icon,
          }))}
          hideLabels
        />
      )}
      {onRename && (
        <Tooltip content="Rename">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setModal({ kind: 'rename', from: filePath })}
            aria-label="Rename file"
          >
            <IconEdit className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip content="Delete">
          <Button
            variant="danger"
            size="icon"
            onClick={() => setModal({ kind: 'delete', path: filePath })}
            aria-label="Delete file"
          >
            <IconDelete className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
    </>
  )

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      onKeyDown={(event) => {
        if (event.target !== editorRef.current || readOnly || event.defaultPrevented) return
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
        event.preventDefault()
        void save()
      }}
    >
      <FilePaneHeader
        name={resolvedName}
        path={filePath}
        size={fileSize}
        info={fileInfo}
        actions={actions}
        {...(pendingChange && files
          ? {
              pendingChange,
              pendingChangeActions: {
                disabled: !!(checkingChange || changeCheckFailed || saving || merge),
                onReviewAndMerge: () => openMerge(false),
                onKeepMine: () => {
                  const canonical = toSave(draft)
                  if (files.acceptFileChangeBase(pendingChange, 'keep')) {
                    retainDraft(filePath, pendingChange.remote, canonical)
                  }
                },
                onTakeRemote: () => {
                  files.acceptFileChangeBase(pendingChange, 'take')
                },
              },
            }
          : {})}
        {...(headerCaption ? { caption: headerCaption } : {})}
        {...(headerTrailing ? { trailing: headerTrailing } : {})}
      />

      {changeCheckFailed && (
        <div className="px-4 pt-4">
          <Alert>
            <div className="flex flex-wrap items-center gap-2">
              <span>Could not check for remote edits. Your draft is still here.</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={files?.retryFileChangeCheck}
              >
                Retry remote check
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {kind === 'markdown' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {(contentError || saveError) && (
            <div className="px-4 pt-4 flex flex-col gap-2">
              {contentError && <Alert>{contentError}</Alert>}
              {saveError && <Alert>{saveError}</Alert>}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <MarkdownEditor
              value={draft}
              onChange={editMarkdown}
              onSave={save}
              isDirty={isDirty}
              loading={isContentLoading}
              allowHtml
              view={paneView}
              onViewChange={setPaneView}
              hideHeader
              textareaRef={editorRef}
              readOnly={readOnly}
              {...(previewText !== undefined ? { previewText } : {})}
            />
          </div>
        </div>
      ) : kind === 'html' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {(contentError || saveError) && (
            <div className="px-4 pt-4 flex flex-col gap-2">
              {contentError && <Alert>{contentError}</Alert>}
              {saveError && <Alert>{saveError}</Alert>}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <HtmlEditor
              value={draft}
              onChange={setDraft}
              onSave={save}
              isDirty={isDirty}
              loading={isContentLoading}
              view={paneView}
              onViewChange={setPaneView}
              hideHeader
              textareaRef={editorRef}
              readOnly={readOnly}
            />
          </div>
        </div>
      ) : kind === 'image' ? (
        <div className="flex-1 min-h-0">
          {blobError ? (
            <div className="p-4">
              <Alert>{blobError}</Alert>
            </div>
          ) : blobUrl ? (
            <ImageViewer src={blobUrl} alt={resolvedName} />
          ) : (
            <div className="p-4 text-sm opacity-60">Loading image…</div>
          )}
        </div>
      ) : kind === 'pdf' ? (
        <div className="flex-1 min-h-0">
          {blobError ? (
            <div className="p-4">
              <Alert>{blobError}</Alert>
            </div>
          ) : blobUrl ? (
            <PdfViewer src={blobUrl} title={resolvedName} />
          ) : (
            <div className="p-4 text-sm opacity-60">Loading PDF…</div>
          )}
        </div>
      ) : kind === 'video' ? (
        <div className="flex-1 min-h-0">
          {blobError ? (
            <div className="p-4">
              <Alert>{blobError}</Alert>
            </div>
          ) : blobUrl ? (
            <VideoViewer key={filePath} src={blobUrl} title={resolvedName} />
          ) : (
            <div className="p-4 text-sm opacity-60">
              {getBinaryUrl ? 'Loading video…' : 'Video preview is unavailable.'}
            </div>
          )}
        </div>
      ) : kind === 'text' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {(contentError || saveError) && (
            <div className="px-4 pt-4 flex flex-col gap-2 shrink-0">
              {contentError && <Alert>{contentError}</Alert>}
              {saveError && <Alert>{saveError}</Alert>}
            </div>
          )}
          {isContentLoading ? (
            <div className="p-4 text-sm opacity-60">Loading…</div>
          ) : (
            <Textarea
              ref={editorRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              readOnly={readOnly}
              className="flex-1 min-h-0 font-mono text-xs resize-none border-0 outline-none rounded-none"
              spellCheck={false}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 p-4 flex flex-col gap-2 text-sm">
          <p className="text-(--text-secondary)">No inline viewer for this file type.</p>
          {fileInfo && (
            <ul className="text-xs text-(--text-muted) space-y-0.5">
              {fileInfo.type && <li>Type: {fileInfo.type}</li>}
              {fileInfo.ext && <li>Extension: .{fileInfo.ext}</li>}
            </ul>
          )}
        </div>
      )}

      {merge?.input.path === filePath && (
        <FileMergeDialog
          input={merge.input}
          onClose={() => setMerge(null)}
          onApply={finishMerge}
          stale={mergeStale}
          {...(mergeStale &&
          pendingChange &&
          pendingChange.kind !== 'deleted' &&
          !checkingChange &&
          !changeCheckFailed &&
          content !== null
            ? {
                onReload: () =>
                  setMerge({
                    input: {
                      path: merge.input.path,
                      base: content,
                      ours: toSave(draft),
                      theirs: pendingChange.remote,
                    },
                    change: pendingChange,
                    save: merge.save,
                  }),
              }
            : {})}
          save={merge.save}
        />
      )}
      {modal?.kind === 'rename' && onRename && (
        <RenameDialog from={modal.from} onClose={() => setModal(null)} onRename={onRename} />
      )}
      {modal?.kind === 'delete' && onDelete && (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title="Delete file"
          description={`This permanently removes "${modal.path}". This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => onDelete(modal.path)}
        />
      )}
    </div>
  )
}

function RenameDialog({
  from,
  onClose,
  onRename,
}: {
  from: string
  onClose: () => void
  onRename: (from: string, to: string) => Promise<void>
}) {
  const [to, setTo] = useState(from)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next = to.trim()
    if (next.length === 0 || next === from || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onRename(from, next)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Rename file">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="New path" hint="Relative to the project root">
          <Input autoFocus value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={to.trim().length === 0 || to.trim() === from}
          >
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default FilePane
