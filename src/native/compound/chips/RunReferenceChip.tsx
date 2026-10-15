import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import {
  RUN_PREVIEW_OPEN_CHAT,
  runReferencePreview,
  useProcessRun,
  useProcessRunChat,
} from '../../../headless'
import ReferenceChip from './ReferenceChip'

export type RunReferenceChipProps = {
  runId: string
  /** How the reference reads before the run's record is read. */
  description: ReferenceDescription
  onOpen?: (link: ResourceLink) => void
  /** The run's story as its chip reads — `#8 Fixture rework` — where the chat can name it. */
  storyLabel?: (projectId: string, storyId: string) => string | undefined
}

const RUN_GONE = 'This process run no longer exists'

/**
 * Native peer of web's `RunReferenceChip`: a process run a message points at,
 * kept live — its title and status, a tap that opens it, and a long press that
 * shows its story, where it waits, its time and cost, with buttons to its
 * sign-off and its own chat. Muted while it is read; struck through once gone.
 */
export default function RunReferenceChip({
  runId,
  description,
  onOpen,
  storyLabel,
}: RunReferenceChipProps) {
  const { run, isLoaded, loadError } = useProcessRun(runId)
  const { open: openChat } = useProcessRunChat(run?.parentRunId ? undefined : run)
  if (!run) {
    const gone = isLoaded && loadError !== null
    return (
      <ReferenceChip
        description={
          gone
            ? { kind: 'run', label: description.label, detail: RUN_GONE, missing: true }
            : { ...description, loading: true }
        }
      />
    )
  }
  const link: ResourceLink = { kind: 'run', projectId: run.projectId, runId: run.id }
  const story = run.storyId ? storyLabel?.(run.projectId, run.storyId) : undefined
  const view = runReferencePreview(run, { now: Date.now(), ...(story ? { story } : {}) })
  const chat =
    view.offersChat && onOpen
      ? {
          label: RUN_PREVIEW_OPEN_CHAT,
          onSelect: () => {
            void openChat().then((opened) => {
              if (opened) onOpen({ kind: 'chat', context: opened.context })
            })
          },
        }
      : undefined
  return (
    <ReferenceChip
      description={{ kind: 'run', label: run.title, link }}
      preview={view}
      {...(onOpen ? { onOpen } : {})}
      {...(view.status ? { status: view.status } : {})}
      {...(chat ? { secondary: chat } : {})}
    />
  )
}
