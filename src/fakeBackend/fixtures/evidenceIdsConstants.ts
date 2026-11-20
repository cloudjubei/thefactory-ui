/**
 * The id each item the run fixtures file is stored under, by a name that says
 * what it is: a UUID, as the reference grammar takes, so a chat can cite it
 * as `&<projectId>/evidence/<id>`. Each starts with its own number so short
 * citations tell them apart.
 */
export const FAKE_EVIDENCE_IDS = {
  'current-sign-up': 'e7000001-0000-4000-8000-000000000000',
  'current-welcome': 'e7000002-0000-4000-8000-000000000000',
  'current-script-recording': 'e7000003-0000-4000-8000-000000000000',
  'current-step-log': 'e7000004-0000-4000-8000-000000000000',
  'current-stopped-log': 'e7000005-0000-4000-8000-000000000000',
  'current-stopped': 'e7000006-0000-4000-8000-000000000000',
  'current-review': 'e7000007-0000-4000-8000-000000000000',
  'short-sign-up': 'e7000008-0000-4000-8000-000000000000',
  'short-welcome': 'e7000009-0000-4000-8000-000000000000',
  'short-script-recording': 'e7000010-0000-4000-8000-000000000000',
  'short-step-log': 'e7000011-0000-4000-8000-000000000000',
  'short-stopped-log': 'e7000012-0000-4000-8000-000000000000',
  'short-stopped': 'e7000013-0000-4000-8000-000000000000',
  'short-review': 'e7000014-0000-4000-8000-000000000000',
  'morning-sign-up': 'e7000015-0000-4000-8000-000000000000',
  'morning-welcome': 'e7000016-0000-4000-8000-000000000000',
  'morning-script-recording': 'e7000017-0000-4000-8000-000000000000',
  'morning-step-log': 'e7000018-0000-4000-8000-000000000000',
  'morning-stopped-log': 'e7000019-0000-4000-8000-000000000000',
  'morning-stopped': 'e7000020-0000-4000-8000-000000000000',
  'morning-review': 'e7000021-0000-4000-8000-000000000000',
  'final-report': 'e7000022-0000-4000-8000-000000000000',
  'final-post': 'e7000023-0000-4000-8000-000000000000',
  'script-recording': 'e7000024-0000-4000-8000-000000000000',
  'step-log-two-sections': 'e7000025-0000-4000-8000-000000000000',
  'step-log-stopped': 'e7000026-0000-4000-8000-000000000000',
  'step-log-take-overs': 'e7000027-0000-4000-8000-000000000000',
  'stopped-shot': 'e7000028-0000-4000-8000-000000000000',
  'run-through-recording': 'e7000029-0000-4000-8000-000000000000',
  'run-through-blocker': 'e7000030-0000-4000-8000-000000000000',
  'run-through-major': 'e7000031-0000-4000-8000-000000000000',
  'run-through-minor': 'e7000032-0000-4000-8000-000000000000',
  'run-through-record': 'e7000033-0000-4000-8000-000000000000',
} as const

/** The name of an item the run fixtures file. */
export type FakeEvidenceName = keyof typeof FAKE_EVIDENCE_IDS
