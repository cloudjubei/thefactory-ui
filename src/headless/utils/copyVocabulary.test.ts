import { describe, expect, it } from 'vitest'

import * as chatHeaderConstants from './chatHeaderConstants'
import * as chatSettingsMenuConstants from './chatSettingsMenuConstants'
import * as processCleanupViewConstants from './processCleanupViewConstants'
import * as processGroupViewConstants from './processGroupViewConstants'
import * as processIntegrationConstants from './processIntegrationConstants'
import * as processIntegrationFormConstants from './processIntegrationFormConstants'
import * as processStatusOverlayConstants from './processStatusOverlayConstants'
import * as processTimeDetailsConstants from './processTimeDetailsConstants'
import * as runProposalViewConstants from './runProposalViewConstants'
import * as runReviewConstants from './runReviewConstants'
import * as stepsStripConstants from './stepsStripConstants'
import * as verifyProofConstants from './verifyProofConstants'

const COPY_MODULES: Record<string, Record<string, unknown>> = {
  chatHeaderConstants,
  chatSettingsMenuConstants,
  processCleanupViewConstants,
  processGroupViewConstants,
  processIntegrationConstants,
  processIntegrationFormConstants,
  processStatusOverlayConstants,
  processTimeDetailsConstants,
  runProposalViewConstants,
  runReviewConstants,
  stepsStripConstants,
  verifyProofConstants,
}

const BANNED_WORD = /\b(land|lands|landed|landing)\b/i

function callWithSamples(fn: (...args: unknown[]) => unknown): unknown[] {
  const results: unknown[] = []
  for (const sample of ['main', 2]) {
    try {
      results.push(fn(...Array.from({ length: Math.max(fn.length, 1) }, () => sample)))
    } catch {
      continue
    }
  }
  return results
}

function copyStrings(value: unknown, path: string, seen: Set<unknown>): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]]
  if (typeof value === 'function') {
    return callWithSamples(value as (...args: unknown[]) => unknown).flatMap((result) =>
      copyStrings(result, `${path}()`, seen),
    )
  }
  if (!value || typeof value !== 'object' || value instanceof RegExp || seen.has(value)) return []
  seen.add(value)
  return Object.entries(value).flatMap(([key, inner]) => copyStrings(inner, `${path}.${key}`, seen))
}

describe('copy vocabulary', () => {
  it.each(Object.entries(COPY_MODULES))(
    '%s never says land, lands, landed or landing',
    (_, module) => {
      const strings = copyStrings(module, 'module', new Set())
      expect(strings.length).toBeGreaterThan(0)
      expect(strings.filter(([, text]) => BANNED_WORD.test(text))).toEqual([])
    },
  )

  it('catches the word in a nested object and in what a function returns', () => {
    const strings = copyStrings(
      { nested: { label: 'Approve and land it' }, line: (ref: string) => `It lands on ${ref}` },
      'sample',
      new Set(),
    )
    expect(strings.filter(([, text]) => BANNED_WORD.test(text)).map(([path]) => path)).toEqual([
      'sample.nested.label',
      'sample.line()',
      'sample.line()',
    ])
  })

  it('does not flag words that only contain it', () => {
    expect(BANNED_WORD.test('Landscape screens, an island and a landmark')).toBe(false)
  })
})
