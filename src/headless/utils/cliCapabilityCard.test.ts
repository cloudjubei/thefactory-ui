import { describe, expect, it } from 'vitest'

import { cliCapabilityCardView } from './cliCapabilityCard'
import type { CliCapabilityCard } from './cliCapabilityCardTypes'

type Probe = CliCapabilityCard['probes'][number]

const probe = (over: Partial<Probe> = {}): Probe => ({
  id: 'p1',
  label: 'Structured output',
  status: 'pass',
  score: 1,
  detail: 'Valid JSON',
  latencyMs: 900,
  cases: [],
  ...over,
})

const card = (over: Partial<CliCapabilityCard> = {}): CliCapabilityCard => ({
  cli: 'codex',
  startedAt: '2026-10-19T10:00:00.000Z',
  finishedAt: '2026-10-19T10:01:00.000Z',
  probes: [probe()],
  passed: 1,
  applicable: 1,
  p50LatencyMs: 1234,
  ...over,
})

describe('cliCapabilityCardView', () => {
  it('sums up passes, the median call in seconds and when it finished', () => {
    const view = cliCapabilityCardView(card({ passed: 3, applicable: 5 }))
    expect(view.headline).toBe('3/5 probes passed')
    expect(view.latency).toBe('median call 1.2s')
    expect(view.finished).toBe(new Date('2026-10-19T10:01:00.000Z').toLocaleString())
    expect(view.cost).toBeUndefined()
  })

  it('shows a known cost and leaves out a missing finish time', () => {
    const view = cliCapabilityCardView(card({ totalCostUSD: 0.5, finishedAt: '' }))
    expect(view.cost).toBe('$0.50')
    expect(view.finished).toBeUndefined()
  })

  it("reads a plan's unknown charge as $? and names the plan beside it", () => {
    expect(cliCapabilityCardView(card({ cli: 'claude-code', costUnknown: true })).cost).toBe(
      '$? — included in your Claude subscription up to its allowance',
    )
    expect(
      cliCapabilityCardView(card({ cli: 'codex', totalCostUSD: 0.02, costUnknown: true })).cost,
    ).toBe('$0.02 + $? — included in your ChatGPT subscription up to its allowance')
  })

  it('labels each probe by its result, treating anything else as not applicable', () => {
    const view = cliCapabilityCardView(
      card({
        probes: [
          probe({ id: 'a', status: 'pass' }),
          probe({ id: 'b', status: 'fail' }),
          probe({ id: 'c', status: 'skipped' }),
        ],
      }),
    )
    expect(view.probes.map((p) => [p.id, p.tone, p.status])).toEqual([
      ['a', 'pass', 'PASS'],
      ['b', 'fail', 'FAIL'],
      ['c', 'none', 'N/A'],
    ])
  })

  it('lists only the explained cases, and only under a failed probe', () => {
    const cases: Probe['cases'] = [
      { input: 'x', expected: '1', actual: '1', status: 'pass', detail: 'matched' },
      { input: 'y', expected: '1', actual: '2', status: 'fail', detail: 'wrong value' },
      { input: 'z', expected: '1', actual: '2', status: 'fail' },
    ]
    const view = cliCapabilityCardView(
      card({ probes: [probe({ id: 'f', status: 'fail', cases }), probe({ id: 'p', cases })] }),
    )
    expect(view.probes[0]?.cases).toEqual([
      { key: 'x', tone: 'pass', mark: '✓', detail: 'matched' },
      { key: 'y', tone: 'fail', mark: '✗', detail: 'wrong value' },
    ])
    expect(view.probes[1]?.cases).toEqual([])
  })
})
