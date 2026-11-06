import { describe, expect, it } from 'vitest'
import type { ExternalItem } from '../api/generated'
import { CONNECTOR_NEW_ITEMS_CHANNEL } from './connectorNewItemsConstants'
import type { ConnectorNewItems } from './connectorNewItemsTypes'
import {
  connectorNewItemsById,
  connectorNewItemsIndicator,
  connectorShownItems,
  withConnectorNewItems,
} from './connectorNewItems'

const counts = (over: Partial<ConnectorNewItems> = {}): ConnectorNewItems => ({
  connectionId: 'c1',
  identityEpoch: 'e1',
  newCount: 0,
  uncertainCount: 0,
  ...over,
})

describe('connectorNewItemsIndicator', () => {
  it('shows nothing before counts are known', () => {
    expect(connectorNewItemsIndicator(undefined)).toEqual({ kind: 'none' })
  })

  it('shows nothing when nothing is new', () => {
    expect(connectorNewItemsIndicator(counts())).toEqual({ kind: 'none' })
  })

  it('numbers the new tickets in the requests colour', () => {
    expect(connectorNewItemsIndicator(counts({ newCount: 3 }))).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: CONNECTOR_NEW_ITEMS_CHANNEL, count: 3 }], rollup: false },
      title: '3 new tickets',
    })
  })

  it('says one ticket in the singular', () => {
    expect(connectorNewItemsIndicator(counts({ newCount: 1 }))).toMatchObject({
      title: '1 new ticket',
    })
  })

  it('numbers only the new ones and names the uncertain ones apart', () => {
    expect(connectorNewItemsIndicator(counts({ newCount: 2, uncertainCount: 1 }))).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: CONNECTOR_NEW_ITEMS_CHANNEL, count: 2 }], rollup: false },
      title: '2 new tickets · 1 may be new',
    })
  })

  it('never numbers tickets that only may be new: a dot', () => {
    expect(connectorNewItemsIndicator(counts({ uncertainCount: 4 }))).toEqual({
      kind: 'dot',
      title: '4 tickets may be new',
    })
    expect(connectorNewItemsIndicator(counts({ uncertainCount: 1 }))).toEqual({
      kind: 'dot',
      title: '1 ticket may be new',
    })
  })
})

describe('connectorShownItems', () => {
  const listed: ExternalItem[] = [
    {
      provider: 'jira',
      externalId: 'ENG-1',
      sourceTenant: '["jira","https://acme.atlassian.net","c"]',
      sourceItemId: '10001',
      title: 'Secret plan',
      description: 'Body',
      url: 'https://acme.atlassian.net/browse/ENG-1',
      status: 'To Do',
      assignee: 'Me',
    },
    { provider: 'jira', externalId: 'ENG-2', title: 'Two', description: '' },
  ]

  it('keeps each listed item’s identity as the listing gave it, and no content', () => {
    expect(connectorShownItems(listed)).toEqual([
      {
        provider: 'jira',
        externalId: 'ENG-1',
        sourceTenant: '["jira","https://acme.atlassian.net","c"]',
        sourceItemId: '10001',
      },
      { provider: 'jira', externalId: 'ENG-2' },
    ])
  })
})

describe('connectorNewItemsById / withConnectorNewItems', () => {
  it('keys counts by connection', () => {
    const a = counts({ connectionId: 'a', newCount: 1 })
    const b = counts({ connectionId: 'b', uncertainCount: 2 })
    expect(connectorNewItemsById([a, b])).toEqual({ a, b })
  })

  it('takes one connection’s new counts and keeps the others', () => {
    const a = counts({ connectionId: 'a', newCount: 1 })
    const b = counts({ connectionId: 'b' })
    const next = counts({ connectionId: 'a', newCount: 0 })
    expect(withConnectorNewItems({ a, b }, next)).toEqual({ a: next, b })
  })
})
