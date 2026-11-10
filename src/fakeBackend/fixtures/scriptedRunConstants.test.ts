import { describe, expect, it } from 'vitest'
import {
  JOURNEY_DAY_LOG_LABEL,
  JOURNEY_RECORDING_LABEL,
  JOURNEY_STOPPED_SCREENSHOT_LABEL,
} from 'thefactory-tools/constants'

import {
  FAKE_JOURNEY_DAY_LOG_LABEL,
  FAKE_JOURNEY_RECORDING_LABEL,
  FAKE_JOURNEY_STOPPED_SCREENSHOT_LABEL,
} from './scriptedRunConstants'

describe('scripted run evidence labels', () => {
  it('names each piece of evidence as the host files it', () => {
    expect(FAKE_JOURNEY_RECORDING_LABEL).toBe(JOURNEY_RECORDING_LABEL)
    expect(FAKE_JOURNEY_DAY_LOG_LABEL).toBe(JOURNEY_DAY_LOG_LABEL)
    expect(FAKE_JOURNEY_STOPPED_SCREENSHOT_LABEL).toBe(JOURNEY_STOPPED_SCREENSHOT_LABEL)
  })
})
