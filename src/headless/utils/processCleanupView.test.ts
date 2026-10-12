import { describe, expect, it } from 'vitest'
import type { ProcessCleanupList, ProcessCleanupListItem } from 'thefactory-tools/types'
import {
  processCleanupEditable,
  processCleanupHeadline,
  processCleanupRows,
} from './processCleanupView'
import {
  PROCESS_CLEANUP_BY_LABELS,
  PROCESS_CLEANUP_COPY,
  PROCESS_CLEANUP_KIND_LABELS,
  PROCESS_CLEANUP_OUTCOME_LABELS,
} from './processCleanupViewConstants'

const item = (id: string, over: Partial<ProcessCleanupListItem> = {}): ProcessCleanupListItem => ({
  id,
  kind: 'path',
  ref: id,
  label: id,
  reason: 'r',
  registeredBy: 'host',
  defaultSelected: true,
  selected: true,
  ...over,
})

const list = (over: Partial<ProcessCleanupList> = {}): ProcessCleanupList => ({
  runId: 'r1',
  items: [],
  off: false,
  hasStep: true,
  ...over,
})

describe('processCleanupRows', () => {
  it('words each item: its kind, who registered it, whether it goes', () => {
    const rows = processCleanupRows(
      list({ items: [item('a', { kind: 'story-note', registeredBy: 'agent', selected: false })] }),
    )
    expect(rows).toEqual([
      {
        id: 'a',
        label: 'a',
        kindLabel: PROCESS_CLEANUP_KIND_LABELS['story-note'],
        reason: 'r',
        byLabel: PROCESS_CLEANUP_BY_LABELS.agent,
        selected: false,
      },
    ])
  })

  it('carries what the step did with each item once it ran', () => {
    const rows = processCleanupRows(
      list({
        items: [item('a'), item('b')],
        report: {
          outcomes: [{ itemId: 'a', kind: 'path', label: 'a', status: 'failed', detail: 'locked' }],
          keptIds: ['b'],
        },
      }),
    )
    expect(rows[0].outcome).toEqual({
      status: 'failed',
      label: PROCESS_CLEANUP_OUTCOME_LABELS.failed,
      detail: 'locked',
    })
    expect(rows[1].outcome).toBeUndefined()
  })

  it('lists what the step removed even after it is gone from the list', () => {
    const rows = processCleanupRows(
      list({
        items: [],
        report: {
          outcomes: [{ itemId: 'x', kind: 'branch', label: 'scratch', status: 'removed' }],
          keptIds: [],
        },
      }),
    )
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'x',
        label: 'scratch',
        kindLabel: PROCESS_CLEANUP_KIND_LABELS.branch,
        selected: true,
        outcome: { status: 'removed', label: PROCESS_CLEANUP_OUTCOME_LABELS.removed },
      }),
    ])
  })
})

describe('processCleanupHeadline', () => {
  it('counts what will be removed', () => {
    expect(
      processCleanupHeadline(list({ items: [item('a'), item('b', { selected: false })] })),
    ).toBe(PROCESS_CLEANUP_COPY.willRemove(1, 2))
  })

  it('says when it is switched off', () => {
    expect(processCleanupHeadline(list({ items: [item('a')], off: true }))).toBe(
      PROCESS_CLEANUP_COPY.off,
    )
  })

  it('says when nothing is registered', () => {
    expect(processCleanupHeadline(list())).toBe(PROCESS_CLEANUP_COPY.empty)
  })

  it('says when the process has no cleanup step', () => {
    expect(processCleanupHeadline(list({ items: [item('a')], hasStep: false }))).toBe(
      PROCESS_CLEANUP_COPY.noStep,
    )
  })

  it('says what the step did, once it ran', () => {
    expect(
      processCleanupHeadline(
        list({
          report: {
            outcomes: [{ itemId: 'a', kind: 'path', label: 'a', status: 'removed' }],
            keptIds: [],
          },
        }),
      ),
    ).toBe('Removed 1 item.')
  })
})

describe('processCleanupEditable', () => {
  it('lets the person change the list before the step runs', () => {
    expect(processCleanupEditable(list())).toBe(true)
  })

  it('freezes it once the step ran', () => {
    expect(processCleanupEditable(list({ report: { outcomes: [], keptIds: [] } }))).toBe(false)
  })

  it('freezes it when there is no step to carry it out', () => {
    expect(processCleanupEditable(list({ hasStep: false }))).toBe(false)
  })
})
