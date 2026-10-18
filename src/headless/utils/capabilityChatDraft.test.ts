import { describe, expect, it } from 'vitest'

import type { ProjectChecksListing, VerificationApproachOption } from '../api/generated'
import {
  capabilityChatDraft,
  capabilitySetupHandler,
  capabilitySetupOffered,
  isCapabilityMethod,
} from './capabilityChatDraft'
import {
  CAPABILITY_ASK_IN_RUN,
  CAPABILITY_ASK_OUTSIDE_RUN,
  CAPABILITY_CAPTURE_NOT_SCANNED,
  CAPABILITY_DETECTED_FROM_GENERIC,
  CAPABILITY_UI_TESTS_NOT_SCANNED,
  CAPABILITY_UNKNOWN_PLATFORM,
} from './capabilityChatDraftConstants'
import type { CheckMethodRow } from './checkMethodTypes'

function listing(over: Partial<ProjectChecksListing>): ProjectChecksListing {
  return {
    ecosystem: 'node',
    checks: [],
    hidden: [],
    variants: [],
    notes: [],
    scannedAt: 1,
    head: 'abc',
    fingerprint: 'f',
    lastRuns: [],
    freshness: 'stored',
    ...over,
  }
}

const NODE_SCAN = listing({
  checks: [
    {
      id: 'build',
      kind: 'build',
      label: 'Build',
      argv: ['npm', 'run', 'build'],
      command: 'npm run build',
      source: 'package.json script "build"',
    },
    {
      id: 'test',
      kind: 'test',
      label: 'Unit tests',
      argv: ['npm', 'run', 'test'],
      command: 'npm run test',
      source: 'package.json script "test"',
    },
  ],
  hidden: [{ kind: 'typecheck', reason: 'The build script "build" runs tsc, which type-checks.' }],
  notes: ['No lint configured.', 'No format configured.'],
  placements: [
    { id: 'build', kind: 'build', runsIn: 'host', hostReason: 'it builds against ../db' },
  ],
})

const ANDROID_SCAN = listing({
  ecosystem: 'android',
  checks: [
    {
      id: 'build',
      kind: 'build',
      label: 'Build',
      argv: ['./gradlew', 'assemble{Variant}'],
      command: './gradlew assembleDebug',
      source: 'app/build.gradle',
      perVariant: true,
    },
  ],
  variants: ['debug', 'release'],
  defaultVariant: 'debug',
  notes: ['No lint configured.'],
})

function approach(
  id: VerificationApproachOption['spec']['id'],
  label: string,
  availability: VerificationApproachOption['availability'],
): VerificationApproachOption {
  return {
    spec: { id, label, proves: '', requires: { default: [] } },
    availability,
    drivenBy: [],
  }
}

describe('capabilityChatDraft', () => {
  it('asks a node project missing lint for a feature in this run, with its scan and the script the scan detects', () => {
    const draft = capabilityChatDraft(
      { id: 'lint', label: 'Lint', detail: 'This project has no lint.' },
      { projectChecks: NODE_SCAN, inRun: true },
    )
    expect(draft).toContain('**Set up lint for this project.**')
    expect(draft).toContain('Now: This project has no lint.')
    expect(draft).toContain('- Ecosystem: node')
    expect(draft).toContain(
      '- Build (build): `npm run build` — from package.json script "build"; runs on the host (it builds against ../db)',
    )
    expect(draft).toContain('- Not found: No lint configured.')
    expect(draft).toContain('Common options for node: ESLint, Biome — suggestions only')
    expect(draft).toContain('a package.json script named "lint" or "eslint"')
    expect(draft).toContain(CAPABILITY_ASK_IN_RUN)
    expect(draft).toContain('the command it should expose (one the checks scan will detect)')
    expect(draft).toContain('and a proof plan.')
    expect(draft).not.toContain('Capture on this project')
  })

  it('asks an Android project missing UI tests with its capture status and that the scan will not run them', () => {
    const draft = capabilityChatDraft(
      { id: 'uitests', label: 'UI tests', detail: 'This project has no UI tests.' },
      {
        projectChecks: ANDROID_SCAN,
        platform: 'android',
        approaches: [
          approach('screenshot-diff', 'Before/after screenshots', {
            status: 'unavailable',
            missing: ['androidDevice'],
            hints: ['Install an Android system image'],
          }),
        ],
        inRun: true,
      },
    )
    expect(draft).toContain('**Set up UI tests for this project.**')
    expect(draft).toContain('- Variants: debug, release (default debug)')
    expect(draft).toContain('- Platform: android')
    expect(draft).toContain(
      '- Before/after screenshots: unavailable — missing androidDevice (Install an Android system image).',
    )
    expect(draft).toContain('Common options for android: Espresso, Compose UI tests')
    expect(draft).toContain(CAPABILITY_UI_TESTS_NOT_SCANNED)
    expect(draft).toContain('the command that runs the suite')
  })

  it('says a capture approach whose page cannot be served cannot be served, and why', () => {
    const draft = capabilityChatDraft(
      { id: 'walkthrough', label: 'Walkthrough', detail: 'The page cannot be served.' },
      {
        platform: 'web',
        approaches: [
          approach('screen-recording', 'Screen recording', {
            status: 'unservable',
            reason: 'The declared App has no page at this commit.',
          }),
        ],
        inRun: false,
      },
    )
    expect(draft).toContain(
      '- Screen recording: cannot be served — The declared App has no page at this commit.',
    )
  })

  it('asks a project of unknown platform missing walkthroughs outside a run, with no scan and no options to suggest', () => {
    const draft = capabilityChatDraft(
      {
        id: 'walkthrough',
        label: 'Walkthrough',
        detail: 'Screen recording does not apply to this project.',
      },
      {
        platform: 'unknown',
        approaches: [
          approach('screen-recording', 'Screen recording', {
            status: 'not-applicable',
            reason: 'The project has no app to record.',
          }),
        ],
        inRun: false,
      },
    )
    expect(draft).toContain('**Set up walkthrough recordings for this project.**')
    expect(draft).not.toContain('What the checks scan found')
    expect(draft).toContain(`- ${CAPABILITY_UNKNOWN_PLATFORM}`)
    expect(draft).toContain(
      '- Screen recording: not applicable — The project has no app to record.',
    )
    expect(draft).not.toContain('Common options')
    expect(draft).toContain(CAPABILITY_CAPTURE_NOT_SCANNED)
    expect(draft).toContain(CAPABILITY_ASK_OUTSIDE_RUN)
    expect(draft).toContain('what must be in place for the app to be captured here')
    expect(draft).not.toContain(CAPABILITY_ASK_IN_RUN)
  })

  it('names a withheld capture beside what the host lacks, and a not-allowed one by its reason', () => {
    const withheld = capabilityChatDraft(
      { id: 'screens', label: 'Screens', detail: 'No screens.' },
      {
        approaches: [
          approach('screenshot-diff', 'Before/after screenshots', {
            status: 'unavailable',
            missing: ['iosSimulator'],
            hints: [],
            withheld: 'Device automation is off for this project.',
          }),
        ],
        inRun: true,
      },
    )
    expect(withheld).toContain(
      '- Before/after screenshots: unavailable — missing iosSimulator. Device automation is off for this project.',
    )
    expect(withheld).not.toContain('- Platform:')
    const refused = capabilityChatDraft(
      { id: 'screens', label: 'Screens', detail: 'No screens.' },
      {
        approaches: [
          approach('screenshot-diff', 'Before/after screenshots', {
            status: 'not-allowed',
            reason: 'Allow device automation in the project settings.',
          }),
        ],
        inRun: true,
      },
    )
    expect(refused).toContain(
      '- Before/after screenshots: not allowed — Allow device automation in the project settings.',
    )
  })

  it('falls back to the generic detection sentence for an ecosystem the table does not know', () => {
    const draft = capabilityChatDraft(
      { id: 'format', label: 'Format', detail: 'This project has no formatting.' },
      { projectChecks: listing({ ecosystem: 'go' }), inRun: true },
    )
    expect(draft).toContain(`The checks scan picks it up from ${CAPABILITY_DETECTED_FROM_GENERIC}.`)
    expect(draft).toContain('Common options for go: gofmt')
  })

  it('leaves the capture section out of a capture draft when neither platform nor approach is known', () => {
    const draft = capabilityChatDraft(
      { id: 'walkthrough', label: 'Walkthrough', detail: 'No recording.' },
      { inRun: true },
    )
    expect(draft).not.toContain('Capture on this project')
    expect(draft.endsWith('\n')).toBe(true)
  })
})

describe('capabilitySetupOffered', () => {
  const row = (over: Partial<CheckMethodRow>): Pick<CheckMethodRow, 'id' | 'state' | 'action'> => ({
    id: 'lint',
    state: 'unconfigured',
    action: { kind: 'request', purpose: 'setup', approachId: undefined },
    ...over,
  })

  it('offers a missing capability that asks for a set-up', () => {
    expect(capabilitySetupOffered(row({}))).toBe(true)
    expect(capabilitySetupOffered(row({ id: 'walkthrough' }))).toBe(true)
  })

  it('does not offer a withheld capture, an unchecked check, or what is not a project capability', () => {
    expect(capabilitySetupOffered(row({ action: { kind: 'allow', reason: 'off' } }))).toBe(false)
    expect(capabilitySetupOffered(row({ state: 'unchecked', action: { kind: 'run' } }))).toBe(false)
    expect(capabilitySetupOffered(row({ id: 'report' }))).toBe(false)
    expect(capabilitySetupOffered(row({ id: 'diff' }))).toBe(false)
  })
})

describe('isCapabilityMethod', () => {
  it('knows the check commands and the captures, and nothing else', () => {
    expect(isCapabilityMethod('types')).toBe(true)
    expect(isCapabilityMethod('screens')).toBe(true)
    expect(isCapabilityMethod('device')).toBe(false)
  })
})

describe('capabilitySetupHandler', () => {
  const missing = {
    id: 'lint' as const,
    label: 'Lint',
    detail: 'This project has no lint.',
    state: 'unconfigured' as const,
    action: { kind: 'request' as const, purpose: 'setup' as const, approachId: undefined },
  }

  it('is undefined with no chat to open', () => {
    expect(capabilitySetupHandler(undefined, { inRun: true })).toBeUndefined()
  })

  it('opens the chat with the capability draft, built from the context', () => {
    const drafts: string[] = []
    capabilitySetupHandler((d) => drafts.push(d), { projectChecks: NODE_SCAN, inRun: false })!(
      missing,
    )
    expect(drafts).toEqual([
      capabilityChatDraft(missing, { projectChecks: NODE_SCAN, inRun: false }),
    ])
  })

  it('opens nothing for a chip that is not a missing capability', () => {
    const drafts: string[] = []
    const handler = capabilitySetupHandler((d) => drafts.push(d), { inRun: true })!
    handler({ ...missing, state: 'unchecked', action: { kind: 'run' } })
    handler({ ...missing, id: 'report' as never })
    expect(drafts).toEqual([])
  })
})
