import { describe, expect, it } from 'vitest'
import { DELIVERY_DEFAULT_BRANCH_TEMPLATE } from 'thefactory-tools/constants'

import {
  deliveryBranchPreview,
  deliveryDraftOf,
  deliveryDraftProblems,
  deliverySettingsOfDraft,
  deliverySettingsView,
  readDeliverySettings,
  sameDeliverySettings,
  withDeliverySettings,
} from './deliverySettings'
import { DELIVERY_EMPTY_DRAFT, DELIVERY_SETTINGS_COPY } from './deliverySettingsConstants'
import type { DeliveryFormDraft, DeliverySettingsInput } from './deliverySettingsTypes'

const GROUP = { kind: 'group', groupId: 'shop' } as const
const PROJECT = { kind: 'project', projectId: 'shop-web' } as const
const FULL = {
  branchTemplate: 'feature/{ticket}-{short}',
  baseBranch: 'dev',
  prFirst: true,
  mergeMethod: 'squash' as const,
}

const draft = (over: Partial<DeliveryFormDraft> = {}): DeliveryFormDraft => ({
  ...DELIVERY_EMPTY_DRAFT,
  ...over,
})

describe('readDeliverySettings', () => {
  it('reads a setting it can keep', () => {
    expect(readDeliverySettings({ delivery: FULL })).toEqual(FULL)
    expect(readDeliverySettings({ delivery: {} })).toEqual({})
  })

  it('reads nothing from a record without one, or with one it could not keep', () => {
    expect(readDeliverySettings(undefined)).toBeUndefined()
    expect(readDeliverySettings(null)).toBeUndefined()
    expect(readDeliverySettings({})).toBeUndefined()
    expect(readDeliverySettings({ delivery: 'feature/{ticket}' })).toBeUndefined()
    expect(readDeliverySettings({ delivery: { mergeMethod: 'fast-forward' } })).toBeUndefined()
  })
})

describe('withDeliverySettings', () => {
  it('sets the setting and keeps the rest of the metadata', () => {
    expect(withDeliverySettings({ other: 1 }, { prFirst: true })).toEqual({
      other: 1,
      delivery: { prFirst: true },
    })
  })

  it('drops the key for an empty setting', () => {
    expect(withDeliverySettings({ other: 1, delivery: FULL }, {})).toEqual({ other: 1 })
    expect(withDeliverySettings(undefined, {})).toEqual({})
  })
})

describe('deliveryDraftOf', () => {
  it('fills the form from a full setting', () => {
    expect(deliveryDraftOf(FULL, 'project')).toEqual({
      branchTemplate: 'feature/{ticket}-{short}',
      baseBranch: 'dev',
      prFirst: 'on',
      mergeMethod: 'squash',
    })
    expect(deliveryDraftOf({ prFirst: false }, 'project').prFirst).toBe('off')
  })

  it('leaves a project’s unstated fields to its group', () => {
    expect(deliveryDraftOf(undefined, 'project')).toEqual(DELIVERY_EMPTY_DRAFT)
  })

  it('reads a group’s unstated PR-first as off', () => {
    expect(deliveryDraftOf(undefined, 'group')).toEqual({ ...DELIVERY_EMPTY_DRAFT, prFirst: 'off' })
  })
})

describe('deliverySettingsOfDraft', () => {
  it('trims text and keeps every stated field', () => {
    expect(
      deliverySettingsOfDraft(
        draft({
          branchTemplate: '  feature/{ticket}-{short} ',
          baseBranch: ' dev ',
          prFirst: 'on',
          mergeMethod: 'squash',
        }),
        'group',
      ),
    ).toEqual(FULL)
  })

  it('leaves out empty and inherited fields', () => {
    expect(deliverySettingsOfDraft(draft({ branchTemplate: '   ' }), 'project')).toEqual({})
  })

  it('keeps a project’s off, which overrides its group, but not a group’s', () => {
    expect(deliverySettingsOfDraft(draft({ prFirst: 'off' }), 'project')).toEqual({
      prFirst: false,
    })
    expect(deliverySettingsOfDraft(draft({ prFirst: 'off' }), 'group')).toEqual({})
  })

  it('reads back to the same form', () => {
    const form = draft({ branchTemplate: 'pr/{runid8}', prFirst: 'off', mergeMethod: 'rebase' })
    expect(deliveryDraftOf(deliverySettingsOfDraft(form, 'project'), 'project')).toEqual(form)
  })
})

describe('sameDeliverySettings', () => {
  it('compares field by field', () => {
    expect(sameDeliverySettings(FULL, { ...FULL })).toBe(true)
    expect(sameDeliverySettings(FULL, { ...FULL, baseBranch: 'main' })).toBe(false)
    expect(sameDeliverySettings({}, { prFirst: false })).toBe(false)
  })
})

describe('deliveryDraftProblems', () => {
  it('finds nothing wrong with empty fields or good ones', () => {
    expect(deliveryDraftProblems(DELIVERY_EMPTY_DRAFT)).toEqual({})
    expect(
      deliveryDraftProblems(draft({ branchTemplate: 'feature/{ticket}', baseBranch: 'release/1' })),
    ).toEqual({})
  })

  it('says why a template cannot name branches, as a sentence', () => {
    expect(deliveryDraftProblems(draft({ branchTemplate: 'feature/{short}' }))).toEqual({
      branchTemplate: 'Must hold {ticket} or {runid8}, so two runs never share a branch.',
    })
    expect(deliveryDraftProblems(draft({ branchTemplate: 'f/{title}-{runid8}' }))).toEqual({
      branchTemplate: 'Uses {title}; only {ticket}, {short} and {runid8} are filled.',
    })
  })

  it('refuses a base branch git would not take', () => {
    expect(deliveryDraftProblems(draft({ baseBranch: 'dev branch' }))).toEqual({
      baseBranch: DELIVERY_SETTINGS_COPY.badBase,
    })
  })
})

describe('deliveryBranchPreview', () => {
  it('fills the template for a sample run', () => {
    expect(deliveryBranchPreview('feature/{ticket}-{short}')).toEqual({
      branch: 'feature/abc-123-add-dark-mode',
    })
    expect(deliveryBranchPreview(DELIVERY_DEFAULT_BRANCH_TEMPLATE)).toEqual({
      branch: 'review/add-dark-mode-0a1b2c3d',
    })
  })

  it('says why a template makes no name', () => {
    expect(deliveryBranchPreview('feature/{short}')).toHaveProperty('error')
  })
})

describe('deliverySettingsView', () => {
  const groupInput = (over: Partial<DeliverySettingsInput> = {}): DeliverySettingsInput => ({
    owner: GROUP,
    title: 'Shop',
    groupType: 'MAIN',
    saved: undefined,
    draft: deliveryDraftOf(undefined, 'group'),
    ...over,
  })
  const projectInput = (over: Partial<DeliverySettingsInput> = {}): DeliverySettingsInput => ({
    owner: PROJECT,
    title: 'Shop web',
    saved: undefined,
    draft: DELIVERY_EMPTY_DRAFT,
    mainGroup: { title: 'Shop', type: 'MAIN', delivery: FULL },
    ...over,
  })

  it('shows a group with nothing set on the defaults, with nothing to save', () => {
    const view = deliverySettingsView(groupInput())
    expect(view).toMatchObject({
      intro: DELIVERY_SETTINGS_COPY.groupIntro('Shop'),
      editable: true,
      templatePlaceholder: DELIVERY_DEFAULT_BRANCH_TEMPLATE,
      basePlaceholder: DELIVERY_SETTINGS_COPY.baseOwnRun,
      preview: { branch: 'review/add-dark-mode-0a1b2c3d' },
      problems: {},
      dirty: false,
      canSave: false,
    })
    expect(view.prFirstOptions.map((o) => o.value)).toEqual(['on', 'off'])
    expect(view.mergeOptions.map((o) => o.label)).toEqual([
      DELIVERY_SETTINGS_COPY.repoChoice,
      'Squash',
      'Merge',
      'Rebase',
    ])
  })

  it('previews the template being typed and can save it', () => {
    const view = deliverySettingsView(
      groupInput({ draft: draft({ branchTemplate: 'feature/{ticket}-{short}', prFirst: 'off' }) }),
    )
    expect(view.preview).toEqual({ branch: 'feature/abc-123-add-dark-mode' })
    expect(view).toMatchObject({ dirty: true, canSave: true })
  })

  it('cannot save a form with a problem', () => {
    const view = deliverySettingsView(groupInput({ draft: draft({ baseBranch: 'a b' }) }))
    expect(view).toMatchObject({ dirty: true, canSave: false })
    expect(view.problems.baseBranch).toBe(DELIVERY_SETTINGS_COPY.badBase)
  })

  it('has nothing to save when only spacing changed', () => {
    const view = deliverySettingsView(
      groupInput({
        saved: { baseBranch: 'dev' },
        draft: draft({ baseBranch: ' dev ', prFirst: 'off' }),
      }),
    )
    expect(view.dirty).toBe(false)
  })

  it('keeps a scope group read-only', () => {
    const view = deliverySettingsView(
      groupInput({ groupType: 'SCOPE', draft: draft({ prFirst: 'on' }) }),
    )
    expect(view).toMatchObject({
      intro: DELIVERY_SETTINGS_COPY.scopeIntro('Shop'),
      editable: false,
      canSave: false,
    })
  })

  it('shows a project what its empty fields take from its group', () => {
    const view = deliverySettingsView(projectInput())
    expect(view).toMatchObject({
      intro: DELIVERY_SETTINGS_COPY.projectIntro('Shop web'),
      templatePlaceholder: 'feature/{ticket}-{short}',
      basePlaceholder: 'dev',
      preview: { branch: 'feature/abc-123-add-dark-mode' },
      dirty: false,
    })
    expect(view.prFirstOptions).toEqual([
      { value: 'inherit', label: DELIVERY_SETTINGS_COPY.fromGroup('On') },
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ])
    expect(view.mergeOptions[0]).toEqual({
      value: 'inherit',
      label: DELIVERY_SETTINGS_COPY.fromGroup('Squash'),
    })
  })

  it('previews a project’s own template over its group’s', () => {
    const view = deliverySettingsView(
      projectInput({ draft: draft({ branchTemplate: 'pr/{runid8}' }) }),
    )
    expect(view.preview).toEqual({ branch: 'pr/0a1b2c3d' })
  })

  it('takes nothing from a scope group', () => {
    const view = deliverySettingsView(
      projectInput({ mainGroup: { title: 'Scope', type: 'SCOPE', delivery: FULL } }),
    )
    expect(view.templatePlaceholder).toBe(DELIVERY_DEFAULT_BRANCH_TEMPLATE)
    expect(view.prFirstOptions[0]!.label).toBe(DELIVERY_SETTINGS_COPY.fromGroup('Off'))
    expect(view.mergeOptions[0]!.label).toBe(DELIVERY_SETTINGS_COPY.repoChoice)
  })
})
