import { describe, expect, it } from 'vitest'
import { isInsideTooltipRegions, tooltipBlurAction } from './tooltipUtils'
import type { TooltipRegion } from './tooltipTypes'

function region(...members: object[]): TooltipRegion {
  const set = new Set<unknown>(members)
  return { contains: (node) => set.has(node) }
}

const anchor = {}
const anchorChild = {}
const content = {}
const contentChip = {}
const elsewhere = {}
const regions = [region(anchor, anchorChild), region(content, contentChip)]

describe('isInsideTooltipRegions', () => {
  it('is true for a target inside the anchor or the tooltip content', () => {
    expect(isInsideTooltipRegions(anchorChild as EventTarget, regions)).toBe(true)
    expect(isInsideTooltipRegions(contentChip as EventTarget, regions)).toBe(true)
  })

  it('is false for a target outside every region', () => {
    expect(isInsideTooltipRegions(elsewhere as EventTarget, regions)).toBe(false)
  })

  it('is false without a target', () => {
    expect(isInsideTooltipRegions(null, regions)).toBe(false)
  })

  it('skips regions that are not mounted', () => {
    expect(isInsideTooltipRegions(contentChip as EventTarget, [null, undefined])).toBe(false)
    expect(isInsideTooltipRegions(contentChip as EventTarget, [null, regions[1]])).toBe(true)
  })
})

describe('tooltipBlurAction', () => {
  it('keeps the tooltip open when focus moves into its content, pinned or not', () => {
    for (const pinned of [true, false]) {
      expect(tooltipBlurAction({ nextFocus: contentChip as EventTarget, regions, pinned })).toBe(
        'keep',
      )
    }
  })

  it('keeps the tooltip open when focus moves back to the anchor', () => {
    expect(tooltipBlurAction({ nextFocus: anchor as EventTarget, regions, pinned: false })).toBe(
      'keep',
    )
  })

  it('closes when focus moves somewhere else, even when pinned', () => {
    for (const pinned of [true, false]) {
      expect(tooltipBlurAction({ nextFocus: elsewhere as EventTarget, regions, pinned })).toBe(
        'close',
      )
    }
  })

  it('keeps a pinned tooltip open when focus goes nowhere', () => {
    expect(tooltipBlurAction({ nextFocus: null, regions, pinned: true })).toBe('keep')
  })

  it('closes an unpinned tooltip when focus goes nowhere', () => {
    expect(tooltipBlurAction({ nextFocus: null, regions, pinned: false })).toBe('close')
  })

  it('closes when no region is mounted to receive focus', () => {
    expect(
      tooltipBlurAction({ nextFocus: contentChip as EventTarget, regions: [null], pinned: true }),
    ).toBe('close')
  })
})
