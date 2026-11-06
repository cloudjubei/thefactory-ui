import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_BADGE_OFF,
  CAPABILITY_DEVICE_LABEL,
  CAPABILITY_PER_PROJECT,
  CAPABILITY_SCOPE_FLAG,
  CAPABILITY_SETTINGS_SCOPE_INTRO,
  capabilityBadgeOnCount,
} from './capabilitySettingsConstants'
import {
  capabilityFlagsKey,
  capabilitySettingsView,
  normalizeFlags,
  readStoredFlags,
  readStoredToolSets,
  resolveCapabilityFlag,
  toolSetsKey,
  withDeviceAutomation,
  withGroupCapabilityFlag,
  withProjectCapabilityFlag,
  withToolSet,
} from './capabilitySettings'

const project = (
  own: unknown,
  inherited?: unknown,
  content: unknown = undefined,
  groupTitle = 'Factory',
) =>
  capabilitySettingsView({
    scope: 'project',
    groupTitle,
    own,
    inherited,
    toolSets: { ok: true, content },
  })

const row = (view: ReturnType<typeof capabilitySettingsView>, id: string) => {
  const found = view.sections.flatMap((section) => section.rows).find((item) => item.id === id)
  if (!found) throw new Error(`missing row ${id}`)
  return found
}

describe('readStoredFlags', () => {
  it('keeps exact booleans and drops anything else', () => {
    expect(
      readStoredFlags({
        connectorWriteBack: true,
        autoMerge: false,
        autoFollowUp: 'true',
        deviceAutomation: true,
        extra: true,
      }),
    ).toEqual({ connectorWriteBack: true, autoMerge: false })
  })

  it('is empty for an absent or malformed record', () => {
    expect(readStoredFlags(undefined)).toEqual({})
    expect(readStoredFlags(null)).toEqual({})
    expect(readStoredFlags(['connectorWriteBack'])).toEqual({})
    expect(readStoredFlags('true')).toEqual({})
  })
})

describe('resolveCapabilityFlag', () => {
  it('is off when neither layer says', () => {
    expect(resolveCapabilityFlag(undefined, undefined)).toEqual({ on: false, source: 'default' })
  })

  it('inherits a group boolean the project leaves out', () => {
    expect(resolveCapabilityFlag(undefined, true)).toEqual({ on: true, source: 'group' })
    expect(resolveCapabilityFlag(undefined, false)).toEqual({ on: false, source: 'group' })
  })

  it('lets a project false opt out of a group true', () => {
    expect(resolveCapabilityFlag(false, true)).toEqual({ on: false, source: 'project' })
    expect(resolveCapabilityFlag(true, false)).toEqual({ on: true, source: 'project' })
  })
})

describe('withProjectCapabilityFlag', () => {
  it('sets one flag and keeps the rest of the metadata', () => {
    expect(
      withProjectCapabilityFlag(
        { icon: 'box', capabilities: { autoMerge: true } },
        'autoFollowUp',
        true,
      ),
    ).toEqual({
      icon: 'box',
      capabilities: { autoMerge: true, autoFollowUp: true },
    })
  })

  it('drops a cleared flag, and the capabilities object when nothing remains', () => {
    expect(
      withProjectCapabilityFlag(
        { capabilities: { autoMerge: true }, icon: 'box' },
        'autoMerge',
        undefined,
      ),
    ).toEqual({ icon: 'box' })
  })

  it('does not store a non-flag that was sitting on the record', () => {
    expect(
      withProjectCapabilityFlag(
        { capabilities: { autoMerge: true, deviceAutomation: true } },
        'connectorWriteBack',
        false,
      ).capabilities,
    ).toEqual({ connectorWriteBack: false, autoMerge: true })
  })
})

describe('withGroupCapabilityFlag', () => {
  it('stores the boolean the person chose, including off', () => {
    expect(withGroupCapabilityFlag({ autoMerge: true }, 'autoMerge', false)).toEqual({
      autoMerge: false,
    })
  })
})

describe('tool sets', () => {
  it('reads string ids once, and a boolean switch only', () => {
    expect(
      readStoredToolSets({
        toolSets: [' knowledge ', 'knowledge', '', 3, 'trainer'],
        deviceAutomation: 'true',
      }),
    ).toEqual({ toolSets: ['knowledge', 'trainer'] })
    expect(readStoredToolSets({ deviceAutomation: false }).deviceAutomation).toBe(false)
    expect(readStoredToolSets(undefined)).toEqual({ toolSets: [] })
  })

  it('writes device automation explicitly and keeps the sets', () => {
    expect(withDeviceAutomation({ toolSets: ['trainer'] }, false)).toEqual({
      toolSets: ['trainer'],
      deviceAutomation: false,
    })
  })

  it('stores device automation off when a tool set changes and the switch was unset', () => {
    expect(withToolSet({ toolSets: ['trainer'] }, 'knowledge', true)).toEqual({
      toolSets: ['trainer', 'knowledge'],
      deviceAutomation: false,
    })
    expect(
      withToolSet({ toolSets: ['trainer', 'knowledge'], deviceAutomation: true }, 'trainer', false),
    ).toEqual({
      toolSets: ['knowledge'],
      deviceAutomation: true,
    })
  })

  it('keys an absent record the same as an explicit off', () => {
    expect(toolSetsKey(undefined)).toBe(toolSetsKey({ toolSets: [], deviceAutomation: false }))
    expect(capabilityFlagsKey(undefined)).toBe(capabilityFlagsKey({}))
    expect(normalizeFlags({ autoMerge: true, no: 1 })).toEqual({ autoMerge: true })
  })
})

describe('capabilitySettingsView', () => {
  it('shows a project with nothing on as Off', () => {
    const view = project(undefined, undefined, undefined)
    expect(view.badge).toEqual({
      on: false,
      label: CAPABILITY_BADGE_OFF,
      title: 'Every capability is off.',
    })
    expect(row(view, 'device-automation').on).toBe(false)
    expect(row(view, 'tool-set-trainer').on).toBe(false)
    expect(row(view, 'tool-set-knowledge').on).toBe(false)
    expect(row(view, 'flag-connectorWriteBack').on).toBe(false)
    expect(row(view, 'flag-connectorWriteBack').inheritLabel).toBeUndefined()
    expect(row(view, 'flag-autoMerge').on).toBe(false)
    expect(row(view, 'flag-autoFollowUp').on).toBe(false)
  })

  it('badges the powers that are exactly on, and ignores a string true', () => {
    const view = project(
      { connectorWriteBack: 'true', autoMerge: true },
      { connectorWriteBack: true },
      { deviceAutomation: true, toolSets: ['knowledge', 'custom'] },
    )
    expect(view.badge.label).toBe(capabilityBadgeOnCount(5))
    expect(view.badge.title).toBe(
      `${CAPABILITY_DEVICE_LABEL}, Code knowledge, custom, Connector write-back, Auto-merge.`,
    )
    expect(row(view, 'flag-connectorWriteBack')).toMatchObject({
      on: true,
      sourceLabel: 'On — Factory turns this on',
    })
    expect(row(view, 'flag-autoMerge')).toMatchObject({
      on: true,
      sourceLabel: 'Set on this project',
      inheritLabel: "Use Factory's setting",
    })
    expect(row(view, 'tool-set-custom').label).toBe('custom')
  })

  it('lets a project false win over the group, and offers the way back', () => {
    const view = project({ autoMerge: false }, { autoMerge: true, autoFollowUp: true })
    expect(row(view, 'flag-autoMerge')).toMatchObject({
      on: false,
      sourceLabel: 'Set on this project',
    })
    expect(row(view, 'flag-autoFollowUp').sourceLabel).toBe('On — Factory turns this on')
    expect(view.badge.label).toBe('Auto-follow-up')
  })

  it("shows a main group's flags, and leaves device automation to each project", () => {
    const view = capabilitySettingsView({
      scope: 'group',
      groupKind: 'MAIN',
      own: { autoFollowUp: true, connectorWriteBack: false },
    })
    expect(view.badge).toMatchObject({ on: true, label: 'Auto-follow-up' })
    expect(row(view, 'device-automation')).toMatchObject({
      switchable: false,
      detail: CAPABILITY_PER_PROJECT,
    })
    expect(row(view, 'tool-set-trainer').switchable).toBe(false)
    expect(row(view, 'flag-autoFollowUp').on).toBe(true)
    expect(row(view, 'flag-connectorWriteBack').on).toBe(false)
    expect(row(view, 'flag-autoMerge').on).toBe(false)
  })

  it("locks a scope group's flags off, because projects do not inherit them", () => {
    const view = capabilitySettingsView({
      scope: 'group',
      groupKind: 'SCOPE',
      own: { autoMerge: true },
    })
    expect(view.intro).toBe(CAPABILITY_SETTINGS_SCOPE_INTRO)
    expect(view.badge.label).toBe(CAPABILITY_BADGE_OFF)
    expect(row(view, 'flag-autoMerge')).toMatchObject({
      on: false,
      disabled: true,
      sourceLabel: CAPABILITY_SCOPE_FLAG,
    })
  })

  it('says when device automation and tool sets could not be read, and still shows the flags', () => {
    const view = capabilitySettingsView({
      scope: 'project',
      own: { autoMerge: true },
      toolSets: { ok: false },
    })
    expect(view.sections.map((section) => section.id)).toEqual(['tool-sets', 'flags'])
    expect(view.sections[0]?.rows).toEqual([])
    expect(view.badge).toMatchObject({ on: true, label: 'Auto-merge' })
    expect(view.badge.title).toContain('could not be read')
  })
})
