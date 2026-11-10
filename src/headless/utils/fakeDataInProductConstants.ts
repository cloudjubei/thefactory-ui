import type { FakeDataInProductOption } from './fakeDataInProductTypes'

/** The project metadata key a project's choice is kept under. */
export const PROCESS_FAKE_DATA_IN_PRODUCT_KEY = 'processFakeDataInProduct'

export const FAKE_DATA_IN_PRODUCT_COPY = {
  title: 'Fake data in the product',
  projectHint: 'Each launch starts from this, and can change it.',
} as const

export const FAKE_DATA_IN_PRODUCT_OPTIONS: readonly FakeDataInProductOption[] = [
  { value: 'ship', label: 'Ship it', line: 'Fake-data code is committed with the work.' },
  {
    value: 'keep-out',
    label: 'Keep it out',
    line: 'Fake-data code is used for proof only and left out when the work is merged.',
  },
]
