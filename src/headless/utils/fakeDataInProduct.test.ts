import { describe, expect, it } from 'vitest'

import {
  fakeDataInProductLine,
  groupLaunchFakeDataChoices,
  groupLaunchFakeDataMetadata,
  isFakeDataInProduct,
  launchFakeDataChoice,
  launchFakeDataMetadata,
  launchFakeDataOffered,
  readProcessFakeDataInProduct,
  withProcessFakeDataInProduct,
} from './fakeDataInProduct'
import {
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  PROCESS_FAKE_DATA_IN_PRODUCT_KEY,
} from './fakeDataInProductConstants'

describe('isFakeDataInProduct', () => {
  it('holds for the two choices only', () => {
    expect(isFakeDataInProduct('ship')).toBe(true)
    expect(isFakeDataInProduct('keep-out')).toBe(true)
    for (const other of [undefined, null, '', 'keep', 'KEEP-OUT', true, 0, {}, ['ship']]) {
      expect(isFakeDataInProduct(other)).toBe(false)
    }
  })
})

describe('readProcessFakeDataInProduct', () => {
  it('reads a stored choice', () => {
    expect(readProcessFakeDataInProduct('keep-out')).toBe('keep-out')
    expect(readProcessFakeDataInProduct('ship')).toBe('ship')
  })

  it('reads anything else, absent included, as ship', () => {
    for (const other of [undefined, null, '', 'keep', false, 1, { value: 'keep-out' }]) {
      expect(readProcessFakeDataInProduct(other)).toBe('ship')
    }
  })
})

describe('withProcessFakeDataInProduct', () => {
  it('sets the choice under the project key, keeping every other key', () => {
    const metadata = { icon: 'folder', processDefaultCaps: { maxIterations: 2 } }
    expect(withProcessFakeDataInProduct(metadata, 'keep-out')).toEqual({
      icon: 'folder',
      processDefaultCaps: { maxIterations: 2 },
      [PROCESS_FAKE_DATA_IN_PRODUCT_KEY]: 'keep-out',
    })
  })

  it('keeps ship as said, so a save sets it over a stored keep-out', () => {
    expect(
      withProcessFakeDataInProduct({ [PROCESS_FAKE_DATA_IN_PRODUCT_KEY]: 'keep-out' }, 'ship'),
    ).toEqual({ [PROCESS_FAKE_DATA_IN_PRODUCT_KEY]: 'ship' })
  })

  it('leaves the metadata it was given as it was', () => {
    const metadata = { icon: 'folder' }
    withProcessFakeDataInProduct(metadata, 'keep-out')
    expect(metadata).toEqual({ icon: 'folder' })
  })
})

describe('launchFakeDataOffered', () => {
  it('reads the choice a launch preview carries', () => {
    expect(launchFakeDataOffered({ processId: 'story', fakeDataInProduct: 'keep-out' })).toBe(
      'keep-out',
    )
    expect(launchFakeDataOffered({ fakeDataInProduct: 'ship' })).toBe('ship')
  })

  it('offers nothing when the preview carries none, or nothing it can be', () => {
    for (const preview of [
      undefined,
      null,
      'keep-out',
      {},
      { fakeDataInProduct: undefined },
      { fakeDataInProduct: 'keep' },
      { fakeDataInProduct: true },
    ]) {
      expect(launchFakeDataOffered(preview)).toBeUndefined()
    }
  })
})

describe('launchFakeDataChoice', () => {
  it('starts from what the preview offered', () => {
    expect(launchFakeDataChoice('keep-out', undefined)).toBe('keep-out')
    expect(launchFakeDataChoice('ship', undefined)).toBe('ship')
  })

  it('is the person’s pick once they made one', () => {
    expect(launchFakeDataChoice('ship', 'keep-out')).toBe('keep-out')
    expect(launchFakeDataChoice('keep-out', 'ship')).toBe('ship')
  })

  it('is no choice at all while the preview offers none, whatever was picked before', () => {
    expect(launchFakeDataChoice(undefined, undefined)).toBeUndefined()
    expect(launchFakeDataChoice(undefined, 'keep-out')).toBeUndefined()
  })
})

describe('launchFakeDataMetadata', () => {
  it('carries the choice on the launch', () => {
    expect(launchFakeDataMetadata('keep-out')).toEqual({ fakeDataInProduct: 'keep-out' })
    expect(launchFakeDataMetadata('ship')).toEqual({ fakeDataInProduct: 'ship' })
  })

  it('carries nothing without a choice', () => {
    expect(launchFakeDataMetadata(undefined)).toBeUndefined()
  })
})

describe('fakeDataInProductLine', () => {
  it('says what each choice does, in its own words', () => {
    expect(fakeDataInProductLine('ship')).toBe('Fake-data code is committed with the work.')
    expect(fakeDataInProductLine('keep-out')).toBe(
      'Fake-data code is used for proof only and left out when the work is merged.',
    )
  })

  it('has one line per option, each different', () => {
    const lines = FAKE_DATA_IN_PRODUCT_OPTIONS.map((o) => fakeDataInProductLine(o.value))
    expect(new Set(lines).size).toBe(FAKE_DATA_IN_PRODUCT_OPTIONS.length)
  })
})

describe('groupLaunchFakeDataChoices', () => {
  const legs = [
    { projectId: 'web', fakeDataInProduct: 'ship' as const },
    { projectId: 'mobile', fakeDataInProduct: 'keep-out' as const },
    { projectId: 'backend' },
  ]

  it('starts each offering leg from its own value and leaves out the legs that offer none', () => {
    expect(groupLaunchFakeDataChoices(legs, {})).toEqual({ web: 'ship', mobile: 'keep-out' })
  })

  it('is the person’s pick for a leg once they made one, the others as offered', () => {
    expect(groupLaunchFakeDataChoices(legs, { web: 'keep-out' })).toEqual({
      web: 'keep-out',
      mobile: 'keep-out',
    })
    expect(groupLaunchFakeDataChoices(legs, { mobile: 'ship', web: 'ship' })).toEqual({
      web: 'ship',
      mobile: 'ship',
    })
  })

  it('drops a pick for a leg that offers none, or that is not in the launch', () => {
    expect(groupLaunchFakeDataChoices(legs, { backend: 'keep-out', gone: 'keep-out' })).toEqual({
      web: 'ship',
      mobile: 'keep-out',
    })
  })

  it('reads a leg’s offer as loosely as a single preview’s: anything not a choice offers none', () => {
    const loose = [
      { projectId: 'a', fakeDataInProduct: 'keep' },
      { projectId: 'b', fakeDataInProduct: undefined },
      { projectId: 'c', fakeDataInProduct: true },
    ] as unknown as Parameters<typeof groupLaunchFakeDataChoices>[0]
    expect(groupLaunchFakeDataChoices(loose, { a: 'ship' })).toEqual({})
  })

  it('is empty for a launch with no legs', () => {
    expect(groupLaunchFakeDataChoices([], { web: 'ship' })).toEqual({})
  })
})

describe('groupLaunchFakeDataMetadata', () => {
  it('carries the confirmed choice of every offering leg by project id', () => {
    expect(
      groupLaunchFakeDataMetadata(
        [
          { projectId: 'web', fakeDataInProduct: 'ship' },
          { projectId: 'mobile', fakeDataInProduct: 'keep-out' },
          { projectId: 'backend' },
        ],
        { web: 'keep-out' },
      ),
    ).toEqual({ fakeDataInProduct: { web: 'keep-out', mobile: 'keep-out' } })
  })

  it('carries nothing when no leg offers a choice, whatever was picked', () => {
    expect(groupLaunchFakeDataMetadata([{ projectId: 'backend' }], { backend: 'ship' })).toBe(
      undefined,
    )
    expect(groupLaunchFakeDataMetadata([], {})).toBeUndefined()
  })
})
