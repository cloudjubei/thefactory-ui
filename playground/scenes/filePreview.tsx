import { useEffect, useState } from 'react'
import {
  FILE_PREVIEW_LABEL,
  FilesProvider,
  referencePreview,
  type FilePreviewTarget,
} from 'thefactory-ui/headless'
import type { ReferenceDescription } from 'thefactory-tools/types'
import {
  Button,
  FilePreviewDialog,
  FilePreviewDialogConnected,
  ProjectFileChip,
  ReferenceChip,
  ReferencePreviewCard,
} from 'thefactory-ui/web'
import { IconFile } from 'thefactory-ui/web/icons'
import type { Scene, SceneState } from '../showcase/types'
import {
  DOCS_FOLDER_CHIP,
  FILE_PREVIEW_FILE_LABELS,
  FILE_PREVIEW_FILES,
  FILE_PREVIEW_ROUTES,
  FILE_PREVIEW_STATES,
  OWN_FILE,
  PROPOSAL_CHIP,
  PROPOSAL_TEXT,
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
 * A file of the project on screen, in a line of a message: hover it for its card, which
 * shows the start of the file and Preview; Preview opens the real popup on the fixtures.
 */
function OwnFileChipInMessage() {
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <p className="max-w-xl p-6 pt-40 text-sm leading-7 text-(--text-primary)">
        I wrote the proposal up in{' '}
        <span className="inline-block align-middle">
          <ProjectFileChip
            file={OWN_FILE.meta}
            projectId={OWN_FILE.projectId}
            onReadPreview={async () => PROPOSAL_TEXT}
            onOpenInFiles={noop}
          />
        </span>{' '}
        — have a look.
      </p>
    </OnFixtures>
  )
}

/** The centred popup over the page, with Preview to open it again once closed. Drawn once mounted — it portals. */
function PreviewBoard({ file }: { file: FilePreviewFile }) {
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <OnFixtures routes={FILE_PREVIEW_ROUTES}>
      <FilesProvider>
        {open ? null : (
          <div className="fixed left-1/2 top-3 z-[1100] -translate-x-1/2">
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              {FILE_PREVIEW_LABEL}
            </Button>
          </div>
        )}
        {mounted ? (
          <FilePreviewDialog
            state={open ? FILE_PREVIEW_STATES[file] : null}
            onClose={() => setOpen(false)}
            onOpenInFiles={() => setOpen(false)}
            onRetry={noop}
          />
        ) : null}
      </FilesProvider>
    </OnFixtures>
  )
}

const DESCRIPTIONS: Record<FilePreviewFile, string> = {
  markdown:
    'A markdown file from another project, opened on its preview; the switch in its header shows the source, both, or the preview.',
  html: 'An html file, opened as the page it is — markup only, no scripts; the switch in its header shows the source.',
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
    component: 'ReferencePreviewCard, ReferenceChip, ProjectFileChip',
    group: 'Chat',
    description:
      'A file chip’s hover card offers Preview beside Open in Files; a folder’s does not. Preview opens the file in a popup, read from the file’s own project. A file of the project on screen has the same Preview on its own card. Left off on purpose where a file is being picked or attached: the file selector’s rows, a story’s context files, a message’s attachments.',
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
      {
        id: 'own-project-file',
        title: 'File of the project on screen',
        description:
          'Hover the chip: its card shows the start of the file and Preview. Press Preview: the same popup, read from the project on screen.',
        render: () => <OwnFileChipInMessage />,
      },
    ],
  },
  {
    id: 'file-preview',
    title: 'File preview popup',
    component: 'FilePreviewDialog',
    group: 'Chat',
    description:
      'A file in a popup with the Files pane’s reading tools across its top: read only, editing stays in the Files screen through Open in Files. It opens as a large centred popup.',
    states: previewStates,
    controls: [
      {
        id: 'file',
        label: 'File',
        kind: 'choice',
        options: FILE_PREVIEW_FILES.map((id) => ({ id, label: FILE_PREVIEW_FILE_LABELS[id] })),
        default: 'markdown',
      },
    ],
    play: (values) => <PreviewBoard file={(values.file ?? 'markdown') as FilePreviewFile} />,
  },
]
