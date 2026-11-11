import type { ProcessCleanupList, ProcessRun } from 'thefactory-tools/types'
import type { ProcessTryBuildView, UseProcessCleanup } from 'thefactory-ui/headless'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import { STORY } from '../../src/fakeBackend/fixtures/stories'

/** The API base the try-it links are shown against. */
export const TRY_BUILD_API_BASE = 'http://127.0.0.1:7001'

const TOKEN = 'viewToken=fake-signed-token'
const EXPIRES = '2026-11-11T10:15:00.000Z'

const CHECKS: ProcessTryBuildView['steps'] = [
  {
    title: 'Sign in with your own account',
    open: 'the app’s start screen',
    steps: ['Tap Sign in', 'Use your own test account', 'Check your name shows on Home'],
  },
  {
    title: 'Upload a real photo',
    open: 'Profile → Photo',
    steps: [
      'Tap Change photo',
      'Pick a photo from your gallery',
      'Check it shows sharp, not cut off',
    ],
  },
]

const READY: ProcessTryBuildView = {
  runId: 'r-try',
  offered: true,
  status: 'ready',
  variant: 'covisionTestDebug',
  builtFrom: 'a1b2c3d',
  startedAt: Date.UTC(2026, 10, 11, 9, 52),
  finishedAt: Date.UTC(2026, 10, 11, 9, 58),
  fileName: 'covisionTestDebug-a1b2c3d.apk',
  bytes: 44_144_640,
  downloadUrl: `/api/v1/process-runs/r-try/try-build/app.apk?${TOKEN}`,
  phoneUrl: `http://192.168.1.20:7001/api/v1/process-runs/r-try/try-build/app.apk?${TOKEN}`,
  expiresAt: EXPIRES,
  steps: CHECKS,
}

/** Each state of the try-it block, as the backend answers it. */
export const TRY_BUILD_STATES = {
  building: {
    runId: 'r-try',
    offered: true,
    status: 'building',
    variant: 'covisionTestDebug',
    builtFrom: 'a1b2c3d',
    startedAt: Date.UTC(2026, 10, 11, 9, 52),
    steps: CHECKS,
  },
  'ready-qr': READY,
  'ready-download': { ...READY, phoneUrl: undefined },
  failed: {
    runId: 'r-try',
    offered: true,
    status: 'failed',
    variant: 'covisionTestDebug',
    builtFrom: 'a1b2c3d',
    reason: 'Gradle: compileTestDebugKotlin failed — Unresolved reference: PhotoPicker',
    steps: CHECKS,
  },
  unavailable: {
    runId: 'r-try',
    offered: true,
    status: 'unavailable',
    reason: 'A phone build is made for Android apps only for now.',
    steps: [],
  },
} satisfies Record<string, ProcessTryBuildView>

export type TryBuildState = keyof typeof TRY_BUILD_STATES

/** A run at its sign-off that carried out two feature edits itself; no story id, so rows read by feature title. */
export const CARRIED_OUT_RUN = {
  id: 'r-carried',
  projectId: FAKE_PROJECT_ID,
  title: STORY.title,
  status: 'parked',
  startedAt: 0,
  updatedAt: 0,
  carriedOutChanges: [
    {
      change: {
        id: 'c1',
        kind: 'feature-changed',
        featureId: 'f2',
        title: 'Reply in thread',
        summary: 'Acceptance changed — a reply opens the thread it answers',
        at: 1,
      },
      at: 10,
      runId: 'r-carried',
      entryId: 'e1',
    },
    {
      change: {
        id: 'c2',
        kind: 'feature-added',
        featureId: 'f3',
        title: 'Read receipts',
        summary: 'Added to this run',
        at: 2,
      },
      at: 20,
      runId: 'r-carried',
      entryId: 'e2',
    },
  ],
} as unknown as ProcessRun

const DEVICE_ITEMS: ProcessCleanupList['items'] = [
  {
    id: 'dev-1',
    kind: 'device',
    ref: 'emulator-5554',
    label: 'Android emulator Pixel_7 (emulator-5554)',
    reason: 'Started by the run to record the proof video.',
    registeredBy: 'host',
    defaultSelected: true,
    selected: true,
  },
  {
    id: 'br-1',
    kind: 'branch',
    ref: 'scratch/proof',
    label: 'scratch/proof',
    reason: 'A scratch branch the verifier used.',
    registeredBy: 'agent',
    defaultSelected: true,
    selected: true,
  },
]

const cleanupOf = (list: ProcessCleanupList): UseProcessCleanup => ({
  list,
  loadError: null,
  actionError: null,
  busy: false,
  setItemSelected: async () => {},
  setOff: async () => {},
})

/** A cleanup list holding a device the run started, before the step and after it ran. */
export const DEVICE_CLEANUP = {
  before: cleanupOf({ runId: 'r-try', items: DEVICE_ITEMS, off: false, hasStep: true }),
  after: cleanupOf({
    runId: 'r-try',
    items: DEVICE_ITEMS,
    off: false,
    hasStep: true,
    report: {
      outcomes: [
        { itemId: 'dev-1', kind: 'device', label: 'Pixel_7', status: 'removed' },
        { itemId: 'br-1', kind: 'branch', label: 'scratch/proof', status: 'removed' },
        {
          itemId: 'dev-2',
          kind: 'device',
          label: 'iOS simulator iPhone 16',
          status: 'failed',
          detail: 'xcrun simctl shutdown: device busy',
        },
      ],
      keptIds: [],
    },
  }),
}
