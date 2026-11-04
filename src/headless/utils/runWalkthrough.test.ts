import { describe, expect, it } from 'vitest'
import { loomLinkProblem, loomWalkthroughView } from './runWalkthrough'
import type { RunWalkthroughItem, RunWalkthroughState } from './runWalkthroughTypes'

const item = (id: string, over: Partial<RunWalkthroughItem> = {}): RunWalkthroughItem => ({
  id,
  projectId: 'web',
  evidenceId: `e-${id}`,
  title: `Title ${id}`,
  open: 'The checkout page',
  steps: ['Add an item', 'Pay'],
  mustShow: ['The total'],
  ...over,
})

const state = (over: Partial<RunWalkthroughState> = {}): RunWalkthroughState => ({
  items: undefined,
  sending: {},
  errors: {},
  ...over,
})

describe('a Loom link', () => {
  it.each([['https://www.loom.com/share/1'], ['http://loom.local/2'], ['  https://a.b/c  ']])(
    'takes %s',
    (url) => {
      expect(loomLinkProblem(url)).toBeUndefined()
    },
  )

  it.each([['loom.com/share/1'], ['ftp://a.b/c'], ['javascript:alert(1)']])('refuses %s', (url) => {
    expect(loomLinkProblem(url)).toBe('A link must start with http:// or https://.')
  })

  it('says nothing of a box still empty', () => {
    expect(loomLinkProblem('   ')).toBeUndefined()
  })
})

describe('the walkthrough’s view', () => {
  it('is nothing until read, and nothing for a run with no items', () => {
    expect(loomWalkthroughView(state())).toBeUndefined()
    expect(loomWalkthroughView(state({ items: [] }))).toBeUndefined()
  })

  it('lists each step with what to open, do and show, numbered', () => {
    const view = loomWalkthroughView(state({ items: [item('a'), item('b')] }))
    expect(view?.rows[1]).toMatchObject({
      id: 'b',
      number: 2,
      title: 'Title b',
      open: 'The checkout page',
      steps: ['Add an item', 'Pay'],
      mustShow: ['The total'],
      state: 'To record',
      recorded: false,
    })
    expect(view?.left).toBe(2)
    expect(view?.summary).toBe('2 of 2 still to record.')
    expect(view?.firstOpen).toBe('a')
  })

  it('shows a link and a video apart, and opens the first still to record', () => {
    const view = loomWalkthroughView(
      state({
        items: [
          item('a', {
            result: { kind: 'link', url: 'https://www.loom.com/share/1', evidenceId: 'r1' },
          }),
          item('b', { result: { kind: 'video', name: 'clip.mp4', evidenceId: 'r2' } }),
          item('c'),
        ],
      }),
    )
    expect(view?.rows[0]).toMatchObject({
      recorded: true,
      state: 'Recorded',
      result: { kind: 'link', url: 'https://www.loom.com/share/1', label: 'Loom link' },
    })
    expect(view?.rows[1]?.result).toEqual({ kind: 'file', label: 'clip.mp4' })
    expect(view?.left).toBe(1)
    expect(view?.firstOpen).toBe('c')
  })

  it.each([['image' as const], ['file' as const]])('names an attached %s', (kind) => {
    const view = loomWalkthroughView(
      state({ items: [item('a', { result: { kind, name: 'proof.png', evidenceId: 'r' } })] }),
    )
    expect(view?.rows[0]).toMatchObject({
      recorded: true,
      result: { kind: 'file', label: 'proof.png' },
    })
  })

  it('leaves nothing to open once everything is recorded', () => {
    const video = { kind: 'video' as const, name: 'a.mp4', evidenceId: 'r' }
    const one = loomWalkthroughView(state({ items: [item('a', { result: video })] }))
    expect(one?.summary).toBe('Recorded.')
    expect(one?.firstOpen).toBeUndefined()
    const two = loomWalkthroughView(
      state({ items: [item('a', { result: video }), item('b', { result: video })] }),
    )
    expect(two?.summary).toBe('All 2 recorded.')
  })

  it('never makes a link of anything but a web page', () => {
    const view = loomWalkthroughView(
      state({
        items: [
          item('a', { result: { kind: 'link', url: 'javascript:alert(1)', evidenceId: 'r' } }),
        ],
      }),
    )
    expect(view?.rows[0]?.result).toEqual({ kind: 'file', label: 'Loom link' })
  })

  it('says what is on its way and how far it got', () => {
    const view = loomWalkthroughView(
      state({
        items: [item('a'), item('b'), item('c')],
        sending: {
          a: { kind: 'link' },
          b: { kind: 'file', sentBytes: 25, totalBytes: 100 },
          c: { kind: 'file' },
        },
      }),
    )
    expect(view?.rows.map((r) => r.sending)).toEqual([
      'Adding the link…',
      'Uploading… 25%',
      'Uploading…',
    ])
  })

  it('says why an attachment failed, on its own row', () => {
    const view = loomWalkthroughView(
      state({ items: [item('a'), item('b')], errors: { b: 'Too large.' } }),
    )
    expect(view?.rows[0]?.error).toBeUndefined()
    expect(view?.rows[1]?.error).toBe('Too large.')
  })
})
