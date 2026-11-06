import { describe, expect, it } from 'vitest'

import {
  isSignOffOutputList,
  readSignOffOutputs,
  signOffOutputDraftOf,
  signOffOutputDraftProblem,
  signOffOutputOfDraft,
  signOffOutputsIntro,
  signOffOutputSettingViews,
  signOffTemplateChoices,
  withoutSignOffOutput,
  withSavedSignOffOutput,
  withSignOffOutputs,
} from './signOffOutputSettings'
import {
  SIGN_OFF_OUTPUT_COPY,
  SIGN_OFF_OUTPUT_EMPTY_DRAFT,
  SIGN_OFF_OUTPUT_PROBLEMS,
} from './signOffOutputSettingsConstants'

const note = (id: string, label: string, kind: 'note' | 'secret' = 'note') => ({ id, label, kind })
const PR = { label: 'PR Text', templateNoteId: 'n1', perRepo: true }
const SLACK = { label: 'Slack Message', templateNoteId: 'n2', perRepo: false }
const NOTES = [note('n1', 'PR template'), note('n2', 'Slack template')]

describe('readSignOffOutputs', () => {
  it('reads a project’s list from its metadata', () => {
    expect(readSignOffOutputs({ signOffOutputs: [PR] })).toEqual([PR])
  })

  it.each([[undefined], [{}], [{ signOffOutputs: 'x' }], [{ signOffOutputs: [{ label: 1 }] }]])(
    'reads %j as none',
    (metadata) => {
      expect(readSignOffOutputs(metadata)).toEqual([])
    },
  )
})

describe('isSignOffOutputList', () => {
  it('takes a list of whole definitions and nothing else', () => {
    expect(isSignOffOutputList([PR, SLACK])).toBe(true)
    expect(isSignOffOutputList([])).toBe(true)
    expect(isSignOffOutputList([{ ...PR, perRepo: 'yes' }])).toBe(false)
    expect(isSignOffOutputList([null])).toBe(false)
    expect(isSignOffOutputList('x')).toBe(false)
  })
})

describe('withSignOffOutputs', () => {
  const metadata = { icon: 'folder', signOffOutputs: [PR] }

  it('replaces the list and keeps the rest of the metadata', () => {
    expect(withSignOffOutputs(metadata, [SLACK])).toEqual({
      icon: 'folder',
      signOffOutputs: [SLACK],
    })
  })

  it('drops the key on an empty list, as an update replaces metadata whole', () => {
    const next = withSignOffOutputs(metadata, [])
    expect(next).toEqual({ icon: 'folder' })
    expect('signOffOutputs' in next).toBe(false)
  })

  it('starts from no metadata', () => {
    expect(withSignOffOutputs(undefined, [PR])).toEqual({ signOffOutputs: [PR] })
  })
})

describe('withSavedSignOffOutput', () => {
  it('adds a new output at the end', () => {
    expect(withSavedSignOffOutput([PR], SLACK, undefined)).toEqual([PR, SLACK])
  })

  it('replaces the one being edited in its place, even under a new label', () => {
    const renamed = { ...PR, label: 'Pull request' }
    expect(withSavedSignOffOutput([PR, SLACK], renamed, 'pr text')).toEqual([renamed, SLACK])
  })

  it('adds when the one being edited has gone', () => {
    expect(withSavedSignOffOutput([PR], SLACK, 'gone')).toEqual([PR, SLACK])
  })
})

describe('withoutSignOffOutput', () => {
  it('takes out the output with that key, whatever its case', () => {
    expect(withoutSignOffOutput([PR, SLACK], ' PR TEXT ')).toEqual([SLACK])
  })

  it('leaves the list when nothing matches', () => {
    expect(withoutSignOffOutput([PR], 'other')).toEqual([PR])
  })
})

describe('signOffTemplateChoices', () => {
  it('offers notes, never secrets: a secret gives a run nothing', () => {
    expect(signOffTemplateChoices([note('n1', 'B'), note('s1', 'Key', 'secret')])).toEqual([
      { id: 'n1', label: 'B' },
    ])
  })
})

describe('signOffOutputDraftProblem', () => {
  const draft = (over = {}) => ({ ...SIGN_OFF_OUTPUT_EMPTY_DRAFT, ...over })
  const context = { outputs: [PR], choices: signOffTemplateChoices(NOTES) }

  it('needs a label', () => {
    expect(signOffOutputDraftProblem(draft({ label: ' ', templateNoteId: 'n1' }), context)).toBe(
      SIGN_OFF_OUTPUT_PROBLEMS.label,
    )
  })

  it('refuses a label another output has, whatever its case and spaces', () => {
    expect(
      signOffOutputDraftProblem(draft({ label: ' pr TEXT ', templateNoteId: 'n1' }), context),
    ).toBe(SIGN_OFF_OUTPUT_PROBLEMS.repeated)
  })

  it('lets an output keep its own label', () => {
    expect(
      signOffOutputDraftProblem(draft({ label: 'PR Text', templateNoteId: 'n1' }), {
        ...context,
        editing: 'pr text',
      }),
    ).toBeUndefined()
  })

  it('still refuses another output’s label while editing', () => {
    expect(
      signOffOutputDraftProblem(draft({ label: 'PR Text', templateNoteId: 'n1' }), {
        outputs: [PR, SLACK],
        choices: context.choices,
        editing: 'slack message',
      }),
    ).toBe(SIGN_OFF_OUTPUT_PROBLEMS.repeated)
  })

  it('needs a template note', () => {
    expect(signOffOutputDraftProblem(draft({ label: 'New' }), context)).toBe(
      SIGN_OFF_OUTPUT_PROBLEMS.template,
    )
  })

  it('refuses a template note that is gone, or secret', () => {
    expect(
      signOffOutputDraftProblem(draft({ label: 'New', templateNoteId: 'gone' }), context),
    ).toBe(SIGN_OFF_OUTPUT_PROBLEMS.template)
  })

  it('takes a whole draft', () => {
    expect(
      signOffOutputDraftProblem(draft({ label: 'New', templateNoteId: 'n2' }), context),
    ).toBeUndefined()
  })
})

describe('signOffOutputOfDraft', () => {
  it('trims and carries exactly the definition’s fields', () => {
    expect(
      signOffOutputOfDraft({ label: ' PR Text ', templateNoteId: ' n1 ', perRepo: true }),
    ).toEqual(PR)
  })
})

describe('signOffOutputDraftOf', () => {
  it('opens an output for editing', () => {
    expect(signOffOutputDraftOf(SLACK)).toEqual(SLACK)
  })
})

describe('signOffOutputSettingViews', () => {
  const OSC = { id: 'osc', title: 'OSC', type: 'MAIN' as const }

  it('lists a group’s own outputs, none read-only', () => {
    const views = signOffOutputSettingViews({
      own: [PR, SLACK],
      ownNotes: NOTES,
      notesRead: true,
    })
    expect(views.map((view) => [view.label, view.editable, view.sourceLabel])).toEqual([
      ['PR Text', true, undefined],
      ['Slack Message', true, undefined],
    ])
    expect(views[0]).toMatchObject({
      key: 'pr text',
      templateLabel: 'PR template',
      shapeLabel: SIGN_OFF_OUTPUT_COPY.perRepo,
    })
    expect(views[1]).toMatchObject({ shapeLabel: SIGN_OFF_OUTPUT_COPY.oneForAll })
  })

  it('shows a project what it gets from its main group, read-only and after its own', () => {
    const views = signOffOutputSettingViews({
      own: [{ label: 'Release note', templateNoteId: 'p1', perRepo: false }],
      ownNotes: [note('p1', 'Release template')],
      mainGroup: { ...OSC, signOffOutputs: [PR, SLACK] },
      groupNotes: NOTES,
      notesRead: true,
    })
    expect(views.map((view) => [view.label, view.editable, view.sourceLabel])).toEqual([
      ['Release note', true, undefined],
      ['PR Text', false, 'From OSC'],
      ['Slack Message', false, 'From OSC'],
    ])
    expect(views[1]?.templateLabel).toBe('PR template')
    expect(views[1]?.groupTitle).toBe('OSC')
  })

  it('counts a label both define once, as the project’s, and says what it replaces', () => {
    const own = { label: 'pr text', templateNoteId: 'p1', perRepo: false }
    const views = signOffOutputSettingViews({
      own: [own],
      ownNotes: [note('p1', 'Mine')],
      mainGroup: { ...OSC, signOffOutputs: [PR] },
      groupNotes: NOTES,
      notesRead: true,
    })
    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({
      label: 'pr text',
      editable: true,
      replaces: SIGN_OFF_OUTPUT_COPY.replaces('OSC'),
    })
  })

  it('takes nothing from a scope group', () => {
    const views = signOffOutputSettingViews({
      own: [],
      ownNotes: [],
      mainGroup: { ...OSC, type: 'SCOPE', signOffOutputs: [PR] },
      groupNotes: NOTES,
      notesRead: true,
    })
    expect(views).toEqual([])
  })

  it('replaces nothing of a scope group’s, as it gives nothing', () => {
    const [view] = signOffOutputSettingViews({
      own: [PR],
      ownNotes: NOTES,
      mainGroup: { ...OSC, type: 'SCOPE', signOffOutputs: [PR] },
      groupNotes: NOTES,
      notesRead: true,
    })
    expect(view?.replaces).toBeUndefined()
  })

  it('flags a template note that is gone', () => {
    const [view] = signOffOutputSettingViews({ own: [PR], ownNotes: [], notesRead: true })
    expect(view).toMatchObject({
      templateLabel: SIGN_OFF_OUTPUT_COPY.deletedNote,
      templateProblem: SIGN_OFF_OUTPUT_COPY.templateGone,
    })
  })

  it('flags a template note that became a secret', () => {
    const [view] = signOffOutputSettingViews({
      own: [PR],
      ownNotes: [note('n1', 'PR template', 'secret')],
      notesRead: true,
    })
    expect(view?.templateProblem).toBe(SIGN_OFF_OUTPUT_COPY.templateGone)
  })

  it('flags nothing until the notes are read', () => {
    const [view] = signOffOutputSettingViews({ own: [PR], ownNotes: [], notesRead: false })
    expect(view?.templateProblem).toBeUndefined()
    expect(view?.templateLabel).toBe(SIGN_OFF_OUTPUT_COPY.templateLoading)
  })
})

describe('signOffOutputsIntro', () => {
  it('says who gets a project’s, a main group’s and a scope group’s', () => {
    expect(signOffOutputsIntro({ kind: 'project', projectId: 'p' }, 'Web')).toContain('Web')
    expect(signOffOutputsIntro({ kind: 'group', groupId: 'g' }, 'OSC', 'MAIN')).toContain(
      'every project whose main group it is',
    )
    expect(signOffOutputsIntro({ kind: 'group', groupId: 'g' }, 'OSC', 'SCOPE')).toBe(
      SIGN_OFF_OUTPUT_COPY.scopeGroup('OSC'),
    )
  })
})
