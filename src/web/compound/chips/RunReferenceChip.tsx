import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { RUN_PREVIEW_OPEN_CHAT, runReferencePreview, useProcessRun } from '../../../headless'
import ReferenceChip from './ReferenceChip'
import ReferencePreviewCard from './ReferencePreviewCard'
import { referenceGlyph } from './referenceGlyphs'

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
 * A process run a message points at, kept live: its title and its status as a
 * pill, a preview with its story, where it waits, its time and cost, and the
 * buttons to its sign-off and its own chat. Neutral while it is read; dashed
 * once it is gone.
 */
export default function RunReferenceChip({
  runId,
  description,
  onOpen,
  storyLabel,
}: RunReferenceChipProps) {
  const { run, isLoaded, loadError, openChat } = useProcessRun(runId)
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
  const live: ReferenceDescription = { kind: 'run', label: run.title, link }
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
      description={live}
      {...(onOpen ? { onOpen } : {})}
      {...(view.status ? { status: view.status } : {})}
      card={
        <ReferencePreviewCard
          view={view}
          glyph={referenceGlyph(live)}
          {...(onOpen ? { onOpen } : {})}
          {...(chat ? { secondary: chat } : {})}
        />
      }
    />
  )
}
