import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { evidenceDataUri } from '../../../headless/hooks/evidenceImageLoader'
import {
  filePreviewCaption,
  filePreviewInfoRows,
  filePreviewInitialPane,
  filePreviewPanes,
  filePreviewSize,
} from '../../../headless/utils/filePreview'
import {
  FILE_PREVIEW_COPY,
  FILE_PREVIEW_DEFAULT_MODE,
  FILE_PREVIEW_PANE_LABELS,
} from '../../../headless/utils/filePreviewConstants'
import type {
  FilePreviewContent,
  FilePreviewMode,
  FilePreviewPane,
  FilePreviewState,
  FilePreviewTarget,
} from '../../../headless/utils/filePreviewTypes'
import { REFERENCE_OPEN_LABELS } from '../../../headless/utils/referencePreviewConstants'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCopy, IconDelete, IconEdit, IconInfo, IconSave } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import { Textarea } from '../../primitives/Textarea'
import { useClipboardHost } from '../ClipboardHostContext'
import { useDesignHost } from '../design/DesignHostContext'
import Markdown from '../Markdown'
import FilePaneHeader from './FilePaneHeader'
import ImageViewer from './ImageViewer'
import ReferenceTextarea from './ReferenceTextarea'

export type FilePreviewSheetProps = {
  /** The file as it stands; `null` keeps the sheet closed. */
  state: FilePreviewState | null
  onClose: () => void
  /** Read only, or the whole Files pane — Save, Rename, Delete. Defaults to read only. */
  mode?: FilePreviewMode
  /** Leaves the sheet for the file in the Files screen; without it, no such button. */
  onOpenInFiles?: (link: ResourceLink) => void
  /** Reads the file again after a failure. */
  onRetry?: () => void
  /** Copies the file's text, in place of the app's clipboard; with neither, the text stays selectable. */
  onCopy?: (text: string) => void | Promise<unknown>
  /** The edit mode's calls, on the file's own project. Throw to show an error. */
  onWrite?: (content: string) => Promise<void>
  onRename?: (to: string) => Promise<void>
  onDelete?: () => Promise<void>
}

/**
 * Native peer of web's `FilePreviewDialog`: a file in a full-screen sheet with
 * the Files screen's tools across its top, read from the project it is in.
 * Read only by default — copy, the source / split / preview switch, its info
 * — or, in edit mode, Save, Rename and Delete too. "Open in Files" leaves it
 * for the Files screen. An html file opens as the page it is, drawn by the
 * app's web view, with a switch to its source; a PDF shows through the app's
 * PDF view. Copy uses the app's clipboard.
 */
export default function FilePreviewSheet({
  state,
  onClose,
  mode = FILE_PREVIEW_DEFAULT_MODE,
  onOpenInFiles,
  onRetry,
  onCopy,
  onWrite,
  onRename,
  onDelete,
}: FilePreviewSheetProps) {
  const { theme } = useNativeTheme()
  const host = useDesignHost()
  const target = state?.target
  return (
    <FullScreenOverlay
      isOpen={state !== null}
      onClose={onClose}
      {...(target ? { title: filePreviewCaption(target) } : {})}
      {...(host.topInset !== undefined ? { topInset: host.topInset } : {})}
      {...(host.bottomInset !== undefined ? { bottomInset: host.bottomInset } : {})}
      headerActions={
        target && onOpenInFiles ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              onClose()
              onOpenInFiles({ kind: 'file', projectId: target.projectId, path: target.path })
            }}
          >
            {REFERENCE_OPEN_LABELS.file}
          </Button>
        ) : undefined
      }
    >
      {state?.status === 'ready' ? (
        <ReadyBody
          key={`${state.target.path}:${mode}`}
          target={state.target}
          content={state}
          editing={mode === 'edit'}
          {...(onCopy ? { onCopy } : {})}
          {...(onWrite ? { onWrite } : {})}
          {...(onRename ? { onRename } : {})}
          {...(onDelete ? { onDelete } : {})}
        />
      ) : state?.status === 'error' ? (
        <View style={{ gap: nativeSpace[4], padding: nativeSpace[5] }}>
          <Alert variant="error">{`${FILE_PREVIEW_COPY.errorTitle} · ${state.message}`}</Alert>
          {onRetry ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button variant="secondary" onPress={onRetry}>
                {FILE_PREVIEW_COPY.retry}
              </Button>
            </View>
          ) : null}
        </View>
      ) : state?.status === 'gone' ? (
        <Centered>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
            {FILE_PREVIEW_COPY.goneTitle}
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary, textAlign: 'center' }}>
            {FILE_PREVIEW_COPY.goneBody}
          </Text>
        </Centered>
      ) : (
        <Centered>
          <Spinner size={20} label={FILE_PREVIEW_COPY.loading} />
        </Centered>
      )}
    </FullScreenOverlay>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: nativeSpace[2],
        padding: nativeSpace[6],
      }}
    >
      {children}
    </View>
  )
}

/** A read file with the Files screen's tools: its text, image or PDF, and what can be done with it. */
function ReadyBody({
  target,
  content,
  editing,
  onCopy,
  onWrite,
  onRename,
  onDelete,
}: {
  target: FilePreviewTarget
  content: FilePreviewContent
  editing: boolean
  onCopy?: (text: string) => void | Promise<unknown>
  onWrite?: (content: string) => Promise<void>
  onRename?: (to: string) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const { theme } = useNativeTheme()
  const host = useDesignHost()
  const clipboard = useClipboardHost()
  const copy = onCopy ?? clipboard.copyText
  const { kind, text, bytes, mediaType } = content
  const isText = kind === 'markdown' || kind === 'html' || kind === 'text'
  const references = useReferenceRendering()?.references
  const typesReferences = kind === 'markdown' && references !== undefined
  const shown = useMemo(
    () => (text === null || !references || !typesReferences ? text : references.toTyped(text)),
    [text, references, typesReferences],
  )
  const [draft, setDraft] = useState(shown ?? '')
  const shownRef = useRef(shown)
  useEffect(() => {
    if (shownRef.current === shown) return
    shownRef.current = shown
    setDraft(shown ?? '')
  }, [shown])
  const toSave = useCallback(
    (value: string) =>
      typesReferences && references && text !== null ? references.canonicalize(value, text) : value,
    [typesReferences, references, text],
  )
  const renderHtml = host.renderHtml
  const panes = kind === 'html' && !renderHtml ? [] : filePreviewPanes(kind)
  const [paneView, setPaneView] = useState<FilePreviewPane>(filePreviewInitialPane(kind, editing))
  const [infoOpen, setInfoOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(target.path)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const binaryUri = useMemo(
    () => (bytes ? evidenceDataUri(bytes, mediaType) : undefined),
    [bytes, mediaType],
  )

  const canWrite = editing && isText && onWrite !== undefined
  const isDirty = canWrite && shown !== null && draft !== shown
  const failed = (err: unknown) => setError(err instanceof Error ? err.message : String(err))
  const save = async () => {
    if (!isDirty || !onWrite) return
    setSaving(true)
    setError(null)
    try {
      await onWrite(toSave(draft))
    } catch (err) {
      failed(err)
    } finally {
      setSaving(false)
    }
  }
  const rename = async () => {
    const next = renameValue.trim()
    setRenameOpen(false)
    if (!onRename || !next || next === target.path) return
    try {
      await onRename(next)
    } catch (err) {
      failed(err)
    }
  }
  const remove = async () => {
    setConfirmDelete(false)
    if (!onDelete) return
    try {
      await onDelete()
    } catch (err) {
      failed(err)
    }
  }

  const iconColor = theme.text.primary
  const actions = (
    <>
      {isText && copy ? (
        <Button
          variant="secondary"
          size="icon"
          onPress={() => void copy(draft)}
          accessibilityLabel={FILE_PREVIEW_COPY.copy}
        >
          <IconCopy size={16} color={iconColor} />
        </Button>
      ) : null}
      {canWrite ? (
        <Button
          variant="secondary"
          size="icon"
          onPress={() => void save()}
          loading={saving}
          disabled={!isDirty || saving}
          accessibilityLabel={isDirty ? FILE_PREVIEW_COPY.save : FILE_PREVIEW_COPY.noChanges}
        >
          <IconSave size={16} color={iconColor} />
        </Button>
      ) : null}
      {editing && onRename ? (
        <Button
          variant="secondary"
          size="icon"
          onPress={() => {
            setRenameValue(target.path)
            setRenameOpen(true)
          }}
          accessibilityLabel={FILE_PREVIEW_COPY.rename}
        >
          <IconEdit size={16} color={iconColor} />
        </Button>
      ) : null}
      {editing && onDelete ? (
        <Button
          variant="danger"
          size="icon"
          onPress={() => setConfirmDelete(true)}
          accessibilityLabel={FILE_PREVIEW_COPY.delete}
        >
          <IconDelete size={16} />
        </Button>
      ) : null}
    </>
  )

  const previewText = typesReferences ? toSave(draft) : draft
  const source = (
    <SourcePane
      value={draft}
      editable={canWrite}
      markdown={kind === 'markdown'}
      onChange={setDraft}
    />
  )
  const body =
    kind === 'markdown' ? (
      <View
        style={{ flex: 1, minHeight: 0, flexDirection: paneView === 'both' ? 'row' : 'column' }}
      >
        {paneView !== 'preview' ? (
          <View
            style={{
              flex: 1,
              minWidth: 0,
              borderRightWidth: paneView === 'both' ? 1 : 0,
              borderRightColor: theme.border.subtle,
            }}
          >
            <PaneLabel label={FILE_PREVIEW_COPY.editView} />
            {source}
          </View>
        ) : null}
        {paneView !== 'edit' ? (
          <View style={{ flex: 1, minWidth: 0 }}>
            <PaneLabel label={FILE_PREVIEW_COPY.previewView} />
            <ScrollView contentContainerStyle={{ padding: nativeSpace[5] }}>
              <Markdown text={previewText} allowHtml />
            </ScrollView>
          </View>
        ) : null}
      </View>
    ) : kind === 'html' && renderHtml && paneView !== 'edit' ? (
      <View style={{ flex: 1, minHeight: 0 }}>{renderHtml(draft)}</View>
    ) : isText ? (
      source
    ) : kind === 'image' && binaryUri ? (
      <ImageViewer uri={binaryUri} />
    ) : kind === 'pdf' && binaryUri && host.renderPdf ? (
      <View style={{ flex: 1 }}>{host.renderPdf(binaryUri)}</View>
    ) : (
      <Centered>
        <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: 'center' }}>
          {FILE_PREVIEW_COPY.noViewer}
        </Text>
      </Centered>
    )

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <FilePaneHeader
        name={target.path}
        path={target.path}
        size={filePreviewSize(content)}
        info={
          <Button
            variant="secondary"
            size="icon"
            onPress={() => setInfoOpen(true)}
            accessibilityLabel={FILE_PREVIEW_COPY.info}
          >
            <IconInfo size={16} color={iconColor} />
          </Button>
        }
        actions={actions}
      />
      {panes.length > 0 ? (
        <View
          style={{
            paddingHorizontal: nativeSpace[5],
            paddingVertical: nativeSpace[3],
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <SegmentedControl
            size="sm"
            ariaLabel={FILE_PREVIEW_COPY.paneSwitch}
            value={paneView}
            onChange={(v) => setPaneView(v as FilePreviewPane)}
            options={panes.map((value) => ({
              value,
              label: FILE_PREVIEW_PANE_LABELS[value],
            }))}
          />
        </View>
      ) : null}
      {error ? (
        <View style={{ paddingHorizontal: nativeSpace[5], paddingTop: nativeSpace[4] }}>
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}
      <View style={{ flex: 1, minHeight: 0 }}>{body}</View>

      <Modal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={FILE_PREVIEW_COPY.info}
        size="md"
      >
        <View style={{ gap: nativeSpace[3] }}>
          {filePreviewInfoRows(target, content).map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', gap: nativeSpace[4] }}>
              <Text style={{ width: 80, fontSize: 13, color: theme.text.muted }}>{row.label}</Text>
              <Text selectable style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </Modal>
      <Modal
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={FILE_PREVIEW_COPY.renameTitle}
        size="md"
        footer={
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
            <Button variant="secondary" onPress={() => setRenameOpen(false)}>
              {FILE_PREVIEW_COPY.cancel}
            </Button>
            <Button disabled={!renameValue.trim()} onPress={() => void rename()}>
              {FILE_PREVIEW_COPY.renameConfirm}
            </Button>
          </View>
        }
      >
        <Input
          value={renameValue}
          onChangeText={setRenameValue}
          placeholder={FILE_PREVIEW_COPY.renamePlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Modal>
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title={FILE_PREVIEW_COPY.deleteTitle}
        description={FILE_PREVIEW_COPY.deleteBody}
        confirmLabel={FILE_PREVIEW_COPY.deleteConfirm}
        destructive
      />
    </View>
  )
}

/** A file's text: editable in edit mode, else to read and select. */
function SourcePane({
  value,
  editable,
  markdown,
  onChange,
}: {
  value: string
  editable: boolean
  markdown: boolean
  onChange: (next: string) => void
}) {
  const { theme } = useNativeTheme()
  if (editable && markdown) {
    return (
      <ReferenceTextarea
        fill
        value={value}
        onChangeText={onChange}
        textInputProps={{ autoCapitalize: 'none', autoCorrect: false, style: EDITOR_STYLE }}
      />
    )
  }
  if (editable) {
    return (
      <Textarea
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        style={EDITOR_STYLE}
      />
    )
  }
  return (
    <ScrollView contentContainerStyle={{ padding: nativeSpace[5] }}>
      <Text
        selectable
        style={{ fontFamily: 'Menlo', fontSize: 12, lineHeight: 18, color: theme.text.primary }}
      >
        {value}
      </Text>
    </ScrollView>
  )
}

function PaneLabel({ label }: { label: string }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        paddingHorizontal: nativeSpace[4],
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

const EDITOR_STYLE = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  borderWidth: 0,
  borderRadius: 0,
  backgroundColor: 'transparent',
} as const
