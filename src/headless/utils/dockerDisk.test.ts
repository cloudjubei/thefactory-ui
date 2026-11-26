import { describe, expect, it } from 'vitest'
import {
  dockerDiskAfterClear,
  dockerDiskFacts,
  dockerDiskResizing,
  formatDiskGb,
  resizeLabel,
} from './dockerDisk'
import type { DockerDisk } from './dockerDiskTypes'

const GB = 1_000_000_000

function disk(over: Partial<DockerDisk> = {}): DockerDisk {
  return {
    usedBytes: 36 * GB,
    allocatedBytes: 64 * GB,
    reclaimableBytes: 12.5 * GB,
    resize: { currentGb: 64, maxGb: 164 },
    resizing: false,
    ...over,
  }
}

describe('formatDiskGb', () => {
  it.each([
    [0, '0 GB'],
    [64 * GB, '64 GB'],
    [35.74 * GB, '35.7 GB'],
    [0.04 * GB, '0 GB'],
    [28.85 * GB, '28.9 GB'],
  ])('%d bytes reads %s', (bytes, text) => {
    expect(formatDiskGb(bytes)).toBe(text)
  })
})

describe('dockerDiskFacts', () => {
  it('describes a disk with room, something to clear and room to grow', () => {
    expect(dockerDiskFacts(disk())).toEqual({
      usedPercent: 56,
      usageLine: '36 GB used of 64 GB · 28 GB free',
      nearlyFull: false,
      clearLabel: 'Clear 12.5 GB',
      canClear: true,
      sizeLine: '64 GB, up to 164 GB',
      canResize: true,
    })
  })

  it('flags a nearly full disk', () => {
    const facts = dockerDiskFacts(disk({ usedBytes: 63.5 * GB }))
    expect(facts.nearlyFull).toBe(true)
    expect(facts.usedPercent).toBe(99)
  })

  it('caps an over-full reading at 100 and never shows negative free space', () => {
    const facts = dockerDiskFacts(disk({ usedBytes: 70 * GB }))
    expect(facts.usedPercent).toBe(100)
    expect(facts.usageLine).toBe('70 GB used of 64 GB · 0 GB free')
  })

  it('has nothing to clear when the cache is empty', () => {
    expect(dockerDiskFacts(disk({ reclaimableBytes: 0 }))).toMatchObject({
      clearLabel: 'Nothing to clear',
      canClear: false,
    })
  })

  it('offers no resize where Docker has no size setting', () => {
    expect(dockerDiskFacts(disk({ resize: undefined }))).toMatchObject({
      sizeLine: null,
      canResize: false,
    })
  })

  it('offers no resize when the computer has no room', () => {
    expect(dockerDiskFacts(disk({ resize: { currentGb: 64, maxGb: 64 } }))).toMatchObject({
      sizeLine: '64 GB',
      canResize: false,
    })
  })

  it('offers nothing while Docker restarts', () => {
    expect(dockerDiskFacts(disk({ resizing: true }))).toMatchObject({
      canClear: false,
      canResize: false,
    })
  })

  it('reads zero percent before any reading was taken', () => {
    const facts = dockerDiskFacts(
      disk({ usedBytes: 0, allocatedBytes: 0, reclaimableBytes: 0, resize: undefined }),
    )
    expect(facts.usedPercent).toBe(0)
  })
})

describe('dockerDiskAfterClear', () => {
  it('takes what can be cleared off the used space at once', () => {
    expect(dockerDiskAfterClear(disk())).toMatchObject({
      usedBytes: 23.5 * GB,
      reclaimableBytes: 0,
      allocatedBytes: 64 * GB,
    })
  })

  it('never goes below zero', () => {
    expect(dockerDiskAfterClear(disk({ usedBytes: GB, reclaimableBytes: 5 * GB })).usedBytes).toBe(
      0,
    )
  })
})

describe('dockerDiskResizing', () => {
  it('marks the disk as restarting and drops an earlier failure', () => {
    expect(dockerDiskResizing(disk({ resizeError: 'Docker did not stop' }))).toEqual(
      disk({ resizing: true }),
    )
  })
})

describe('resizeLabel', () => {
  it('names the chosen size', () => {
    expect(resizeLabel(100)).toBe('Resize to 100 GB')
  })
})
