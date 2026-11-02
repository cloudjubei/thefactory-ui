import type { ReferenceDescription } from 'thefactory-tools/types'

import { NEEDS_YOU_REFERENCE_COPY } from './needsYouReferenceConstants'
import type { NeedsYouReferenceInput, NeedsYouReferenceView } from './needsYouReferenceTypes'
import type { ReferencePreview } from './referencePreviewTypes'
import { runNeedsYouItemParts, runNeedsYouOutcome } from './runNeedsYouView'
import { clipLine } from './textLine'

/**
 * A "Needs you" item a message points at, as its chip shows it: its leading
 * phrase, open or settled as a pill, and a preview card with the rest of it,
 * its run and how it was settled, opening it on its run. An item the run's
 * report no longer lists is gone. Pure.
 */
export function needsYouReferenceView({
  link,
  item,
  runTitle,
}: NeedsYouReferenceInput): NeedsYouReferenceView {
  if (!item) {
    return {
      description: {
        kind: 'run',
        label: NEEDS_YOU_REFERENCE_COPY.caption,
        detail: NEEDS_YOU_REFERENCE_COPY.gone,
        missing: true,
      },
    }
  }
  const { title, body } = runNeedsYouItemParts(item.text)
  const status: NonNullable<ReferencePreview['status']> = item.resolution
    ? { label: NEEDS_YOU_REFERENCE_COPY.settled, tone: 'done' }
    : { label: NEEDS_YOU_REFERENCE_COPY.open, tone: 'on_hold' }
  const description: ReferenceDescription = {
    kind: 'run',
    label: clipLine(title, NEEDS_YOU_REFERENCE_COPY.labelMaxChars),
    link,
  }
  return {
    description,
    status,
    card: {
      caption: NEEDS_YOU_REFERENCE_COPY.caption,
      title,
      status,
      lines: [
        ...(body ? [{ label: '', value: body }] : []),
        ...(runTitle ? [{ label: NEEDS_YOU_REFERENCE_COPY.run, value: runTitle }] : []),
        ...(item.resolution
          ? [
              {
                label: NEEDS_YOU_REFERENCE_COPY.outcome,
                value: runNeedsYouOutcome(item.resolution),
              },
            ]
          : []),
      ],
      primary: { label: NEEDS_YOU_REFERENCE_COPY.openOnRun, link },
    },
  }
}
