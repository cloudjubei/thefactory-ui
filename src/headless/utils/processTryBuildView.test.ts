import { describe, expect, it } from 'vitest'
import {
  processTryBuildDisplay,
  processTryBuildLinkExpired,
  processTryBuildRefreshDelay,
} from './processTryBuildView'
import {
  PROCESS_TRY_BUILD_COPY,
  PROCESS_TRY_BUILD_LINK_REFRESH_LEAD_MS,
  PROCESS_TRY_BUILD_REFRESH_FLOOR_MS,
} from './processTryBuildViewConstants'
import type { ProcessTryBuildView } from './processTryBuildViewTypes'

const EXPIRES = '2026-11-11T10:15:00.000Z'
const EXPIRES_MS = Date.parse(EXPIRES)

const ready = (over: Partial<ProcessTryBuildView> = {}): ProcessTryBuildView => ({
  runId: 'r1',
  offered: true,
  status: 'ready',
  variant: 'covisionTestDebug',
  builtFrom: 'a1b2c3d',
  fileName: 'covisionTestDebug-a1b2c3d.apk',
  bytes: 44_144_640,
  downloadUrl: '/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
  phoneUrl: 'http://192.168.1.20:7001/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
  expiresAt: EXPIRES,
  steps: [
    { title: 'Sign-up', open: 'Settings → Account', steps: ['Tap Sign up', 'Enter your email'] },
    { title: 'Photo upload', steps: ['Pick a photo from the gallery'] },
  ],
  ...over,
})

describe('processTryBuildDisplay', () => {
  it('is nothing when there is no answer or the run offers no phone build', () => {
    expect(processTryBuildDisplay(undefined, 'http://h')).toBeUndefined()
    expect(processTryBuildDisplay({ runId: 'r1', offered: false, steps: [] }, 'http://h')).toBe(
      undefined,
    )
  })

  it('lays out a ready build: what was built, the download, the QR, the checks and the account note', () => {
    expect(processTryBuildDisplay(ready(), 'http://h:7001/')).toEqual({
      title: PROCESS_TRY_BUILD_COPY.title,
      tone: 'done',
      headline: PROCESS_TRY_BUILD_COPY.ready,
      detail: 'covisionTestDebug · a1b2c3d · 42.1 MB',
      download: {
        href: 'http://h:7001/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
        label: PROCESS_TRY_BUILD_COPY.download,
        fileName: 'covisionTestDebug-a1b2c3d.apk',
        expiresAt: EXPIRES_MS,
      },
      qr: {
        value: 'http://192.168.1.20:7001/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
        caption: PROCESS_TRY_BUILD_COPY.scanCaption,
      },
      stepsTitle: PROCESS_TRY_BUILD_COPY.stepsTitle,
      checks: [
        {
          title: 'Sign-up',
          openLine: 'Open: Settings → Account',
          steps: ['Tap Sign up', 'Enter your email'],
        },
        { title: 'Photo upload', steps: ['Pick a photo from the gallery'] },
      ],
      accountNote: PROCESS_TRY_BUILD_COPY.accountNote,
    })
  })

  it('offers only the download when the phone cannot reach the backend, and no checks when none were given', () => {
    const view = processTryBuildDisplay(
      ready({ phoneUrl: undefined, expiresAt: undefined, fileName: undefined, steps: [] }),
      'http://h',
    )!
    expect(view.qr).toBeUndefined()
    expect(view.checks).toEqual([])
    expect(view.download).toEqual({
      href: 'http://h/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
      label: PROCESS_TRY_BUILD_COPY.download,
    })
  })

  it('keeps the link relative when the API base is not known, and absolute links as they are', () => {
    expect(processTryBuildDisplay(ready(), null)!.download!.href).toBe(
      '/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
    )
    expect(processTryBuildDisplay(ready(), '')!.download!.href).toBe(
      '/api/v1/process-runs/r1/try-build/app.apk?viewToken=t',
    )
    expect(
      processTryBuildDisplay(ready({ downloadUrl: 'https://cdn.example/app.apk' }), 'http://h')!
        .download!.href,
    ).toBe('https://cdn.example/app.apk')
  })

  it('drops an expiry it cannot read', () => {
    expect(
      processTryBuildDisplay(ready({ expiresAt: 'soon' }), 'http://h')!.download!.expiresAt,
    ).toBeUndefined()
  })

  it('shows no download while a ready answer carries no link, and words it without a size or commit', () => {
    const view = processTryBuildDisplay(
      ready({
        downloadUrl: undefined,
        phoneUrl: undefined,
        bytes: undefined,
        builtFrom: undefined,
      }),
      'http://h',
    )!
    expect(view.download).toBeUndefined()
    expect(view.qr).toBeUndefined()
    expect(view.detail).toBe('covisionTestDebug')
  })

  it('says it is building, with what it builds, and keeps the checks and the account note', () => {
    const view = processTryBuildDisplay(
      {
        runId: 'r1',
        offered: true,
        status: 'building',
        variant: 'covisionTestDebug',
        builtFrom: 'a1b2c3d',
        downloadUrl: '/stale',
        phoneUrl: 'http://stale',
        steps: [{ title: 'Sign-up', steps: [] }],
      },
      'http://h',
    )!
    expect(view.tone).toBe('working')
    expect(view.headline).toBe(PROCESS_TRY_BUILD_COPY.building)
    expect(view.detail).toBe('covisionTestDebug · a1b2c3d')
    expect(view.download).toBeUndefined()
    expect(view.qr).toBeUndefined()
    expect(view.checks).toEqual([{ title: 'Sign-up', steps: [] }])
    expect(view.accountNote).toBe(PROCESS_TRY_BUILD_COPY.accountNote)
  })

  it('reads an offer with no status yet as building, with no detail', () => {
    const view = processTryBuildDisplay({ runId: 'r1', offered: true, steps: [] }, 'http://h')!
    expect(view.headline).toBe(PROCESS_TRY_BUILD_COPY.building)
    expect(view.detail).toBeUndefined()
  })

  it('says why the build failed, with nothing to install or check', () => {
    const view = processTryBuildDisplay(
      ready({ status: 'failed', reason: 'Gradle: compileTestDebugKotlin failed' }),
      'http://h',
    )!
    expect(view).toEqual({
      title: PROCESS_TRY_BUILD_COPY.title,
      tone: 'stuck',
      headline: PROCESS_TRY_BUILD_COPY.failed,
      detail: 'Gradle: compileTestDebugKotlin failed',
      stepsTitle: PROCESS_TRY_BUILD_COPY.stepsTitle,
      checks: [],
    })
  })

  it('says a failure gave no reason', () => {
    expect(
      processTryBuildDisplay(ready({ status: 'failed', reason: '  ' }), 'http://h')!.detail,
    ).toBe(PROCESS_TRY_BUILD_COPY.failedNoReason)
  })

  it('gives the plain reason there is no phone build', () => {
    const view = processTryBuildDisplay(
      {
        runId: 'r1',
        offered: true,
        status: 'unavailable',
        reason: 'A phone build is made for Android apps only for now.',
        steps: [{ title: 'Sign-up', steps: ['Tap Sign up'] }],
      },
      'http://h',
    )!
    expect(view.tone).toBe('muted')
    expect(view.headline).toBe(PROCESS_TRY_BUILD_COPY.unavailable)
    expect(view.detail).toBe('A phone build is made for Android apps only for now.')
    expect(view.checks).toEqual([])
    expect(view.accountNote).toBeUndefined()
  })

  it('leaves the detail out when there is no reason a build is not made', () => {
    expect(
      processTryBuildDisplay(
        { runId: 'r1', offered: true, status: 'unavailable', steps: [] },
        'http://h',
      )!.detail,
    ).toBeUndefined()
  })
})

describe('processTryBuildLinkExpired', () => {
  const download = { href: 'x', label: 'y', expiresAt: 1000 }

  it('is expired from the moment its time passes', () => {
    expect(processTryBuildLinkExpired(download, 999)).toBe(false)
    expect(processTryBuildLinkExpired(download, 1000)).toBe(true)
  })

  it('never expires without a time, or without a link', () => {
    expect(processTryBuildLinkExpired({ href: 'x', label: 'y' }, 5000)).toBe(false)
    expect(processTryBuildLinkExpired(undefined, 5000)).toBe(false)
  })
})

describe('processTryBuildRefreshDelay', () => {
  it('reads the links again a little before they stop working', () => {
    expect(processTryBuildRefreshDelay(ready(), EXPIRES_MS - 60_000)).toBe(
      60_000 - PROCESS_TRY_BUILD_LINK_REFRESH_LEAD_MS,
    )
  })

  it('reads them soon, never in a tight loop, when they are about to stop or already have', () => {
    expect(processTryBuildRefreshDelay(ready(), EXPIRES_MS - 1000)).toBe(
      PROCESS_TRY_BUILD_REFRESH_FLOOR_MS,
    )
    expect(processTryBuildRefreshDelay(ready(), EXPIRES_MS + 1000)).toBe(
      PROCESS_TRY_BUILD_REFRESH_FLOOR_MS,
    )
  })

  it('waits on nothing while there are no links, or no readable expiry', () => {
    expect(processTryBuildRefreshDelay(undefined, 0)).toBeUndefined()
    expect(processTryBuildRefreshDelay(ready({ status: 'building' }), 0)).toBeUndefined()
    expect(processTryBuildRefreshDelay(ready({ expiresAt: undefined }), 0)).toBeUndefined()
    expect(processTryBuildRefreshDelay(ready({ expiresAt: 'soon' }), 0)).toBeUndefined()
    expect(processTryBuildRefreshDelay(ready({ offered: false }), 0)).toBeUndefined()
  })
})
