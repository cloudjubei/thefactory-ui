import { describe, expect, it } from 'vitest'
import { storyReadinessView } from './storyReadinessView'

const READY = {
  description: 'The spec.',
  plan: '1. Build it.',
  blockers: [],
  features: [
    {
      id: 'f1',
      title: 'Queue panel',
      status: 'pending',
      acceptance: 'Moves work.',
      plan: '1. Hook.',
      context: ['src/headless'],
    },
  ],
}

describe('storyReadinessView', () => {
  it('reads a story with a spec, a plan and features ready to work as ready', () => {
    expect(storyReadinessView(READY as never)).toEqual({
      ready: true,
      label: 'Ready',
      tone: 'done',
      problems: [],
    })
  })

  it('lists what a story lacks, each with its feature, and counts them on the badge', () => {
    const view = storyReadinessView({
      ...READY,
      plan: '',
      features: [{ ...READY.features[0], acceptance: '', context: [] }],
    } as never)
    expect(view.ready).toBe(false)
    expect(view.tone).toBe('on_hold')
    expect(view.label).toBe('Not ready · 3')
    expect(view.problems.map((p) => [p.kind, p.featureId])).toEqual([
      ['plan', undefined],
      ['acceptance', 'f1'],
      ['context', 'f1'],
    ])
    expect(view.problems[1]?.message).toMatch(/Queue panel/)
    expect(new Set(view.problems.map((p) => p.key)).size).toBe(3)
  })
})
