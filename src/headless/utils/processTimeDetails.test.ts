import type { ModelSpend, ProcessManagerTotals, ProcessTimeBreakdown } from 'thefactory-tools/types'
import { describe, expect, it } from 'vitest'

import { processTimeDetailsView } from './processTimeDetails'
import { PROCESS_TIME_MANAGER_LABEL, PROCESS_TIME_TOOLS_SHOWN } from './processTimeDetailsConstants'

const MIN = 60_000

const breakdown = (over: Partial<ProcessTimeBreakdown>): ProcessTimeBreakdown => ({
  thinkingMs: 0,
  toolMs: 0,
  systemMs: 0,
  otherMs: 0,
  runningMs: 0,
  waitingMs: 0,
  tools: [],
  ...over,
})

/** A story's Overall: 22m 58s of work, mostly a slow build. */
const overall = breakdown({
  thinkingMs: 6 * MIN + 10_000,
  toolMs: 14 * MIN + 48_000,
  systemMs: 2 * MIN,
  tools: [
    { name: 'mobileTestBuildApp', calls: 3, ms: 4 * MIN + 12_000 },
    { name: 'Bash', calls: 41, ms: 3 * MIN },
    { name: 'readPaths', calls: 1, ms: 20_000 },
    { name: 'grepFiles', calls: 9, ms: 10_000 },
  ],
})
const OVERALL_MS = 22 * MIN + 58_000

describe('processTimeDetailsView', () => {
  it('heads the details with the total the chip shows', () => {
    expect(processTimeDetailsView(overall, OVERALL_MS)?.total).toBe('22m 58s')
  })

  it('splits the total into thinking, tools and setup, each with its share', () => {
    expect(
      processTimeDetailsView(overall, OVERALL_MS)?.rows.map((r) => [r.label, r.value, r.share]),
    ).toEqual([
      ['Agent thinking', '6m 10s', '27%'],
      ['Tools & commands', '14m 48s', '64%'],
      ['Setup, checks & commits', '2m 00s', '9%'],
    ])
  })

  it('names the slowest tools with their calls, the slowest few only', () => {
    const tools = processTimeDetailsView(overall, OVERALL_MS)?.tools
    expect(tools).toHaveLength(PROCESS_TIME_TOOLS_SHOWN)
    expect(tools?.[0]).toEqual({ label: 'mobileTestBuildApp ×3', value: '4m 12s' })
    expect(tools?.[2]).toEqual({ label: 'readPaths', value: '20s' })
  })

  it('always lists thinking and tools, even when an agent recorded neither', () => {
    const view = processTimeDetailsView(breakdown({ systemMs: MIN }), MIN)
    expect(view?.rows.map((r) => [r.key, r.share])).toEqual([
      ['thinking', '0%'],
      ['tools', '0%'],
      ['system', '100%'],
    ])
  })

  it('reports time no record could place as other, never folded into a part', () => {
    const view = processTimeDetailsView(breakdown({ thinkingMs: MIN, otherMs: 3 * MIN }), 4 * MIN)
    expect(view?.rows.find((r) => r.key === 'other')).toMatchObject({
      label: 'Other',
      value: '3m 00s',
      share: '75%',
      fraction: 0.75,
    })
  })

  it('keeps the clock running on a step still going: the time since the totals were read is still running', () => {
    const view = processTimeDetailsView(breakdown({ thinkingMs: MIN, runningMs: MIN }), 5 * MIN)
    expect(view?.total).toBe('5m 00s')
    expect(view?.rows.find((r) => r.key === 'running')).toMatchObject({
      value: '4m 00s',
      share: '80%',
    })
  })

  it('says waiting on a person beside the total, never in it', () => {
    const view = processTimeDetailsView(breakdown({ toolMs: MIN, waitingMs: 12 * MIN }), MIN)
    expect(view?.waiting).toBe('12m 00s')
    expect(view?.total).toBe('1m 00s')
    expect(view?.rows.map((r) => r.share)).toEqual(['0%', '100%'])
  })

  it('says a wait for a turn behind other check runs apart from a wait on a person', () => {
    const view = processTimeDetailsView(
      breakdown({ systemMs: MIN, waitingMs: 9 * MIN, queuedMs: 4 * MIN }),
      MIN,
    )
    expect(view).toMatchObject({ waiting: '5m 00s', queued: '4m 00s', total: '1m 00s' })
  })

  it('says only the wait for a turn when nobody was waited on', () => {
    const view = processTimeDetailsView(breakdown({ waitingMs: 3 * MIN, queuedMs: 3 * MIN }), 0)
    expect(view?.queued).toBe('3m 00s')
    expect(view).not.toHaveProperty('waiting')
  })

  it('says nothing of waiting when there was none', () => {
    expect(processTimeDetailsView(overall, OVERALL_MS)).not.toHaveProperty('waiting')
  })

  it('reads a sliver of the total as under a percent, never as nothing', () => {
    const view = processTimeDetailsView(
      breakdown({ thinkingMs: 1_000, toolMs: 999_000 }),
      1_000_000,
    )
    expect(view?.rows[0].share).toBe('<1%')
  })

  it('lists no tool that took no time', () => {
    const view = processTimeDetailsView(
      breakdown({ toolMs: MIN, tools: [{ name: 'Read', calls: 1, ms: 0 }] }),
      MIN,
    )
    expect(view?.tools).toEqual([])
  })

  it('has no details for totals without a breakdown, or with no time at all', () => {
    expect(processTimeDetailsView(undefined, MIN)).toBeUndefined()
    expect(processTimeDetailsView(breakdown({}), 0)).toBeUndefined()
  })

  it('still opens for a gate that only waited', () => {
    expect(processTimeDetailsView(breakdown({ waitingMs: MIN }), 0)?.waiting).toBe('1m 00s')
  })
})

describe('processTimeDetailsView — the agent manager', () => {
  const spend = (over: Partial<ModelSpend>): ModelSpend => ({
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    billing: 'metered',
    inputTokens: 1_000,
    outputTokens: 200,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...over,
  })
  const manager = (over: Partial<ProcessManagerTotals>): ProcessManagerTotals => ({
    turns: 2,
    workMs: 3 * MIN,
    time: breakdown({ thinkingMs: 3 * MIN }),
    ...over,
  })

  it('adds a line with what its turns cost and how long they worked', () => {
    const view = processTimeDetailsView(
      overall,
      OVERALL_MS,
      manager({ costUsd: 0.42, byModel: [spend({ costUsd: 0.42 })] }),
    )
    expect(view?.manager).toEqual({ label: PROCESS_TIME_MANAGER_LABEL, value: '$0.42 · 3m 00s' })
  })

  it('says a subscription’s share is unknown rather than $0.00', () => {
    const view = processTimeDetailsView(
      overall,
      OVERALL_MS,
      manager({
        costUsd: 0,
        includedTokens: 1_200,
        byModel: [spend({ billing: 'subscription', costUsd: 0 })],
      }),
    )
    expect(view?.manager?.value).toBe('Unknown (subscription) · 3m 00s')
  })

  it('says a cost with no known price is unknown', () => {
    const view = processTimeDetailsView(
      overall,
      OVERALL_MS,
      manager({ unpricedTokens: 1_200, byModel: [spend({})] }),
    )
    expect(view?.manager?.value).toBe('No known price · 3m 00s')
  })

  it('gives only the time when its turns measured no cost', () => {
    expect(processTimeDetailsView(overall, OVERALL_MS, manager({}))?.manager?.value).toBe('3m 00s')
  })

  it('has no line when the manager took no turns on the run', () => {
    expect(processTimeDetailsView(overall, OVERALL_MS)).not.toHaveProperty('manager')
  })
})
