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
  PROCESS_CLEANUP_DEVICE_OUTCOME_LABELS,
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
  it('words a device the run started, and what stopping it came to', () => {
    const rows = processCleanupRows(
      list({
        items: [
          item('d1', { kind: 'device', label: 'Android emulator Pixel_7 (emulator-5554)' }),
          item('d2', { kind: 'device', label: 'iOS simulator iPhone 16' }),
          item('d3', { kind: 'device', label: 'Android emulator Pixel_8' }),
          item('d4', { kind: 'device', label: 'Android emulator Tablet' }),
          item('p1'),
        ],
        report: {
          outcomes: [
            { itemId: 'd1', kind: 'device', label: 'Pixel_7', status: 'removed' },
            { itemId: 'd2', kind: 'device', label: 'iPhone 16', status: 'not-found' },
            { itemId: 'd3', kind: 'device', label: 'Pixel_8', status: 'refused' },
            { itemId: 'd4', kind: 'device', label: 'Tablet', status: 'failed', detail: 'adb: no' },
            { itemId: 'p1', kind: 'path', label: 'p1', status: 'removed' },
          ],
          keptIds: [],
        },
      }),
    )
    expect(rows.map((r) => [r.kindLabel, r.outcome?.label])).toEqual([
      ['Device', 'Stopped'],
      ['Device', 'Not running'],
      ['Device', 'Kept — not allowed'],
      ['Device', 'Could not stop'],
      [PROCESS_CLEANUP_KIND_LABELS.path, PROCESS_CLEANUP_OUTCOME_LABELS.removed],
    ])
    expect(rows[0].label).toBe('Android emulator Pixel_7 (emulator-5554)')
    expect(rows[3].outcome?.detail).toBe('adb: no')
    expect(PROCESS_CLEANUP_DEVICE_OUTCOME_LABELS.removed).toBe('Stopped')
  })

  it('words a stopped device the list no longer holds the same way', () => {
    const rows = processCleanupRows(
      list({
        report: {
          outcomes: [{ itemId: 'd', kind: 'device', label: 'Pixel_7', status: 'removed' }],
          keptIds: [],
        },
      }),
    )
    expect(rows[0]).toEqual(
      expect.objectContaining({
        kindLabel: 'Device',
        outcome: { status: 'removed', label: 'Stopped' },
      }),
    )
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
