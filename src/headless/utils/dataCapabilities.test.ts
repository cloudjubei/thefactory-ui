import { describe, it, expect, vi } from 'vitest'
import { persistAppDataCapabilities } from './dataCapabilities'
import { DATA_CAPABILITY_RECORD_KEY, DATA_CAPABILITY_RECORD_TYPE } from 'thefactory-tools/constants'

const MANIFEST = {
  types: [{ type: 'run', label: 'Run' }],
  activities: ['train'],
}

describe('persistAppDataCapabilities', () => {
  it('persists a valid manifest as the data-capability record', async () => {
    const put = vi.fn(async () => ({}))
    const ok = await persistAppDataCapabilities('p1', MANIFEST, put)
    expect(ok).toBe(true)
    expect(put).toHaveBeenCalledWith('p1', {
      type: DATA_CAPABILITY_RECORD_TYPE,
      key: DATA_CAPABILITY_RECORD_KEY,
      content: MANIFEST,
    })
  })

  it('ignores a malformed manifest without writing', async () => {
    const put = vi.fn(async () => ({}))
    expect(await persistAppDataCapabilities('p1', { nope: true }, put)).toBe(false)
    expect(put).not.toHaveBeenCalled()
  })

  it('ignores an absent manifest (app declared no data block)', async () => {
    const put = vi.fn(async () => ({}))
    expect(await persistAppDataCapabilities('p1', undefined, put)).toBe(false)
    expect(put).not.toHaveBeenCalled()
  })

  it('does not throw when the write fails (best-effort)', async () => {
    const put = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(persistAppDataCapabilities('p1', MANIFEST, put)).resolves.toBe(false)
  })
})
