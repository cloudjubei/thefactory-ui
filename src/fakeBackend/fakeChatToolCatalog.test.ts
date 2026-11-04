import { describe, expect, it } from 'vitest'
import { chatToolScopesOf, fakeChatToolCatalog } from './fakeChatToolCatalog'

const names = (query: Parameters<typeof fakeChatToolCatalog>[0]) =>
  fakeChatToolCatalog(query).map((row) => row.name)

describe('chatToolScopesOf', () => {
  it('offers only the transport when no chat is named', () => {
    expect(chatToolScopesOf({})).toEqual([])
  })

  it('gives the app-level chat its global tools', () => {
    expect(chatToolScopesOf({ type: 'GENERAL' })).toEqual(['common', 'messaging', 'global'])
  })

  it('treats a general chat naming a project as a project chat, not the global one', () => {
    expect(chatToolScopesOf({ type: 'GENERAL', projectId: 'p1' })).toEqual([
      'common',
      'messaging',
      'project',
      'work',
    ])
  })

  it('gives a group chat its group tools', () => {
    expect(chatToolScopesOf({ type: 'GROUP', groupId: 'g1' })).toEqual([
      'common',
      'messaging',
      'group',
    ])
  })

  it('gives a chat with neither project nor group only what every chat has', () => {
    expect(chatToolScopesOf({ type: 'GROUP' })).toEqual(['common', 'messaging'])
  })

  it('gives a project chat the project tools and the way to start work', () => {
    expect(chatToolScopesOf({ type: 'PROJECT', projectId: 'p1' })).toEqual([
      'common',
      'messaging',
      'project',
      'work',
    ])
  })

  it('gives a story chat the same scopes as its project', () => {
    expect(chatToolScopesOf({ type: 'STORY', projectId: 'p1', storyId: 's1' })).toEqual(
      chatToolScopesOf({ type: 'PROJECT', projectId: 'p1' }),
    )
  })

  it('never lets a run chat message other chats or start work', () => {
    const scopes = chatToolScopesOf({ type: 'AGENT_RUN_STORY', projectId: 'p1', agentRunId: 'r1' })
    expect(scopes).toEqual(['common', 'project', 'run'])
  })

  it('keeps a run chat with no project off the project tools', () => {
    expect(chatToolScopesOf({ type: 'AGENT_RUN_TASK', agentRunId: 'r1' })).toEqual(['common'])
  })
})

describe('fakeChatToolCatalog', () => {
  it('defaults to the api transport', () => {
    expect(names({})).toEqual(names({ runner: 'api' }))
  })

  it('offers another transport its own rows', () => {
    expect(names({ runner: 'cli' })).not.toEqual(names({ runner: 'api' }))
  })

  it('lists the transport first, then the context', () => {
    const transport = names({ runner: 'api' })
    expect(names({ runner: 'api', type: 'GENERAL' }).slice(0, transport.length)).toEqual(transport)
  })

  it('offers two chat contexts different rows', () => {
    expect(names({ type: 'PROJECT', projectId: 'p1' })).not.toEqual(names({ type: 'GENERAL' }))
  })

  it('lists no tool twice, whichever context', () => {
    for (const query of [
      { type: 'GENERAL' },
      { type: 'GROUP', groupId: 'g1' },
      { type: 'PROJECT', projectId: 'p1' },
      { type: 'AGENT_RUN_FEATURE', projectId: 'p1', agentRunId: 'r1' },
      { runner: 'cli', type: 'PROJECT', projectId: 'p1' },
    ] as const) {
      const rows = names(query)
      expect(rows).toEqual([...new Set(rows)])
    }
  })

  it('keeps a row the assembly cannot leave off locked', () => {
    const row = fakeChatToolCatalog({ type: 'PROJECT', projectId: 'p1' }).find(
      (entry) => entry.name === 'askUser',
    )
    expect(row).toMatchObject({ alwaysOn: true, everyRunner: true })
  })

  it('leaves the way to start work switchable', () => {
    const row = fakeChatToolCatalog({ type: 'PROJECT', projectId: 'p1' }).find(
      (entry) => entry.name === 'startFeatureWork',
    )
    expect(row).toMatchObject({ alwaysOn: false, everyRunner: true })
  })
})
