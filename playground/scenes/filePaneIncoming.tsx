import { useEffect, useRef, useState } from 'react'
import type { PendingFileChange } from 'thefactory-ui/headless'
import { Button, FilePaneHeader, Textarea } from 'thefactory-ui/web'
import { IconSave } from 'thefactory-ui/web/icons'
import FileMergeDialog from '../../src/web/compound/files/FileMergeDialog'
import type { Scene } from '../showcase/types'
import {
  incomingDeletedFileExample,
  incomingFileBase,
  incomingFileDraft,
  incomingFileExample,
  incomingFileExampleActions,
  incomingFilePath,
  incomingRenameCleanFileExample,
  incomingRenameCleanRemote,
  incomingRenamedFileExample,
  openSettledIncomingCallout,
} from './filePaneIncomingFixture'

function MergeExample() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(true)
  return (
    <div className="flex h-64 w-[600px] max-w-full flex-col border border-(--border-subtle)">
      <FilePaneHeader
        path={incomingFilePath}
        actions={<span className="text-xs text-(--text-muted)">Unsaved</span>}
        {...(pending
          ? {
              pendingChange: incomingFileExample,
              pendingChangeActions: {
                ...incomingFileExampleActions,
                onReviewAndMerge: () => setOpen(true),
              },
            }
          : {})}
      />
      <Textarea
        aria-label="File contents"
        className="min-h-0 flex-1 rounded-none border-0 font-mono"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {open && incomingFileExample.remote !== null && (
        <FileMergeDialog
          input={{
            path: incomingFilePath,
            base: incomingFileBase,
            ours: draft,
            theirs: incomingFileExample.remote,
          }}
          onClose={() => setOpen(false)}
          onApply={(text) => {
            setDraft(text)
            setOpen(false)
            setPending(false)
          }}
        />
      )}
    </div>
  )
}

function DeletedExample({ change }: { change: PendingFileChange }) {
  const root = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(true)
  const [discarded, setDiscarded] = useState(false)
  useEffect(() => {
    openSettledIncomingCallout(root.current)
  }, [])
  if (discarded) {
    return (
      <div className="flex h-64 w-[600px] max-w-full items-center justify-center border border-(--border-subtle) text-sm text-(--text-muted)">
        Select a file to view its contents.
      </div>
    )
  }
  return (
    <div
      ref={root}
      className="flex h-64 w-[600px] max-w-full flex-col border border-(--border-subtle)"
    >
      <FilePaneHeader
        path={incomingFilePath}
        actions={
          <span className="text-xs text-(--text-muted)">
            {pending ? 'Unsaved' : 'Recreate on save'}
          </span>
        }
        {...(pending
          ? {
              pendingChange: change,
              pendingChangeActions: {
                onKeepMine: () => setPending(false),
                onTakeRemote: () => setDiscarded(true),
              },
            }
          : {})}
      />
      <Textarea
        aria-label="File contents"
        className="min-h-0 flex-1 rounded-none border-0 font-mono"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </div>
  )
}

function RenameReadExample({ changed }: { changed: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(changed)
  const [merge, setMerge] = useState<null | { save: boolean }>(null)
  useEffect(() => {
    if (!changed) return
    openSettledIncomingCallout(root.current, 'Incoming edits can merge cleanly')
  }, [changed])
  return (
    <div
      ref={root}
      className="flex h-64 w-[600px] max-w-full flex-col border border-(--border-subtle)"
    >
      <FilePaneHeader
        path={incomingFilePath}
        actions={
          <>
            <span className="text-xs text-(--text-muted)">Unsaved</span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              title="Save"
              aria-label="Save"
              onClick={() => {
                if (pending) setMerge({ save: true })
              }}
            >
              <IconSave className="w-4 h-4" />
            </Button>
          </>
        }
        {...(pending
          ? {
              pendingChange: incomingRenameCleanFileExample,
              pendingChangeActions: {
                onReviewAndMerge: () => setMerge({ save: false }),
                onKeepMine: () => setPending(false),
                onTakeRemote: () => {
                  setDraft(incomingRenameCleanRemote)
                  setPending(false)
                },
              },
            }
          : {})}
      />
      <Textarea
        aria-label="File contents"
        className="min-h-0 flex-1 rounded-none border-0 font-mono"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {merge && (
        <FileMergeDialog
          input={{
            path: incomingFilePath,
            base: incomingFileBase,
            ours: draft,
            theirs: incomingRenameCleanRemote,
          }}
          save={merge.save}
          onClose={() => setMerge(null)}
          onApply={(text) => {
            setDraft(text)
            setMerge(null)
            setPending(false)
          }}
        />
      )}
    </div>
  )
}

const states = ['clean', 'conflict', 'deleted', 'renamed', 'none', 'callout'] as const

// Fixed header states over the same dirty buffer. Incoming states announce once
// on mount. Deleted, renamed, and rename-clean leave the callout open after that.
// None and rename-same have no warning.
export const FILE_PANE_INCOMING_SCENES: Scene[] = [
  {
    id: 'file-pane-incoming',
    title: 'Incoming file edits',
    component: 'FilePaneHeader',
    group: 'Project',
    description:
      'The open file keeps its unsaved text while the header reports the incoming state.',
    states: [
      ...states.map((state) => ({
        id: state,
        title: state,
        render: () =>
          state === 'callout' ? (
            <MergeExample />
          ) : state === 'deleted' ? (
            <DeletedExample key="deleted" change={incomingDeletedFileExample} />
          ) : state === 'renamed' ? (
            <DeletedExample key="renamed" change={incomingRenamedFileExample} />
          ) : (
            <div className="flex h-64 w-[600px] max-w-full flex-col border border-(--border-subtle)">
              <FilePaneHeader
                key={state}
                path="docs/release-notes.txt"
                actions={<span className="text-xs text-(--text-muted)">Unsaved</span>}
                {...(state === 'none' ? {} : { pendingChange: state })}
              />
              <Textarea
                aria-label="File contents"
                className="min-h-0 flex-1 rounded-none border-0 font-mono"
                defaultValue={'Release notes\n\nDraft: add an example for the new settings panel.'}
              />
            </div>
          ),
      })),
      {
        id: 'rename-clean',
        title: 'Rename, clean merge',
        description:
          'A rename whose read returned different bytes. The callout is open: 0 conflicts with your edits. Moved to docs/notes.txt. Source: A person. Save opens the merge dialog. Keep mine clears the warning and keeps the draft. Take remote clears the warning and shows the remote text.',
        render: () => <RenameReadExample changed />,
      },
      {
        id: 'rename-same',
        title: 'Rename, same bytes',
        description:
          'A rename whose read returned the same bytes: the same header and draft, with no warning icon.',
        render: () => <RenameReadExample changed={false} />,
      },
    ],
  },
]
