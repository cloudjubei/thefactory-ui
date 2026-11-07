import { describe, expect, it, vi } from 'vitest'

import { processLaunchDrafts } from './processLaunchDrafts'

const draft = { values: { days: '7' }, nextKey: 0 }

describe('processLaunchDrafts', () => {
  it('keeps a draft by key and tells whoever listens', () => {
    const heard = vi.fn()
    const stop = processLaunchDrafts.listen('a', heard)
    processLaunchDrafts.write('a', draft)
    expect(processLaunchDrafts.read('a')).toBe(draft)
    expect(heard).toHaveBeenCalledTimes(1)
    processLaunchDrafts.clear('a')
    expect(processLaunchDrafts.read('a')).toBeUndefined()
    expect(heard).toHaveBeenCalledTimes(2)
    stop()
    processLaunchDrafts.write('a', draft)
    expect(heard).toHaveBeenCalledTimes(2)
    processLaunchDrafts.clear('a')
  })

  it('tells only the listeners of that key', () => {
    const other = vi.fn()
    const stop = processLaunchDrafts.listen('b', other)
    processLaunchDrafts.write('c', draft)
    expect(other).not.toHaveBeenCalled()
    stop()
    processLaunchDrafts.clear('c')
  })
})
