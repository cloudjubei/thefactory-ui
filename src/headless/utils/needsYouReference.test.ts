import { describe, expect, it } from 'vitest'
import { processNeedsYouItemId } from 'thefactory-tools/utils'
import type { ProcessNeedsYouItem } from 'thefactory-tools/types'

import { needsYouReferenceView } from './needsYouReference'
import { NEEDS_YOU_REFERENCE_COPY } from './needsYouReferenceConstants'

const RUN = '66666666-6666-4666-8666-666666666666'
const TEXT =
  'Sign-off despite Verify failing — decide whether the logs are enough to merge on, or rerun Verify first.'
const ID = processNeedsYouItemId(TEXT)
const LINK = { kind: 'run' as const, projectId: 'backend', runId: RUN, needsYouItemId: ID }

const item = (over: Partial<ProcessNeedsYouItem> = {}): ProcessNeedsYouItem => ({
  id: ID,
  text: TEXT,
  ...over,
})

describe('needsYouReferenceView', () => {
  it('reads an open item by its leading phrase, open, opening it on its run', () => {
    const view = needsYouReferenceView({ link: LINK, item: item(), runTitle: 'Read PDFs' })
    expect(view.description).toEqual({
      kind: 'run',
      label: 'Sign-off despite Verify failing',
      link: LINK,
    })
    expect(view.status).toEqual({ label: NEEDS_YOU_REFERENCE_COPY.open, tone: 'on_hold' })
    expect(view.card).toEqual({
      caption: NEEDS_YOU_REFERENCE_COPY.caption,
      title: 'Sign-off despite Verify failing',
      status: { label: NEEDS_YOU_REFERENCE_COPY.open, tone: 'on_hold' },
      lines: [
        {
          label: '',
          value: 'decide whether the logs are enough to merge on, or rerun Verify first.',
        },
        { label: NEEDS_YOU_REFERENCE_COPY.run, value: 'Read PDFs' },
      ],
      primary: { label: NEEDS_YOU_REFERENCE_COPY.openOnRun, link: LINK },
    })
  })

  it('clips an item with no leading phrase to a chip’s length, keeping it whole on the card', () => {
    const long = 'x '.repeat(80).trim()
    const view = needsYouReferenceView({ link: LINK, item: item({ text: long }) })
    expect(view.description.label.length).toBeLessThanOrEqual(
      NEEDS_YOU_REFERENCE_COPY.labelMaxChars,
    )
    expect(view.description.label.endsWith('…')).toBe(true)
    expect(view.card?.title).toBe(long)
    expect(view.card?.lines).toEqual([])
  })

  it('says how a settled item was settled', () => {
    const view = needsYouReferenceView({
      link: LINK,
      item: item({
        resolution: { itemId: ID, text: TEXT, kind: 'resolved', summary: 'Rerun Verify', at: 1 },
      }),
    })
    expect(view.status).toEqual({ label: NEEDS_YOU_REFERENCE_COPY.settled, tone: 'done' })
    expect(view.card?.lines).toContainEqual({
      label: NEEDS_YOU_REFERENCE_COPY.outcome,
      value: 'Decided: Rerun Verify',
    })
  })

  it('shows an item the run’s report no longer lists as gone, opening nothing', () => {
    const view = needsYouReferenceView({ link: LINK, item: undefined })
    expect(view).toEqual({
      description: {
        kind: 'run',
        label: NEEDS_YOU_REFERENCE_COPY.caption,
        detail: NEEDS_YOU_REFERENCE_COPY.gone,
        missing: true,
      },
    })
  })
})
