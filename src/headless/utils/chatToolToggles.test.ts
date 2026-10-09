import { describe, expect, it } from 'vitest'
import {
  applyChatToolApprovalMode,
  applyChatToolToggle,
  buildChatToolApprovalToggle,
  buildChatToolToggles,
  filterChatToolToggles,
  groupChatToolToggles,
  resetChatToolToggles,
} from './chatToolToggles'
import type { ChatToolCatalogEntry } from './chatToolTogglesTypes'

const CATALOG: ChatToolCatalogEntry[] = [
  { name: 'readFile', description: 'Read a file.', category: 'file', alwaysOn: false },
  { name: 'gitLog', description: 'Git log.', category: 'git', alwaysOn: false },
  { name: 'addStory', description: 'Create a story.', category: 'story', alwaysOn: false },
  { name: 'askUser', description: 'Ask the user.', category: 'cli', alwaysOn: true },
]

describe('buildChatToolToggles — CLI', () => {
  it('shows every catalogue tool as available when the chat has NO allowlist', () => {
    const rows = buildChatToolToggles(CATALOG, undefined, 'cli')
    expect(rows.every((r) => r.available)).toBe(true)
  })

  it('reads an EMPTY allowlist as unset, so no tool appears switched off', () => {
    const rows = buildChatToolToggles(CATALOG, { cliAvailableTools: [] }, 'cli')
    expect(rows.every((r) => r.available)).toBe(true)
  })

  it('marks a tool the allowlist omits as unavailable', () => {
    const rows = buildChatToolToggles(CATALOG, { cliAvailableTools: ['readFile'] }, 'cli')
    expect(rows.find((r) => r.name === 'gitLog')?.available).toBe(false)
  })

  it('marks a tool the allowlist names as available', () => {
    const rows = buildChatToolToggles(CATALOG, { cliAvailableTools: ['readFile'] }, 'cli')
    expect(rows.find((r) => r.name === 'readFile')?.available).toBe(true)
  })

  it('keeps an always-on tool available and locked even when the allowlist omits it', () => {
    const rows = buildChatToolToggles(CATALOG, { cliAvailableTools: ['readFile'] }, 'cli')
    const askUser = rows.find((r) => r.name === 'askUser')
    expect(askUser).toMatchObject({ available: true, toggleable: false })
  })

  it('carries the catalogue description so no row renders blank', () => {
    const rows = buildChatToolToggles(CATALOG, undefined, 'cli')
    expect(rows.find((r) => r.name === 'readFile')?.description).toBe('Read a file.')
  })
})

describe('buildChatToolToggles — API', () => {
  it('offers a catalogue tool the chat does not yet carry, switched off', () => {
    const rows = buildChatToolToggles(CATALOG, { availableTools: ['readFile'] }, 'api')
    expect(rows.find((r) => r.name === 'gitLog')).toMatchObject({
      available: false,
      toggleable: true,
    })
  })

  it('marks a tool in availableTools as available', () => {
    const rows = buildChatToolToggles(CATALOG, { availableTools: ['readFile'] }, 'api')
    expect(rows.find((r) => r.name === 'readFile')?.available).toBe(true)
  })
})

describe('applyChatToolToggle — CLI', () => {
  it('materialises the whole catalogue minus one on the first switch-off', () => {
    const patch = applyChatToolToggle(CATALOG, undefined, 'cli', 'gitLog', false)
    expect(patch.cliAvailableTools).toEqual(['readFile', 'addStory', 'askUser'])
  })

  it('removes a further tool from an existing allowlist', () => {
    const patch = applyChatToolToggle(
      CATALOG,
      { cliAvailableTools: ['readFile', 'gitLog', 'askUser'] },
      'cli',
      'gitLog',
      false,
    )
    expect(patch.cliAvailableTools).toEqual(['readFile', 'askUser'])
  })

  it('adds a tool back', () => {
    const patch = applyChatToolToggle(
      CATALOG,
      { cliAvailableTools: ['readFile', 'askUser'] },
      'cli',
      'gitLog',
      true,
    )
    expect(patch.cliAvailableTools).toEqual(['readFile', 'gitLog', 'askUser'])
  })

  it('never writes an EMPTY list when the user switches off the last tool — that would read as unset and grant everything back', () => {
    const patch = applyChatToolToggle(
      CATALOG,
      { cliAvailableTools: ['readFile', 'askUser'] },
      'cli',
      'readFile',
      false,
    )
    expect(patch.cliAvailableTools).toEqual(['askUser'])
  })

  it('keeps the always-on names in the written list, so switching off the last toggleable tool cannot collapse to the unset (= everything) reading', () => {
    const patch = applyChatToolToggle(
      CATALOG,
      { cliAvailableTools: ['readFile'] },
      'cli',
      'readFile',
      false,
    )
    expect(patch.cliAvailableTools).toEqual(['askUser'])
  })

  it('refuses to switch off an always-on tool', () => {
    expect(applyChatToolToggle(CATALOG, undefined, 'cli', 'askUser', false)).toEqual({})
  })

  it('never touches the API allowlist', () => {
    const patch = applyChatToolToggle(CATALOG, undefined, 'cli', 'gitLog', false)
    expect(patch.availableTools).toBeUndefined()
  })
})

describe('applyChatToolToggle — API', () => {
  it('adds a tool to availableTools', () => {
    const patch = applyChatToolToggle(CATALOG, {}, 'api', 'readFile', true)
    expect(patch.availableTools).toEqual(['readFile'])
  })

  it('removes a tool from availableTools', () => {
    const patch = applyChatToolToggle(
      CATALOG,
      { availableTools: ['readFile'] },
      'api',
      'readFile',
      false,
    )
    expect(patch).toEqual({ availableTools: [] })
  })
})

describe('resetChatToolToggles', () => {
  it('puts back the chat type’s tools on every transport and its approval switch', () => {
    expect(
      resetChatToolToggles({
        availableTools: ['readFile', 'gitLog'],
        cliAvailableTools: ['readFile'],
        toolApprovalMode: 'auto',
      }),
    ).toEqual({
      availableTools: ['readFile', 'gitLog'],
      cliAvailableTools: ['readFile'],
      toolApprovalMode: 'auto',
    })
  })

  it('clears a CLI allowlist the chat type leaves unset back to the unset (= everything) reading', () => {
    expect(resetChatToolToggles({ availableTools: ['readFile'] }).cliAvailableTools).toEqual([])
  })

  it('reads a chat type without an approval switch as asking', () => {
    expect(resetChatToolToggles({ availableTools: ['readFile'] }).toolApprovalMode).toBe('ask')
  })

  it('hands the chat its own copy of the type’s lists', () => {
    const type = { availableTools: ['readFile'], cliAvailableTools: ['gitLog'] }
    const reset = resetChatToolToggles(type)
    expect(reset.availableTools).not.toBe(type.availableTools)
    expect(reset.cliAvailableTools).not.toBe(type.cliAvailableTools)
  })

  it('offers no API tools, every CLI tool and asks, for a chat type with no settings', () => {
    expect(resetChatToolToggles(undefined)).toEqual({
      availableTools: [],
      cliAvailableTools: [],
      toolApprovalMode: 'ask',
    })
  })
})

describe('filterChatToolToggles', () => {
  const rows = buildChatToolToggles(CATALOG, undefined, 'cli')

  it('returns everything for an empty query', () => {
    expect(filterChatToolToggles(rows, '  ')).toHaveLength(CATALOG.length)
  })

  it('matches on the tool name, case-insensitively', () => {
    expect(filterChatToolToggles(rows, 'GITLOG').map((r) => r.name)).toEqual(['gitLog'])
  })

  it('matches on the description', () => {
    expect(filterChatToolToggles(rows, 'create a story').map((r) => r.name)).toEqual(['addStory'])
  })

  it('matches on the category', () => {
    expect(filterChatToolToggles(rows, 'file').map((r) => r.name)).toEqual(['readFile'])
  })

  it('returns nothing when nothing matches', () => {
    expect(filterChatToolToggles(rows, 'zzz')).toEqual([])
  })
})

describe('groupChatToolToggles', () => {
  it('groups rows by category in first-seen order', () => {
    const groups = groupChatToolToggles(buildChatToolToggles(CATALOG, undefined, 'cli'))
    expect(groups.map((g) => g.category)).toEqual(['file', 'git', 'story', 'cli'])
  })

  it('keeps every row in its group', () => {
    const groups = groupChatToolToggles(buildChatToolToggles(CATALOG, undefined, 'cli'))
    expect(groups.flatMap((g) => g.tools.map((t) => t.name))).toEqual([
      'readFile',
      'gitLog',
      'addStory',
      'askUser',
    ])
  })

  it('collects rows that share a category into one group', () => {
    const groups = groupChatToolToggles(
      buildChatToolToggles(
        [
          ...CATALOG,
          { name: 'gitDiff', description: 'Git diff.', category: 'git', alwaysOn: false },
        ],
        undefined,
        'cli',
      ),
    )
    expect(groups.find((g) => g.category === 'git')?.tools.map((t) => t.name)).toEqual([
      'gitLog',
      'gitDiff',
    ])
  })
})

describe('buildChatToolApprovalToggle', () => {
  it('is OFF for a chat that never chose, so the agent still asks', () => {
    expect(buildChatToolApprovalToggle(undefined)).toEqual({ auto: false })
  })

  it('is OFF for an explicit ask', () => {
    expect(buildChatToolApprovalToggle({ toolApprovalMode: 'ask' }).auto).toBe(false)
  })

  it('is ON once the chat switched auto-approval on — on every transport alike', () => {
    expect(buildChatToolApprovalToggle({ toolApprovalMode: 'auto' }).auto).toBe(true)
  })
})

describe('applyChatToolApprovalMode', () => {
  it('writes the mode and nothing else, so a switched-off tool stays off', () => {
    expect(applyChatToolApprovalMode(true)).toEqual({ toolApprovalMode: 'auto' })
  })

  it('writes an explicit ask when switched back off', () => {
    expect(applyChatToolApprovalMode(false)).toEqual({ toolApprovalMode: 'ask' })
  })
})
