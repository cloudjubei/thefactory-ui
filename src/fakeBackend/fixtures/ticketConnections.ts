import type {
  ExternalItem,
  RedactedProviderConnectionEntry,
} from '../../headless/api/generated/types.gen'
import { FAKE_STAMP } from './stamps'

/** The one ticket connection the fake lists: a Jira site with tickets assigned to the person. */
export const FAKE_TICKET_CONNECTION: RedactedProviderConnectionEntry = {
  id: 'conn-jira',
  name: 'Fake Jira',
  provider: 'jira',
  username: 'fake@example.invalid',
  tokenSource: 'oauth',
  baseUrl: 'https://fake-jira.example.invalid',
  ...FAKE_STAMP,
  hasToken: true,
  hasRefreshToken: true,
}

/** The identity the connection's new-item counts belong to. */
export const FAKE_TICKET_IDENTITY_EPOCH = 'epoch-1'

const TENANT = '["jira","https://fake-jira.example.invalid","cloud-1"]'

const ticket = (key: string, title: string): ExternalItem => ({
  provider: 'jira',
  externalId: key,
  sourceTenant: TENANT,
  sourceItemId: `id-${key}`,
  title,
  description: '',
  status: 'To Do',
  assignee: 'Fake User',
})

/** The tickets assigned to the person on the connection, none shown yet. */
export const FAKE_ASSIGNED_TICKETS: ExternalItem[] = [
  ticket('ENG-101', 'Sign-off moves the ticket to Done'),
  ticket('ENG-102', 'Import keeps the ticket’s link'),
]
