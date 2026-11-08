import { describe, expect, it } from 'vitest'
import type { ProcessInput } from 'thefactory-tools/types'

import {
  addProcessLaunchVariant,
  isProcessLaunchOneRef,
  processLaunchDraft,
  processLaunchInputValues,
  processLaunchLayout,
  processLaunchPatchLabel,
  processLaunchProblem,
  processLaunchRefToggleLabel,
  processLaunchRepos,
  processLaunchShortRef,
  processLaunchVariantId,
  processLaunchVariantRows,
  processLaunchVariants,
  removeProcessLaunchVariant,
  setProcessLaunchRef,
  setProcessLaunchValue,
  setProcessLaunchVariantField,
  setProcessLaunchVariantLabel,
  toggleProcessLaunchOneRef,
} from './processLaunchForm'
import type { ProcessLaunchRefDraft } from './processLaunchFormTypes'

const INPUTS: ProcessInput[] = [
  { name: 'person', label: 'Person', kind: 'note-reference', required: true },
  { name: 'product', label: 'How the product works', kind: 'note-reference' },
  {
    name: 'variants',
    label: 'Variants',
    kind: 'variants',
    required: true,
    fields: [{ name: 'refs', label: 'Refs', kind: 'refs', required: true }],
  },
  { name: 'days', label: 'Days', kind: 'number', required: true },
  { name: 'lookingFor', label: 'What we are looking for', kind: 'text', required: true },
]

const ONE_REPO = processLaunchRepos('app', undefined)
const STACK = processLaunchRepos('app', {
  parts: [
    { role: 'backend', serve: ['serve'] },
    { role: 'web', serve: ['serve'] },
  ],
})

const refsOf = (draft: ReturnType<typeof processLaunchDraft>, at = 0) =>
  processLaunchVariants(draft, 'variants')[at]!.values.refs as readonly ProcessLaunchRefDraft[]

function filled() {
  let draft = processLaunchDraft(INPUTS, STACK)
  draft = setProcessLaunchValue(draft, 'person', 'note-1')
  draft = setProcessLaunchValue(draft, 'days', '14')
  draft = setProcessLaunchValue(draft, 'lookingFor', 'Does it stick?')
  const key = processLaunchVariants(draft, 'variants')[0]!.key
  draft = setProcessLaunchVariantLabel(draft, 'variants', key, 'Short sign-up')
  let refs = setProcessLaunchRef(refsOf(draft), 'role:backend', { ref: 'b71f03d' })
  refs = setProcessLaunchRef(refs, 'role:web', { ref: 'c20e5f8' })
  return setProcessLaunchVariantField(draft, 'variants', key, 'refs', refs)
}

describe('processLaunchVariantId', () => {
  it('reads a label as an id', () => {
    expect(processLaunchVariantId('  Short Sign-up! ')).toBe('short-sign-up')
    expect(processLaunchVariantId('   ')).toBe('')
  })
})

describe('processLaunchRepos', () => {
  it('asks for the project alone when nothing is served', () => {
    expect(ONE_REPO.repos.map((r) => r.project)).toEqual(['app'])
    expect(ONE_REPO.one).toBeUndefined()
  })

  it('asks for the project alone for a stack of one part', () => {
    const repos = processLaunchRepos('app', { parts: [{ role: 'web', serve: ['s'] }] })
    expect(repos.repos.map((r) => r.project)).toEqual(['app'])
  })

  it('asks for a ref per part, and one can stand for all when they share the project', () => {
    expect(STACK.repos.map((r) => r.label)).toEqual(['Backend ref', 'Web ref'])
    expect(STACK.one?.project).toBe('app')
  })

  it('offers no single ref when a part comes from another project', () => {
    const repos = processLaunchRepos('app', {
      parts: [
        { role: 'backend', project: 'api', serve: ['s'] },
        { role: 'web', serve: ['s'] },
      ],
    })
    expect(repos.one).toBeUndefined()
  })
})

describe('processLaunchDraft', () => {
  it('starts blank with one blank variant', () => {
    const draft = processLaunchDraft(INPUTS, STACK)
    expect(draft.values.person).toBe('')
    expect(processLaunchVariants(draft, 'variants')).toHaveLength(1)
    expect(refsOf(draft).map((r) => r.repo.role)).toEqual(['backend', 'web'])
  })

  it('reads what an agent asked for, numbers as words', () => {
    const draft = processLaunchDraft(INPUTS, STACK, {
      person: 'n1',
      days: 7,
      variants: [
        {
          id: 'kept',
          label: 'Current',
          values: { refs: [{ role: 'web', ref: 'abc', patch: 'diff' }] },
        },
        { label: 'Other' },
        'not a variant',
      ],
    })
    expect(draft.values.days).toBe('7')
    const variants = processLaunchVariants(draft, 'variants')
    expect(variants.map((v) => v.label)).toEqual(['Current', 'Other'])
    expect(variants[0]!.id).toBe('kept')
    expect(refsOf(draft)[0]).toMatchObject({ ref: 'abc', patch: 'diff' })
    expect(refsOf(draft, 1).map((r) => r.ref)).toEqual(['', ''])
    expect(draft.nextKey).toBe(2)
  })

  it('keeps a ref for a repo the form does not know', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO, {
      variants: [{ label: 'A', values: { refs: [{ project: 'other', ref: 'x' }] } }],
    })
    expect(refsOf(draft)[0]!.repo).toMatchObject({ project: 'other', label: 'other ref' })
  })

  it('takes no anything-goes value for a text input', () => {
    expect(processLaunchDraft(INPUTS, ONE_REPO, { lookingFor: {} }).values.lookingFor).toBe('')
  })
})

describe('variants', () => {
  it('adds one with a key of its own, and removes it by key', () => {
    let draft = processLaunchDraft(INPUTS, ONE_REPO)
    draft = addProcessLaunchVariant(draft, INPUTS[2]!, ONE_REPO)
    draft = addProcessLaunchVariant(draft, INPUTS[2]!, ONE_REPO)
    const keys = processLaunchVariants(draft, 'variants').map((v) => v.key)
    expect(new Set(keys).size).toBe(3)
    draft = removeProcessLaunchVariant(draft, 'variants', keys[1]!)
    expect(processLaunchVariants(draft, 'variants').map((v) => v.key)).toEqual([keys[0], keys[2]])
    draft = addProcessLaunchVariant(draft, INPUTS[2]!, ONE_REPO)
    const after = processLaunchVariants(draft, 'variants').map((v) => v.key)
    expect(new Set(after).size).toBe(3)
  })

  it('drops the named id once the label is changed', () => {
    let draft = processLaunchDraft(INPUTS, ONE_REPO, { variants: [{ id: 'kept', label: 'A' }] })
    const [variant] = processLaunchVariants(draft, 'variants')
    expect(processLaunchInputValues(INPUTS, draft).variants).toMatchObject([{ id: 'kept' }])
    draft = setProcessLaunchVariantLabel(draft, 'variants', variant!.key, 'New name')
    expect(processLaunchInputValues(INPUTS, draft).variants).toMatchObject([{ id: 'new-name' }])
  })

  it('reads no variants from an input holding words', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO)
    expect(processLaunchVariants(draft, 'person')).toEqual([])
    expect(processLaunchVariants(draft, 'missing')).toEqual([])
  })
})

describe('refs', () => {
  const rows = (): ProcessLaunchRefDraft[] => [
    { repo: STACK.repos[0]!, ref: 'abc', patch: 'diff', patchLabel: 'Log steps' },
    { repo: STACK.repos[1]!, ref: 'def', patch: '' },
  ]

  it('clears a patch with its name', () => {
    const [first] = setProcessLaunchRef(rows(), 'role:backend', { patch: '' })
    expect(first).toEqual({ repo: STACK.repos[0], ref: 'abc', patch: '' })
  })

  it('takes a note as the patch, holding the note and not its text', () => {
    const [first] = setProcessLaunchRef(rows(), 'role:backend', {
      patchNote: 'n1',
      patchLabel: 'Trail',
    })
    expect(first).toEqual({
      repo: STACK.repos[0],
      ref: 'abc',
      patch: '',
      patchNote: 'n1',
      patchLabel: 'Trail',
    })
  })

  it('clears a patch note with its name', () => {
    const picked = setProcessLaunchRef(rows(), 'role:backend', { patchNote: 'n1' })
    const [first] = setProcessLaunchRef(picked, 'role:backend', { patch: '' })
    expect(first).toEqual({ repo: STACK.repos[0], ref: 'abc', patch: '' })
  })

  it('keeps a patch note when folding to one ref and back', () => {
    const picked = setProcessLaunchRef(rows(), 'role:backend', { patchNote: 'n1' })
    const one = toggleProcessLaunchOneRef(picked, STACK)
    expect(one[0]).toMatchObject({ patchNote: 'n1' })
    expect(toggleProcessLaunchOneRef(one, STACK)[0]).toMatchObject({ patchNote: 'n1' })
  })

  it('changes only the repo named', () => {
    const next = setProcessLaunchRef(rows(), 'role:web', { ref: 'zzz' })
    expect(next.map((r) => r.ref)).toEqual(['abc', 'zzz'])
  })

  it('folds to one ref keeping the first, and back', () => {
    const one = toggleProcessLaunchOneRef(rows(), STACK)
    expect(one).toHaveLength(1)
    expect(one[0]).toMatchObject({ ref: 'abc', patch: 'diff', patchLabel: 'Log steps' })
    expect(isProcessLaunchOneRef(one, STACK)).toBe(true)
    const split = toggleProcessLaunchOneRef(one, STACK)
    expect(split.map((r) => [r.repo.role, r.ref])).toEqual([
      ['backend', 'abc'],
      ['web', ''],
    ])
    expect(split[0]!.patchLabel).toBe('Log steps')
  })

  it('offers no switch when one ref cannot serve the product', () => {
    expect(toggleProcessLaunchOneRef(rows(), ONE_REPO)).toEqual(rows())
    expect(processLaunchRefToggleLabel(rows(), ONE_REPO)).toBeUndefined()
  })

  it('names the switch for what it does', () => {
    expect(processLaunchRefToggleLabel(rows(), STACK)).toBe('Use one ref')
    expect(processLaunchRefToggleLabel(toggleProcessLaunchOneRef(rows(), STACK), STACK)).toBe(
      'Use a backend and a web ref',
    )
  })

  it('labels a patch by its repo once there are several', () => {
    expect(processLaunchPatchLabel(STACK.repos[0]!, 2)).toBe('Backend patch')
    expect(processLaunchPatchLabel(STACK.repos[0]!, 1)).toBe('Patch')
  })
})

describe('processLaunchInputValues', () => {
  it('sends a filled form as a launch takes it', () => {
    expect(processLaunchInputValues(INPUTS, filled())).toEqual({
      person: 'note-1',
      days: 14,
      lookingFor: 'Does it stick?',
      variants: [
        {
          id: 'short-sign-up',
          label: 'Short sign-up',
          values: {
            refs: [
              { role: 'backend', ref: 'b71f03d' },
              { role: 'web', ref: 'c20e5f8' },
            ],
          },
        },
      ],
    })
  })

  it('leaves out what is blank, and sends no row for a repo with no ref', () => {
    const values = processLaunchInputValues(INPUTS, processLaunchDraft(INPUTS, STACK))
    expect(values).toEqual({ variants: [{ id: '', label: '' }] })
  })

  it('keeps a number that cannot be read, for the launch to refuse', () => {
    const draft = setProcessLaunchValue(processLaunchDraft(INPUTS, ONE_REPO), 'days', 'two')
    expect(processLaunchInputValues(INPUTS, draft).days).toBe('two')
  })

  it('reads a patch note an agent named, and sends it on as the note', () => {
    const refs = [{ project: 'app', ref: 'x', patchNote: 'n1' }]
    const draft = processLaunchDraft(INPUTS, ONE_REPO, {
      variants: [{ label: 'A', values: { refs } }],
    })
    expect(refsOf(draft)[0]).toMatchObject({ ref: 'x', patch: '', patchNote: 'n1' })
    expect(processLaunchInputValues(INPUTS, draft).variants).toEqual([
      { id: 'a', label: 'A', values: { refs } },
    ])
  })

  it('sends a patch with its ref', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO, {
      variants: [{ label: 'A', values: { refs: [{ project: 'app', ref: 'x', patch: 'diff' }] } }],
    })
    expect(processLaunchInputValues(INPUTS, draft).variants).toEqual([
      { id: 'a', label: 'A', values: { refs: [{ project: 'app', ref: 'x', patch: 'diff' }] } },
    ])
  })
})

describe('processLaunchProblem', () => {
  it('has none for a filled form', () => {
    expect(processLaunchProblem(INPUTS, filled())).toBeUndefined()
  })

  it('names the first input left out', () => {
    expect(processLaunchProblem(INPUTS, processLaunchDraft(INPUTS, ONE_REPO))).toEqual({
      message: 'Person is required.',
      fieldKey: 'person',
    })
  })

  it('marks a number that is not one', () => {
    const draft = setProcessLaunchValue(filled(), 'days', 'soon')
    expect(processLaunchProblem(INPUTS, draft)).toEqual({
      message: 'Days must be a number.',
      fieldKey: 'days',
    })
  })

  it('opens the variant with no label', () => {
    const draft = addProcessLaunchVariant(filled(), INPUTS[2]!, STACK)
    const key = processLaunchVariants(draft, 'variants')[1]!.key
    expect(processLaunchProblem(INPUTS, draft)).toEqual({
      message: 'Variants: variant 2 needs an id and a label.',
      fieldKey: `variants.${key}.label`,
      variantKey: key,
    })
  })

  it('marks a label two variants share', () => {
    let draft = addProcessLaunchVariant(filled(), INPUTS[2]!, STACK)
    const key = processLaunchVariants(draft, 'variants')[1]!.key
    draft = setProcessLaunchVariantLabel(draft, 'variants', key, 'Short sign-up')
    expect(processLaunchProblem(INPUTS, draft)).toEqual({
      message: 'Variants: more than one variant is called "short-sign-up".',
      fieldKey: `variants.${key}.label`,
      variantKey: key,
    })
  })

  it('marks the refs of a variant that has none', () => {
    let draft = addProcessLaunchVariant(filled(), INPUTS[2]!, STACK)
    const key = processLaunchVariants(draft, 'variants')[1]!.key
    draft = setProcessLaunchVariantLabel(draft, 'variants', key, 'Morning')
    expect(processLaunchProblem(INPUTS, draft)).toEqual({
      message: 'Variants: Morning: Refs is required.',
      fieldKey: `variants.${key}.refs`,
      variantKey: key,
    })
  })

  it('says a required list is left out when no variant is there', () => {
    const key = processLaunchVariants(filled(), 'variants')[0]!.key
    const draft = removeProcessLaunchVariant(filled(), 'variants', key)
    expect(processLaunchProblem(INPUTS, draft)).toEqual({
      message: 'Variants is required.',
      fieldKey: 'variants',
    })
  })
})

describe('processLaunchVariantRows', () => {
  it('folds a variant to its refs and patches', () => {
    let draft = filled()
    const key = processLaunchVariants(draft, 'variants')[0]!.key
    draft = setProcessLaunchVariantField(
      draft,
      'variants',
      key,
      'refs',
      setProcessLaunchRef(refsOf(draft), 'role:web', { patch: 'diff', patchLabel: 'Log steps' }),
    )
    const [row] = processLaunchVariantRows(processLaunchVariants(draft, 'variants'), undefined)
    expect(row).toMatchObject({ name: 'Short sign-up', unnamed: false, bad: false })
    expect(row!.chips.map((c) => [c.kind, c.text])).toEqual([
      ['ref', 'b71f03d'],
      ['ref', 'c20e5f8'],
      ['patch', 'Log steps'],
    ])
  })

  it('numbers a variant with no name, and marks the one with the problem', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO)
    const variants = processLaunchVariants(draft, 'variants')
    const [row] = processLaunchVariantRows(variants, {
      message: 'x',
      fieldKey: 'y',
      variantKey: variants[0]!.key,
    })
    expect(row).toMatchObject({ name: 'Variant 1', unnamed: true, bad: true, chips: [] })
  })

  it('names a patch note by its label', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO, {
      variants: [{ label: 'A', values: { refs: [{ project: 'app', ref: 'x', patchNote: 'n1' }] } }],
    })
    const variants = processLaunchVariants(draft, 'variants')
    const [row] = processLaunchVariantRows(variants, undefined, [{ id: 'n1', label: 'Trail' }])
    expect(row!.chips.map((c) => [c.kind, c.text])).toEqual([
      ['ref', 'x'],
      ['patch', 'Trail'],
    ])
  })

  it('calls a patch with no note a patch', () => {
    const draft = processLaunchDraft(INPUTS, ONE_REPO, {
      variants: [{ label: 'A', values: { refs: [{ project: 'app', ref: 'x', patch: 'diff' }] } }],
    })
    const [row] = processLaunchVariantRows(processLaunchVariants(draft, 'variants'), undefined)
    expect(row!.chips[1]!.text).toBe('A patch')
  })
})

describe('processLaunchShortRef', () => {
  it('shortens a full commit and leaves a branch whole', () => {
    expect(processLaunchShortRef('4e1c9a2b7f00112233')).toBe('4e1c9a2')
    expect(processLaunchShortRef('feature/short-sign-up')).toBe('feature/short-sign-up')
    expect(processLaunchShortRef('4e1c9a2')).toBe('4e1c9a2')
  })
})

describe('processLaunchLayout', () => {
  it('sets the short inputs side by side, then text, refs and variants', () => {
    const inputs: ProcessInput[] = [...INPUTS, { name: 'base', label: 'Base', kind: 'refs' }]
    const { short, long } = processLaunchLayout(inputs)
    expect(short.map((i) => i.name)).toEqual(['person', 'product', 'days'])
    expect(long.map((i) => i.name)).toEqual(['lookingFor', 'base', 'variants'])
  })
})
