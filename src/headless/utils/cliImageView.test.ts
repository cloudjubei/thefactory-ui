import { describe, expect, it } from 'vitest'

import {
  cliImageBuildAction,
  cliImageBuildFailure,
  cliImageBuildLog,
  cliImageBuildStepLabel,
  cliImageBuildSteps,
  cliImageBuildSuccess,
  cliImageChip,
  cliImagesNeedCheck,
  formatBuildElapsed,
  newlyBuildingImageIds,
} from './cliImageView'
import { CLI_IMAGE_LOG_VISIBLE_LINES, CLI_IMAGE_STALE_MS } from './cliImageViewConstants'
import type { CliImageBuild, CliImageRow } from './cliImageViewTypes'

const build = (over: Partial<CliImageBuild> = {}): CliImageBuild => ({
  updateId: 'u1',
  cli: 'codex',
  targetVersion: '2.0.0',
  status: 'building',
  startedAt: '2026-10-19T10:00:00.000Z',
  logTail: '',
  ...over,
})

const row = (over: Partial<CliImageRow> = {}): CliImageRow => ({
  cli: 'codex',
  image: 'factory/codex',
  state: 'up-to-date',
  installed: '1.0.0',
  latest: '1.0.0',
  latestCheckedAt: '2026-10-19T09:00:00.000Z',
  ...over,
})

describe('cliImageChip', () => {
  it('says the version is loading or unknown when there is no row', () => {
    expect(cliImageChip(undefined, true)).toEqual({ label: 'Version…', tone: 'muted' })
    expect(cliImageChip(undefined, false)).toEqual({ label: 'Version unknown', tone: 'muted' })
  })

  it('names the target version while a build runs, or nothing when the build is unnamed', () => {
    expect(cliImageChip(row({ state: 'updating', update: build() }), false)).toEqual({
      label: 'Building 2.0.0…',
      tone: 'muted',
    })
    expect(cliImageChip(row({ state: 'updating' }), false).label).toBe('Building …')
  })

  it('marks a missing image as an error with its reason', () => {
    expect(cliImageChip(row({ state: 'not-built', detail: 'No image yet' }), false)).toEqual({
      label: 'Not built',
      tone: 'error',
      hint: 'No image yet',
    })
    expect(cliImageChip(row({ state: 'not-built' }), false).hint).toBeUndefined()
  })

  it('shows installed → newest when an update is out', () => {
    expect(
      cliImageChip(row({ state: 'update-available', installed: '1.0.0', latest: '1.1.0' }), false),
    ).toEqual({ label: '1.0.0 → 1.1.0', tone: 'warning', hint: 'Newest published: 1.1.0' })
    expect(
      cliImageChip(row({ state: 'update-available', installed: undefined, latest: '1.1.0' }), false)
        .label,
    ).toBe(' → 1.1.0')
  })

  it('shows the installed version when up to date, with when it was checked', () => {
    expect(cliImageChip(row(), false)).toEqual({
      label: '1.0.0',
      tone: 'muted',
      hint: 'Up to date — checked 2026-10-19T09:00:00.000Z',
    })
    expect(cliImageChip(row({ latestCheckedAt: undefined }), false).hint).toBe(
      'Up to date — checked never',
    )
  })

  it('never calls an unknown state up to date', () => {
    expect(cliImageChip(row({ state: 'unknown', detail: 'Registry down' }), false)).toEqual({
      label: '1.0.0 · update status unknown',
      tone: 'muted',
      hint: 'Registry down',
    })
    expect(cliImageChip(row({ state: 'unknown', installed: undefined }), false)).toEqual({
      label: 'Version unknown',
      tone: 'muted',
    })
  })
})

describe('cliImageBuildAction', () => {
  const ready = { docker: 'ok' as const, starting: false, cliName: 'Codex' }

  it('offers nothing without docker, without a row, or for an idle up-to-date image', () => {
    expect(cliImageBuildAction(row({ state: 'not-built' }), { ...ready, docker: 'missing' })).toBe(
      undefined,
    )
    expect(cliImageBuildAction(undefined, ready)).toBeUndefined()
    expect(cliImageBuildAction(row(), ready)).toBeUndefined()
  })

  it('builds a missing image and updates a stale one as the main action', () => {
    expect(cliImageBuildAction(row({ state: 'not-built', latest: '1.2.0' }), ready)).toEqual({
      label: 'Build image',
      tone: 'success',
      hint: 'Build Codex 1.2.0',
      busy: false,
    })
    expect(cliImageBuildAction(row({ state: 'update-available', latest: '1.2.0' }), ready)).toEqual(
      { label: 'Update to 1.2.0', tone: 'success', hint: 'Build Codex 1.2.0', busy: false },
    )
  })

  it('offers a rebuild for an unknown state, explained by its reason', () => {
    expect(cliImageBuildAction(row({ state: 'unknown', detail: 'No label' }), ready)).toEqual({
      label: 'Rebuild',
      tone: 'outline',
      hint: 'No label',
      busy: false,
    })
    expect(cliImageBuildAction(row({ state: 'unknown' }), ready)?.hint).toBe('Rebuild this image')
  })

  it('is busy while a build runs or is being started', () => {
    expect(cliImageBuildAction(row({ state: 'updating', update: build() }), ready)).toMatchObject({
      label: 'Updating…',
      busy: true,
    })
    expect(
      cliImageBuildAction(row({ state: 'not-built' }), { ...ready, starting: true }),
    ).toMatchObject({ label: 'Starting…', busy: true, tone: 'success' })
  })
})

describe('cliImagesNeedCheck', () => {
  const now = Date.parse('2026-10-19T12:00:00.000Z')

  it('is due when any row was never checked or was checked too long ago', () => {
    expect(cliImagesNeedCheck([row(), row({ latestCheckedAt: undefined })], now)).toBe(true)
    const old = new Date(now - CLI_IMAGE_STALE_MS - 1).toISOString()
    expect(cliImagesNeedCheck([row({ latestCheckedAt: old })], now)).toBe(true)
  })

  it('is not due when every row is fresh or there are none', () => {
    const fresh = new Date(now - CLI_IMAGE_STALE_MS).toISOString()
    expect(cliImagesNeedCheck([row({ latestCheckedAt: fresh })], now)).toBe(false)
    expect(cliImagesNeedCheck([], now)).toBe(false)
  })
})

describe('newlyBuildingImageIds', () => {
  it('lists running builds not yet watched', () => {
    const rows = [
      row({ state: 'updating', update: build({ updateId: 'a' }) }),
      row({ state: 'updating', update: build({ updateId: 'b' }) }),
      row({ state: 'updating' }),
      row({ state: 'up-to-date', update: build({ updateId: 'c', status: 'succeeded' }) }),
    ]
    expect(newlyBuildingImageIds(rows, new Set(['b']))).toEqual(['a'])
    expect(newlyBuildingImageIds(rows, new Set(['a', 'b']))).toEqual([])
  })
})

describe('cliImageBuildStepLabel', () => {
  it('names a known stage and nothing otherwise', () => {
    expect(cliImageBuildStepLabel('verifying')).toBe('Verify version')
    expect(cliImageBuildStepLabel(undefined)).toBeUndefined()
  })
})

describe('cliImageBuildSteps', () => {
  it('marks earlier stages done, the current one active and later ones pending', () => {
    const steps = cliImageBuildSteps('promoting')
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'active', 'pending'])
    expect(steps[2]).toMatchObject({ text: 'Switch to new image', phase: 'promoting' })
  })

  it('starts on the first stage, saying it is starting before any stage is reported', () => {
    const steps = cliImageBuildSteps(undefined)
    expect(steps.map((s) => s.state)).toEqual(['active', 'pending', 'pending', 'pending'])
    expect(steps[0]?.text).toBe('Starting…')
    expect(cliImageBuildSteps('building')[0]?.text).toBe('Build image')
  })
})

describe('cliImageBuildFailure', () => {
  it('names the stage the build stopped in, when known', () => {
    expect(cliImageBuildFailure(build({ status: 'failed', phase: 'verifying' }))).toBe(
      'Update to 2.0.0 failed at “Verify version” — the previous image is still in use.',
    )
    expect(cliImageBuildFailure(build({ status: 'failed' }))).toBe(
      'Update to 2.0.0 failed — the previous image is still in use.',
    )
  })
})

describe('cliImageBuildSuccess', () => {
  it('names the installed version, else the target', () => {
    expect(cliImageBuildSuccess(build({ status: 'succeeded', installedAfter: '2.0.1' }))).toBe(
      'Updated to 2.0.1',
    )
    expect(cliImageBuildSuccess(build({ status: 'succeeded' }))).toBe('Updated to 2.0.0')
  })
})

describe('formatBuildElapsed', () => {
  it('shows minutes and padded seconds, never negative', () => {
    expect(formatBuildElapsed(65_900)).toBe('1:05')
    expect(formatBuildElapsed(600_000)).toBe('10:00')
    expect(formatBuildElapsed(-5_000)).toBe('0:00')
  })
})

describe('cliImageBuildLog', () => {
  it('prefers streamed output over the stored tail and drops one trailing newline', () => {
    expect(cliImageBuildLog('live\n', 'stored')).toBe('live')
    expect(cliImageBuildLog(undefined, 'stored\n')).toBe('stored')
    expect(cliImageBuildLog(undefined, '')).toBe('')
  })

  it('keeps only the newest lines of a long log', () => {
    const lines = Array.from({ length: CLI_IMAGE_LOG_VISIBLE_LINES + 3 }, (_, i) => `l${i}`)
    const kept = cliImageBuildLog(lines.join('\n'), '').split('\n')
    expect(kept).toHaveLength(CLI_IMAGE_LOG_VISIBLE_LINES)
    expect(kept[0]).toBe('l3')
    expect(kept.at(-1)).toBe(`l${CLI_IMAGE_LOG_VISIBLE_LINES + 2}`)
  })
})
