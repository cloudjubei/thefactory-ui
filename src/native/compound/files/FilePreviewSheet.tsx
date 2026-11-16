import { useMemo, useState, type ReactNode } from 'react'
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
  FILE_PREVIEW_PANE_LABELS,
} from '../../../headless/utils/filePreviewConstants'
import type {
  FilePreviewContent,
  FilePreviewPane,
  FilePreviewState,
  FilePreviewTarget,
} from '../../../headless/utils/filePreviewTypes'
import { REFERENCE_OPEN_LABELS } from '../../../headless/utils/referencePreviewConstants'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCopy, IconInfo } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import { useClipboardHost } from '../ClipboardHostContext'
import { useDesignHost } from '../design/DesignHostContext'
import Markdown from '../Markdown'
import FilePaneHeader from './FilePaneHeader'
import ImageViewer from './ImageViewer'

export type FilePreviewSheetProps = {
  /** The file as it stands; `null` keeps the sheet closed. */
  state: FilePreviewState | null
  onClose: () => void
  /** Leaves the sheet for the file in the Files screen; without it, no such button. */
  onOpenInFiles?: (link: ResourceLink) => void
  /** Reads the file again after a failure. */
  onRetry?: () => void
  /** Copies the file's text, in place of the app's clipboard; with neither, the text stays selectable. */
  onCopy?: (text: string) => void | Promise<unknown>
  /** More buttons in the header, before "Open in Files" — as Save to project. */
  headerActions?: ReactNode
}

/**
 * Native peer of web's `FilePreviewDialog`: a file in a full-screen sheet with
 * the Files screen's tools across its top, read from the project it is in.
 * Read only — copy, the source / split / preview switch, its info; editing
 * stays in the Files screen, which "Open in Files" leaves it for. An html file opens as the page it is, drawn by the
 * app's web view, with a switch to its source; a PDF shows through the app's
 * PDF view. Copy uses the app's clipboard.
 */
export default function FilePreviewSheet({
  state,
  onClose,
  onOpenInFiles,
  onRetry,
  onCopy,
  headerActions,
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
        headerActions || (target && onOpenInFiles) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            {headerActions}
            {target && onOpenInFiles ? (
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
            ) : null}
          </View>
        ) : undefined
      }
    >
      {state?.status === 'ready' ? (
        <ReadyBody
          key={state.target.path}
          target={state.target}
          content={state}
          {...(onCopy ? { onCopy } : {})}
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

/** A read file with the Files screen's reading tools: its text, image or PDF, to copy and look into. */
function ReadyBody({
  target,
  content,
  onCopy,
}: {
  target: FilePreviewTarget
  content: FilePreviewContent
  onCopy?: (text: string) => void | Promise<unknown>
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
  const shownText = shown ?? ''
  const renderHtml = host.renderHtml
  const panes = kind === 'html' && !renderHtml ? [] : filePreviewPanes(kind)
  const [paneView, setPaneView] = useState<FilePreviewPane>(filePreviewInitialPane(kind, false))
  const [infoOpen, setInfoOpen] = useState(false)
  const binaryUri = useMemo(
    () => (bytes ? evidenceDataUri(bytes, mediaType) : undefined),
    [bytes, mediaType],
  )

  const iconColor = theme.text.primary
  const actions =
    isText && copy ? (
      <Button
        variant="secondary"
        size="icon"
        onPress={() => void copy(shownText)}
        accessibilityLabel={FILE_PREVIEW_COPY.copy}
      >
        <IconCopy size={16} color={iconColor} />
      </Button>
    ) : null

  const source = <SourcePane value={shownText} />
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
              <Markdown text={text ?? ''} allowHtml />
            </ScrollView>
          </View>
        ) : null}
      </View>
    ) : kind === 'html' && renderHtml && paneView !== 'edit' ? (
      <View style={{ flex: 1, minHeight: 0 }}>{renderHtml(shownText)}</View>
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
        name={target.name ?? target.path}
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
    </View>
  )
}

/** A file's text, to read and select. */
function SourcePane({ value }: { value: string }) {
  const { theme } = useNativeTheme()
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
