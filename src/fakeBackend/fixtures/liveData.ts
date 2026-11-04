import type {
  DataRecord,
  DataSource,
  DataSubscription,
} from '../../headless/api/generated/types.gen'
import { FAKE_AT, FAKE_STAMP } from './stamps'

export const TASK_SOURCE = {
  id: 'wargames:official-sources',
  name: 'Official sources',
  recordType: 'official-source-report',
  freshness: 86_400_000,
  autoUpdate: true,
  projectId: 'wargames',
  adapter: {
    itemsPath: 'items',
    kind: 'snapshot',
    map: { key: 'key' },
    task: { script: 'monitor:sources', args: ['--json'] },
  },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} satisfies DataSource

export const FAKE_SOURCE_RECORDS: DataRecord[] = [
  {
    scope: TASK_SOURCE.id,
    type: TASK_SOURCE.recordType,
    key: 'rules-errata',
    content: { title: 'Rules errata', changed: false },
    ...FAKE_STAMP,
  },
]

export const FAKE_DATA_SUBSCRIPTIONS: DataSubscription[] = [
  { projectId: 'wargames', sourceId: TASK_SOURCE.id, subscribedAt: FAKE_AT },
]
