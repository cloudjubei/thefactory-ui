import { useEffect, useState } from 'react'
import {
  FILE_PREVIEW_DEFAULT_LAYOUT,
  FILE_PREVIEW_DEFAULT_MODE,
  FILE_PREVIEW_LABEL,
  FILE_PREVIEW_LAYOUT_LABELS,
  FILE_PREVIEW_LAYOUTS,
  FILE_PREVIEW_MODE_LABELS,
  FILE_PREVIEW_MODES,
  FilesProvider,
  referencePreview,
  type FilePreviewLayout,
  type FilePreviewMode,
  type FilePreviewTarget,
} from 'thefactory-ui/headless'
import type { ReferenceDescription } from 'thefactory-tools/types'
import {
  Button,
  FilePreviewDialog,
  FilePreviewDialogConnected,
  ReferenceChip,
  ReferencePreviewCard,
  SegmentedControl,
} from 'thefactory-ui/web'
import { IconFile } from 'thefactory-ui/web/icons'
import type { Scene, SceneState } from '../showcase/types'
import {
  DOCS_FOLDER_CHIP,
  FILE_PREVIEW_FILE_LABELS,
  FILE_PREVIEW_FILES,
  FILE_PREVIEW_ROUTES,
  PROPOSAL_CHIP,
  useFakeEdits,
  type FilePreviewFile,
} from './filePreviewFixtures'
import { OnFixtures } from './onFixtures'

const noop = () => {}

/** A chip's hover card, drawn open; its Preview opens the real popup on the fixtures. */
function FileCard({ description }: { description: ReferenceDescription }) {
  const [target, setTarget] = useState<FilePreviewTarget | null>(null)
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <div className="p-6">
        <div className="inline-block rounded-lg border border-(--border-subtle) bg-(--surface-overlay) p-3 shadow-md">
          <ReferencePreviewCard
            view={referencePreview(description)}
            glyph={IconFile}
            onOpen={noop}
            onPreview={setTarget}
          />
        </div>
      </div>
      <FilePreviewDialogConnected
        target={target}
        onClose={() => setTarget(null)}
        onOpenInFiles={noop}
      />
    </OnFixtures>
  )
}

/** The chip as a group chat shows it, in a line of a message: hover it for its card. */
function ChipInMessage() {
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <p className="max-w-xl p-6 text-sm leading-7 text-(--text-primary)">
        The pricing write-up is in <ReferenceChip description={PROPOSAL_CHIP} onOpen={noop} /> —
        read it before Thursday.
      </p>
    </OnFixtures>
  )
}

/**
 * The popup over the page with the choices still open switched on the board itself: read only
 * or the whole Files pane, a centred popup or a right drawer. Drawn once mounted — it portals.
 */
function PreviewBoard({
  file,
  mode: initialMode = FILE_PREVIEW_DEFAULT_MODE,
  layout: initialLayout = FILE_PREVIEW_DEFAULT_LAYOUT,
}: {
  file: FilePreviewFile
  mode?: FilePreviewMode
  layout?: FilePreviewLayout
}) {
  const [mode, setMode] = useState(initialMode)
  const [layout, setLayout] = useState(initialLayout)
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const edits = useFakeEdits(file)
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <FilesProvider>
        <div className="fixed left-1/2 top-3 z-[1100] flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 shadow-lg">
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
          <SegmentedControl
            size="sm"
            ariaLabel="Popup layout"
            value={layout}
            onChange={(next) => setLayout(next as FilePreviewLayout)}
            options={FILE_PREVIEW_LAYOUTS.map((value) => ({
              value,
              label: FILE_PREVIEW_LAYOUT_LABELS[value],
            }))}
          />
          {open ? null : (
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              {FILE_PREVIEW_LABEL}
            </Button>
          )}
        </div>
        {mounted ? (
          <FilePreviewDialog
            state={open ? edits.state : null}
            onClose={() => setOpen(false)}
            mode={mode}
            layout={layout}
            onOpenInFiles={() => setOpen(false)}
            onRetry={noop}
            onWrite={edits.onWrite}
            onRename={edits.onRename}
            onDelete={edits.onDelete}
          />
        ) : null}
      </FilesProvider>
    </OnFixtures>
  )
}

const DESCRIPTIONS: Record<FilePreviewFile, string> = {
  markdown:
    'A markdown file from another project, opened on its preview; the switch in its header shows the source, both, or the preview.',
  text: 'A source file, as text: copy it, and see its info.',
  image: 'An image, with the Files pane’s zoom.',
  pdf: 'A PDF, in the browser’s own viewer.',
  unknown: 'A file no viewer shows: what it is and its size.',
  loading: 'While the file is read from its project.',
  error: 'The read failed: what the backend said, and Try again.',
  gone: 'The file was moved or deleted since the message pointed at it.',
}

const previewStates: SceneState[] = FILE_PREVIEW_FILES.map((file) => ({
  id: file,
  title: FILE_PREVIEW_FILE_LABELS[file],
  description: DESCRIPTIONS[file],
  overlay: true,
  render: () => <PreviewBoard file={file} />,
}))

export const FILE_PREVIEW_SCENES: Scene[] = [
  {
    id: 'file-reference-card',
    title: 'File chip: Preview',
    component: 'ReferencePreviewCard, ReferenceChip',
    group: 'Chat',
    description:
      'A file chip’s hover card offers Preview beside Open in Files; a folder’s does not. Preview opens the file in a popup, read from the file’s own project.',
    states: [
      {
        id: 'file-with-preview',
        title: 'File in another project',
        description:
          'Open in Files and Preview. Press Preview: the popup reads the file on the fixtures.',
        render: () => <FileCard description={PROPOSAL_CHIP} />,
      },
      {
        id: 'folder-no-preview',
        title: 'Folder',
        description: 'A folder opens in Files only.',
        render: () => <FileCard description={DOCS_FOLDER_CHIP} />,
      },
      {
        id: 'chip-in-message',
        title: 'Chip in a message',
        description: 'Hover the chip for its card.',
        render: () => <ChipInMessage />,
      },
    ],
  },
  {
    id: 'file-preview',
    title: 'File preview popup',
    component: 'FilePreviewDialog',
    group: 'Chat',
    description:
      'A file in a popup with the Files pane’s tools across its top. Two calls are still open and switch on the board: read only or the whole Files pane (Save, Rename, Delete), and a centred popup or a right drawer.',
    states: previewStates,
    controls: [
      {
        id: 'file',
        label: 'File',
        kind: 'choice',
        options: FILE_PREVIEW_FILES.map((id) => ({ id, label: FILE_PREVIEW_FILE_LABELS[id] })),
        default: 'markdown',
      },
      {
        id: 'mode',
        label: 'Mode',
        kind: 'choice',
        options: FILE_PREVIEW_MODES.map((id) => ({ id, label: FILE_PREVIEW_MODE_LABELS[id] })),
        default: FILE_PREVIEW_DEFAULT_MODE,
      },
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: FILE_PREVIEW_LAYOUTS.map((id) => ({ id, label: FILE_PREVIEW_LAYOUT_LABELS[id] })),
        default: FILE_PREVIEW_DEFAULT_LAYOUT,
      },
    ],
    presets: [
      { id: 'view-modal', name: 'View only, centred', values: { mode: 'view', layout: 'modal' } },
      {
        id: 'edit-modal',
        name: 'Full Files pane, centred',
        values: { mode: 'edit', layout: 'modal' },
      },
      { id: 'view-drawer', name: 'View only, drawer', values: { mode: 'view', layout: 'drawer' } },
    ],
    play: (values) => (
      <PreviewBoard
        file={(values.file ?? 'markdown') as FilePreviewFile}
        mode={(values.mode ?? FILE_PREVIEW_DEFAULT_MODE) as FilePreviewMode}
        layout={(values.layout ?? FILE_PREVIEW_DEFAULT_LAYOUT) as FilePreviewLayout}
      />
    ),
  },
]
