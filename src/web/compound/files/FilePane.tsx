import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

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
import { default as ImageViewer } from './ImageViewer'
import { default as PdfViewer } from './PdfViewer'
import { default as MarkdownEditor, MARKDOWN_PANE_OPTIONS } from '../MarkdownEditor'
import type { MarkdownEditorPaneView } from '../MarkdownEditor'
import { default as HtmlEditor } from './HtmlEditor'
import type { FileInfoData } from './FileInfoButton'
import {
  classifyFileByExtension,
  type FilePaneKind,
} from '../../../headless/utils/filePaneKind'

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
  /** Persists the working draft. Throws to surface an error to the user. */
  onWrite: (path: string, content: string) => Promise<void>
  /** Renames the current file. Throws to surface an error. */
  onRename: (from: string, to: string) => Promise<void>
  /** Deletes the current file. Throws to surface an error. */
  onDelete: (path: string) => Promise<void>
  /**
   * Returns a URL the `<img>` / `<object>` can load. Typically a blob URL the
   * caller created via `fetch` (web) or `data:` URL (desktop, via IPC).
   * Called only when the current file's kind is `image` or `pdf`.
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
}: FilePaneProps) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalRoute>(null)
  const [paneView, setPaneView] = useState<MarkdownEditorPaneView>('both')
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
  }, [filePath])

  useEffect(() => {
    if (content !== null) setDraft(content)
  }, [content])

  useEffect(() => {
    if (!filePath || !getBinaryUrl) return
    if (kind !== 'image' && kind !== 'pdf') {
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

  const save = useCallback(async () => {
    if (!filePath) return
    setSaving(true)
    setSaveError(null)
    try {
      await onWrite(filePath, draft)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }, [filePath, draft, onWrite])

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full opacity-60 text-sm">
        Select a file to view its contents.
      </div>
    )
  }

  const isText = kind === 'text' || kind === 'markdown' || kind === 'html'
  const hasPaneToggle = kind === 'markdown' || kind === 'html'
  const isDirty = isText && content !== null && draft !== content

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
      {isText && (
        <Tooltip content={isDirty ? 'Save' : 'No unsaved changes'}>
          <Button
            variant="secondary"
            size="icon"
            onClick={save}
            disabled={!isDirty || saving}
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
    </>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilePaneHeader
        name={resolvedName}
        path={filePath}
        size={fileSize}
        info={fileInfo}
        actions={actions}
      />

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
              onChange={setDraft}
              onSave={save}
              isDirty={isDirty}
              loading={isContentLoading}
              allowHtml
              view={paneView}
              onViewChange={setPaneView}
              hideHeader
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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

      {modal?.kind === 'rename' && (
        <RenameDialog from={modal.from} onClose={() => setModal(null)} onRename={onRename} />
      )}
      {modal?.kind === 'delete' && (
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
