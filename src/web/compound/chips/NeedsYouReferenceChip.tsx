import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import {
  needsYouReferenceView,
  useProcessRun,
  useRunNeedsYouItems,
  type NeedsYouItemLink,
  type NeedsYouReferenceView,
} from '../../../headless'
import { IconExclamation } from '../../icons'
import ReferenceChip from './ReferenceChip'
import ReferencePreviewCard from './ReferencePreviewCard'

export type NeedsYouReferenceChipProps = {
  runId: string
  needsYouItemId: string
  /** How the reference reads before the run's report is read. */
  description: ReferenceDescription
  onOpen?: (link: ResourceLink) => void
}

export type NeedsYouReferenceChipViewProps = {
  /** The item as its chip shows it; absent while its run's report is read. */
  view: NeedsYouReferenceView | undefined
  /** How the reference reads while it is read. */
  description: ReferenceDescription
  onOpen?: (link: ResourceLink) => void
}

/**
 * A "Needs you" item as a chip, from {@link needsYouReferenceView}: its leading
 * phrase with open or settled as a pill, a preview with the rest of it, its run
 * and how it was settled, and a click that opens it on its run. Neutral while
 * it is read; dashed once the report no longer lists it.
 */
export function NeedsYouReferenceChipView({
  view,
  description,
  onOpen,
}: NeedsYouReferenceChipViewProps) {
  if (!view) {
    return <ReferenceChip description={{ ...description, loading: true }} glyph={IconExclamation} />
  }
  return (
    <ReferenceChip
      description={view.description}
      glyph={IconExclamation}
      {...(onOpen ? { onOpen } : {})}
      {...(view.status ? { status: view.status } : {})}
      {...(view.card
        ? {
            card: (
              <ReferencePreviewCard
                view={view.card}
                glyph={IconExclamation}
                {...(onOpen ? { onOpen } : {})}
              />
            ),
          }
        : {})}
    />
  )
}

/**
 * A "Needs you" item of a run's final report that a message points at, kept
 * live as {@link NeedsYouReferenceChipView}: read once per run however many
 * chips point into it, and again whenever the run changes.
 */
export default function NeedsYouReferenceChip({
  runId,
  needsYouItemId,
  description,
  onOpen,
}: NeedsYouReferenceChipProps) {
  const items = useRunNeedsYouItems(runId)
  const { run } = useProcessRun(runId)
  const projectId = description.link?.kind === 'run' ? description.link.projectId : run?.projectId
  const link: NeedsYouItemLink | undefined = projectId
    ? { kind: 'run', projectId, runId, needsYouItemId }
    : undefined
  const view =
    link && items.status !== 'loading'
      ? needsYouReferenceView({
          link,
          item:
            items.status === 'ready' ? items.items.find((i) => i.id === needsYouItemId) : undefined,
          ...(run ? { runTitle: run.title } : {}),
        })
      : undefined
  return (
    <NeedsYouReferenceChipView
      view={view}
      description={description}
      {...(onOpen ? { onOpen } : {})}
    />
  )
}
