import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import type { PendingFileChange } from 'thefactory-ui/headless'
import FileMergeDialog from '../../src/native/compound/files/FileMergeDialog'
import FilePaneHeader from '../../src/native/compound/files/FilePaneHeader'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { IconSave } from '../../src/native/icons'
import { Button } from '../../src/native/primitives/Button'
import { Textarea } from '../../src/native/primitives/Textarea'
import { ToastProvider } from '../../src/native/primitives/Toast'
import type { NativeView } from './views'
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
} from '../scenes/filePaneIncomingFixture'

function MergeExample() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(true)
  return (
    <View style={{ width: 390, maxWidth: '100%', height: 256 }}>
      <ToastProvider>
        <FilePaneHeader
          path={incomingFilePath}
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
          accessibilityLabel="File contents"
          value={draft}
          onChangeText={setDraft}
          style={{ flex: 1 }}
        />
        {open && incomingFileExample.remote !== null ? (
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
        ) : null}
      </ToastProvider>
    </View>
  )
}

function DeletedExample({ change }: { change: PendingFileChange }) {
  const { theme } = useNativeTheme()
  const root = useRef<View>(null)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(true)
  const [discarded, setDiscarded] = useState(false)
  useEffect(() => {
    openSettledIncomingCallout(root.current as unknown as ParentNode | null)
  }, [])
  if (discarded) {
    return (
      <View
        style={{
          width: 390,
          maxWidth: '100%',
          height: 256,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: theme.text.muted }}>
          Select a file to view its contents.
        </Text>
      </View>
    )
  }
  return (
    <View ref={root} style={{ width: 390, maxWidth: '100%', height: 256 }}>
      <ToastProvider>
        <FilePaneHeader
          path={incomingFilePath}
          actions={
            <Text style={{ fontSize: 12, color: theme.text.muted }}>
              {pending ? 'Unsaved' : 'Recreate on save'}
            </Text>
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
          accessibilityLabel="File contents"
          value={draft}
          onChangeText={setDraft}
          style={{ flex: 1 }}
        />
      </ToastProvider>
    </View>
  )
}

function RenameReadExample({ changed }: { changed: boolean }) {
  const { theme } = useNativeTheme()
  const root = useRef<View>(null)
  const [draft, setDraft] = useState(incomingFileDraft)
  const [pending, setPending] = useState(changed)
  const [merge, setMerge] = useState<null | { save: boolean }>(null)
  useEffect(() => {
    if (!changed) return
    openSettledIncomingCallout(
      root.current as unknown as ParentNode | null,
      'Incoming edits can merge cleanly',
    )
  }, [changed])
  return (
    <View ref={root} style={{ width: 390, maxWidth: '100%', height: 256 }}>
      <ToastProvider>
        <FilePaneHeader
          path={incomingFilePath}
          actions={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>Unsaved</Text>
              <Button
                variant="secondary"
                size="icon"
                accessibilityLabel="Save"
                onPress={() => {
                  if (pending) setMerge({ save: true })
                }}
              >
                <IconSave size={18} />
              </Button>
            </View>
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
          accessibilityLabel="File contents"
          value={draft}
          onChangeText={setDraft}
          style={{ flex: 1 }}
        />
        {merge ? (
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
        ) : null}
      </ToastProvider>
    </View>
  )
}

// Same fixed draft in each state. Deleted, renamed, and a clean rename leave the
// callout open once settled.
export const FILE_PANE_INCOMING_VIEW: NativeView = {
  id: 'file-pane-incoming',
  title: 'Incoming file edits',
  render: (address) => {
    const state = address.get('state')
    if (state === 'callout') return <MergeExample />
    if (state === 'deleted')
      return <DeletedExample key="deleted" change={incomingDeletedFileExample} />
    if (state === 'renamed')
      return <DeletedExample key="renamed" change={incomingRenamedFileExample} />
    if (state === 'rename-clean') return <RenameReadExample changed />
    if (state === 'rename-same') return <RenameReadExample changed={false} />
    return (
      <View style={{ width: 390, maxWidth: '100%', height: 256 }}>
        <ToastProvider>
          <FilePaneHeader
            key={state}
            path="docs/release-notes.txt"
            {...(state === 'clean' || state === 'conflict' ? { pendingChange: state } : {})}
          />
          <Textarea
            accessibilityLabel="File contents"
            defaultValue={'Release notes\n\nDraft: add an example for the new settings panel.'}
            style={{ flex: 1 }}
          />
        </ToastProvider>
      </View>
    )
  },
}
