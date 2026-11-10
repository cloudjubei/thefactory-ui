import { useMemo, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  FILE_PREVIEW_DEFAULT_MODE,
  FILE_PREVIEW_LABEL,
  FILE_PREVIEW_MODE_LABELS,
  FILE_PREVIEW_MODES,
  FilesProvider,
  referencePreview,
  type FilePreviewMode,
  type FilePreviewTarget,
} from 'thefactory-ui/headless'
import { ClipboardHostProvider } from '../../src/native/compound/ClipboardHostContext'
import type { ClipboardHost } from '../../src/native/compound/clipboardHostTypes'
import { DesignHostProvider } from '../../src/native/compound/design/DesignHostContext'
import type { DesignHost } from '../../src/native/compound/design/designNativeTypes'
import FilePreviewSheet from '../../src/native/compound/files/FilePreviewSheet'
import FilePreviewSheetConnected from '../../src/native/compound/files/FilePreviewSheetConnected'
import ProjectFileChip from '../../src/native/compound/files/ProjectFileChip'
import ReferencePreviewSheet from '../../src/native/compound/chips/ReferencePreviewSheet'
import { IconFile } from '../../src/native/icons'
import { Button } from '../../src/native/primitives/Button'
import { OverlayProvider } from '../../src/native/primitives/Overlay'
import SegmentedControl from '../../src/native/primitives/SegmentedControl'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  FILE_PREVIEW_FILES,
  FILE_PREVIEW_ROUTES,
  OWN_FILE,
  PROPOSAL_CHIP,
  useFakeEdits,
  type FilePreviewFile,
} from '../scenes/filePreviewFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}

/** The app's PDF view, as a browser draws it: the data URI as a blob for the built-in viewer. */
function BrowserPdf({ uri }: { uri: string }) {
  const src = useMemo(() => {
    const [head = '', body = ''] = uri.split(',')
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const type = head.slice('data:'.length).split(';')[0] ?? 'application/pdf'
    return URL.createObjectURL(new Blob([bytes], { type }))
  }, [uri])
  return <object type="application/pdf" data={src} style={{ width: '100%', height: '100%' }} />
}

/** The app's html page view, as a browser draws it: a frame that runs nothing and goes nowhere. */
function BrowserHtml({ html }: { html: string }) {
  return (
    <iframe
      title="HTML preview"
      srcDoc={html}
      sandbox=""
      referrerPolicy="no-referrer"
      style={{ width: '100%', height: '100%', border: 0, background: 'white' }}
    />
  )
}

const HOST: DesignHost = {
  renderPdf: (uri) => <BrowserPdf uri={uri} />,
  renderHtml: (html) => <BrowserHtml html={html} />,
}

/** The app's clipboard, as a browser has it. */
const CLIPBOARD: ClipboardHost = { copyText: (text) => navigator.clipboard.writeText(text) }

/** A phone's screen: its own overlay host, so the full-screen sheet covers it and not the board. */
function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        width: 390,
        height: 780,
        maxWidth: '100%',
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme.surface.base,
      }}
    >
      <OverlayProvider>
        <View style={{ flex: 1 }}>{children}</View>
      </OverlayProvider>
    </View>
  )
}

function OnPhoneFixtures({ children }: { children: ReactNode }) {
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <FilesProvider>
        <DesignHostProvider value={HOST}>
          <ClipboardHostProvider value={CLIPBOARD}>
            <View style={{ flex: 1, alignItems: 'center', gap: 12, padding: 12 }}>{children}</View>
          </ClipboardHostProvider>
        </DesignHostProvider>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The full-screen preview on a phone, read only or the whole Files pane switched on the board. */
function PreviewOnPhone({
  file,
  mode: initialMode,
}: {
  file: FilePreviewFile
  mode: FilePreviewMode
}) {
  const [mode, setMode] = useState(initialMode)
  const [open, setOpen] = useState(true)
  const edits = useFakeEdits(file)
  return (
    <OnPhoneFixtures>
      <SegmentedControl
        size="sm"
        ariaLabel="Preview mode"
        value={mode}
        onChange={(next) => setMode(next as FilePreviewMode)}
        options={FILE_PREVIEW_MODES.map((value) => ({
          value,
          label: FILE_PREVIEW_MODE_LABELS[value],
        }))}
      />
      <Phone>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Button variant="primary" onPress={() => setOpen(true)}>
            {FILE_PREVIEW_LABEL}
          </Button>
        </View>
        <FilePreviewSheet
          state={open ? edits.state : null}
          onClose={() => setOpen(false)}
          mode={mode}
          onOpenInFiles={() => setOpen(false)}
          onRetry={noop}
          onWrite={edits.onWrite}
          onRename={edits.onRename}
          onDelete={edits.onDelete}
        />
      </Phone>
    </OnPhoneFixtures>
  )
}

/** A file chip's long-press sheet: Preview opens the full-screen preview, read on the fixtures. */
function ChipSheetOnPhone() {
  const [sheetOpen, setSheetOpen] = useState(true)
  const [target, setTarget] = useState<FilePreviewTarget | null>(null)
  return (
    <OnPhoneFixtures>
      <Phone>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Button variant="secondary" onPress={() => setSheetOpen(true)}>
            {PROPOSAL_CHIP.label}
          </Button>
        </View>
        <ReferencePreviewSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          view={referencePreview(PROPOSAL_CHIP)}
          glyph={IconFile}
          onOpen={noop}
          onPreview={setTarget}
        />
        <FilePreviewSheetConnected
          target={target}
          onClose={() => setTarget(null)}
          onOpenInFiles={noop}
        />
      </Phone>
    </OnPhoneFixtures>
  )
}

/** A file of the project on screen in a message: tap it for its sheet, then Preview. */
function OwnFileChipOnPhone() {
  const { theme } = useNativeTheme()
  return (
    <OnPhoneFixtures>
      <Phone>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            alignContent: 'center',
            gap: 4,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 14, color: theme.text.primary }}>The proposal is in</Text>
          <ProjectFileChip
            file={OWN_FILE.meta}
            projectId={OWN_FILE.projectId}
            onOpenInFiles={noop}
          />
        </View>
      </Phone>
    </OnPhoneFixtures>
  )
}

const fileOf = (address: URLSearchParams): FilePreviewFile => {
  const file = address.get('file')
  return FILE_PREVIEW_FILES.find((f) => f === file) ?? 'markdown'
}

const modeOf = (address: URLSearchParams): FilePreviewMode =>
  address.get('mode') === 'edit' ? 'edit' : FILE_PREVIEW_DEFAULT_MODE

export const FILE_PREVIEW_VIEWS: readonly NativeView[] = [
  {
    id: 'file-preview',
    title:
      'File preview, with Copy (?file=markdown|html|text|image|pdf|unknown|loading|error|gone&mode=view|edit)',
    render: (address) => <PreviewOnPhone file={fileOf(address)} mode={modeOf(address)} />,
  },
  {
    id: 'file-reference-sheet',
    title: 'File chip: long-press sheet with Preview',
    render: () => <ChipSheetOnPhone />,
  },
  {
    id: 'project-file-chip',
    title: 'File of the project on screen: tap for its sheet with Preview',
    render: () => <OwnFileChipOnPhone />,
  },
]
