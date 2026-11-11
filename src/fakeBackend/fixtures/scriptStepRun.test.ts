import { describe, expect, it } from 'vitest'
import { parseScriptLog, scriptLogDigest } from 'thefactory-tools/utils'

import { FAKE_SCRIPT_LOGS, fakeScriptEvidence, fakeScriptRun } from './scriptStepRun'

const sections = (text: string): string[] => [
  ...new Set(parseScriptLog(text).lines.map((line) => line.section)),
]

describe('the script step fixtures', () => {
  it('file step logs every line of which the host reads', () => {
    for (const text of Object.values(FAKE_SCRIPT_LOGS)) {
      expect(parseScriptLog(text).problems).toEqual([])
      expect(scriptLogDigest(parseScriptLog(text))).not.toBe('')
    }
  })

  it('log two sections, a stop in the second, and a run past take-overs', () => {
    expect(sections(FAKE_SCRIPT_LOGS['two-sections'])).toEqual(['Sign in', 'Settings'])
    expect(sections(FAKE_SCRIPT_LOGS.stopped)).toEqual(['Sign in', 'Settings'])
    const takeOvers = parseScriptLog(FAKE_SCRIPT_LOGS['take-overs']).lines.filter(
      (line) => line.kind === 'take-over',
    )
    expect(takeOvers).toHaveLength(2)
  })

  it('park the stopped run on its script step, with the screenshot of where', () => {
    expect(fakeScriptRun('stopped').park?.stepId).toBe('run-script')
    expect(fakeScriptRun('two-sections').park).toBeUndefined()
    const kinds = (state: 'stopped' | 'two-sections') =>
      fakeScriptEvidence(state).groups[0]!.evidence.map((ref) => ref.kind)
    expect(kinds('stopped')).toContain('screenshot')
    expect(kinds('two-sections')).not.toContain('screenshot')
  })
})
