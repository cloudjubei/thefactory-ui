import type {
  TestSession,
  TestSessionHelper,
  TestSessionState,
  TestSessionView,
} from 'thefactory-ui/headless'

const SERVED_AT = 'http://127.0.0.1:41873'

const RUNNING: TestSession = {
  key: 'g-reminders',
  runId: 'r-reminders-be',
  status: 'running',
  startedAt: 1_763_640_000_000,
  url: SERVED_AT,
  parts: [
    {
      role: 'backend',
      project: 'demo-api',
      url: 'http://127.0.0.1:41871',
      ref: '3f9c2a1d7b04',
      sha: '3f9c2a1d7b04e5a6',
    },
    { role: 'web', project: 'demo-web', url: SERVED_AT, ref: 'HEAD', sha: '9a0b1c2d3e4f5a6b' },
  ],
  environment: 'dev',
  terms: ['reminder.service', 'reminder-schedule.controller'],
  log: {
    lines: [
      {
        role: 'backend',
        kind: 'feature',
        text: '[ReminderService] scheduled 3 reminders for user 1042',
        at: 1_763_640_004_000,
      },
      {
        role: 'web',
        kind: 'warning',
        text: 'Warning: Each child in a list should have a unique "key" prop.',
        at: 1_763_640_006_000,
      },
      {
        role: 'backend',
        kind: 'feature',
        text: '[ReminderScheduleController] PATCH /reminders/schedule 200 41ms',
        at: 1_763_640_009_000,
      },
      {
        role: 'backend',
        kind: 'error',
        text: 'ERROR [ExceptionsHandler] Cannot read properties of undefined (reading "timezone")',
        at: 1_763_640_012_000,
      },
      {
        role: 'backend',
        kind: 'feature',
        text: '[ReminderService] sent reminder 7781 via push token=[REDACTED]',
        at: 1_763_640_015_000,
      },
    ],
    errors: 1,
    warnings: 1,
    feature: 3,
    read: 412,
  },
  proof: [
    {
      id: 'p-trail-1',
      kind: 'event',
      label: 'reminder.scheduled',
      detail: '{"event":"reminder.scheduled","reminderId":7781,"at":"09:00"}',
      source: 'backend trail',
      environment: 'dev',
      at: 1_763_640_009_500,
    },
    {
      id: 'p-record-1',
      kind: 'record',
      label: 'reminders 7781',
      detail: '{"id":7781,"user_id":1042,"time":"09:00","timezone":"Europe/Warsaw","active":true}',
      source: 'Data connector · queryTable reminders',
      environment: 'dev',
      at: 1_763_640_016_000,
    },
  ],
}

const HELPER_CHAT = {
  type: 'PROJECT_TOPIC',
  projectId: 'demo-api',
  topicId: 'test-session-g-reminders',
} as TestSessionHelper['chatContext']

const helper = (over: Partial<TestSessionHelper> = {}): TestSessionHelper => ({
  chatContext: HELPER_CHAT,
  chatContextId: '/projects/demo-api/topics/test-session-g-reminders',
  status: 'gathering',
  ...over,
})

const view = (over: Partial<TestSessionView> = {}): TestSessionView => ({
  runId: 'r-reminders-be',
  key: 'g-reminders',
  offered: true,
  ...over,
})

/** Every state the "Test with me" block is drawn in. */
export const TEST_WITH_ME_STATES = {
  idle: { view: view() },
  starting: { view: view(), pending: 'start' },
  'just-up': {
    view: view({
      session: {
        ...RUNNING,
        log: { lines: [], errors: 0, warnings: 0, feature: 0, read: 38 },
        proof: [],
      },
    }),
  },
  running: { view: view({ session: RUNNING }) },
  stopping: { view: view({ session: RUNNING }), pending: 'stop' },
  stopped: {
    view: view({ session: { ...RUNNING, status: 'stopped', stoppedAt: 1_763_640_300_000 } }),
  },
  'run-ended': {
    view: view({
      offered: false,
      reason: 'This run has ended, so a test session cannot start for it.',
      session: {
        ...RUNNING,
        status: 'stopped',
        stoppedAt: 1_763_640_300_000,
        problem: 'The run ended, so it was stopped.',
      },
    }),
  },
  failed: {
    view: view({
      session: {
        ...RUNNING,
        status: 'failed',
        url: undefined,
        parts: [],
        stoppedAt: 1_763_640_060_000,
        problem: "'backend' did not start, so nothing is served: nest build exited with 1",
        log: { lines: [], errors: 0, warnings: 0, feature: 0, read: 0 },
        proof: [],
      },
    }),
  },
  'start-refused': {
    view: view(),
    error: 'This run has ended, so a test session cannot start for it.',
  },
  'helper-gathering': { view: view({ session: { ...RUNNING, helper: helper() } }) },
  'helper-not-started': {
    view: view({
      session: {
        ...RUNNING,
        helper: helper({
          status: 'not-started',
          problem: 'No agent to start: add an API model, or sign in to a CLI in Settings.',
        }),
      },
    }),
  },
  'helper-stopped': {
    view: view({
      session: {
        ...RUNNING,
        status: 'stopped',
        stoppedAt: 1_763_640_300_000,
        helper: helper({ status: 'stopped' }),
      },
    }),
  },
  'no-data-environment': {
    view: view({ session: { ...RUNNING, environment: undefined, proof: [] } }),
  },
} satisfies Record<string, TestSessionState>

export type TestWithMeState = keyof typeof TEST_WITH_ME_STATES
