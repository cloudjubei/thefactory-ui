import { describe, expect, it } from 'vitest'
import {
  SCRIPT_LOG_LABEL,
  SCRIPT_RECORDING_LABEL,
  SCRIPT_STOPPED_SCREENSHOT_LABEL,
} from 'thefactory-tools/constants'

import {
  FAKE_SCRIPT_LOG_LABEL,
  FAKE_SCRIPT_RECORDING_LABEL,
  FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL,
} from './scriptStepRunConstants'

describe('script step run evidence labels', () => {
  it('names each piece of evidence as the host files it', () => {
    expect(FAKE_SCRIPT_RECORDING_LABEL).toBe(SCRIPT_RECORDING_LABEL)
    expect(FAKE_SCRIPT_LOG_LABEL).toBe(SCRIPT_LOG_LABEL)
    expect(FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL).toBe(SCRIPT_STOPPED_SCREENSHOT_LABEL)
  })
})
