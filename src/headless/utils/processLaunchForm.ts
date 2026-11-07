import type { ProcessInput, ProcessInputField, UiStackSetting } from 'thefactory-tools/types'
import { processInputsProblem } from 'thefactory-tools/utils'
import { PROCESS_INPUT_VALUES_KEY } from 'thefactory-tools/constants'

import {
  PROCESS_LAUNCH_COPY,
  PROCESS_LAUNCH_SHORT_KINDS,
  PROCESS_LAUNCH_SHORT_REF,
} from './processLaunchFormConstants'
import type {
  ProcessLaunchDraft,
  ProcessLaunchFieldDraft,
  ProcessLaunchInputValues,
  ProcessLaunchLayout,
  ProcessLaunchProblem,
  ProcessLaunchRefDraft,
  ProcessLaunchRepo,
  ProcessLaunchRepos,
  ProcessLaunchValueDraft,
  ProcessLaunchVariantChip,
  ProcessLaunchVariantDraft,
  ProcessLaunchVariantRow,
} from './processLaunchFormTypes'

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A variant's id from its label: lower case, its words joined by dashes. Pure. */
export function processLaunchVariantId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * What a refs value asks for in this project: a ref for each part of how its
 * product is served, as the launch names them to the host, or the project's
 * own when it serves nothing yet. One ref can stand for them all only when
 * every part comes from the project itself. Pure.
 */
export function processLaunchRepos(
  projectId: string,
  stack: Pick<UiStackSetting, 'parts'> | undefined,
): ProcessLaunchRepos {
  const whole: ProcessLaunchRepo = {
    key: `project:${projectId}`,
    label: PROCESS_LAUNCH_COPY.ref,
    project: projectId,
  }
  const parts = stack?.parts ?? []
  if (parts.length < 2) return { repos: [whole] }
  const repos = parts.map((part) => ({
    key: `role:${part.role}`,
    label: PROCESS_LAUNCH_COPY.refOf(capitalized(part.role)),
    role: part.role,
  }))
  const oneProject = parts.every((part) => !part.project || part.project === projectId)
  return { repos, ...(oneProject ? { one: whole } : {}) }
}

function blankRefs(repos: ProcessLaunchRepos): ProcessLaunchRefDraft[] {
  return repos.repos.map((repo) => ({ repo, ref: '', patch: '' }))
}

function blankField(
  field: Pick<ProcessInputField, 'kind'>,
  repos: ProcessLaunchRepos,
): ProcessLaunchFieldDraft {
  return field.kind === 'refs' ? blankRefs(repos) : ''
}

function blankVariant(
  input: ProcessInput,
  key: number,
  repos: ProcessLaunchRepos,
): ProcessLaunchVariantDraft {
  return {
    key: `v${key}`,
    label: '',
    values: Object.fromEntries(
      (input.fields ?? []).map((field) => [field.name, blankField(field, repos)]),
    ),
  }
}

function askedRepo(entry: Record<string, unknown>, repos: ProcessLaunchRepos): ProcessLaunchRepo {
  const known = [...repos.repos, ...(repos.one ? [repos.one] : [])]
  const role = typeof entry.role === 'string' ? entry.role : undefined
  const project = typeof entry.project === 'string' ? entry.project : undefined
  const found = known.find((r) => (role ? r.role === role : r.project === project))
  if (found) return found
  return role
    ? { key: `role:${role}`, label: PROCESS_LAUNCH_COPY.refOf(capitalized(role)), role }
    : {
        key: `project:${project ?? ''}`,
        label: PROCESS_LAUNCH_COPY.refOf(project ?? PROCESS_LAUNCH_COPY.ref),
        ...(project ? { project } : {}),
      }
}

function askedRefs(value: unknown, repos: ProcessLaunchRepos): ProcessLaunchRefDraft[] {
  if (!Array.isArray(value) || value.length === 0) return blankRefs(repos)
  return value.filter(isRecord).map((entry) => ({
    repo: askedRepo(entry, repos),
    ref: typeof entry.ref === 'string' ? entry.ref : '',
    patch: typeof entry.patch === 'string' ? entry.patch : '',
  }))
}

function askedField(
  field: Pick<ProcessInputField, 'kind'>,
  value: unknown,
  repos: ProcessLaunchRepos,
): ProcessLaunchFieldDraft {
  if (field.kind === 'refs') return askedRefs(value, repos)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function askedVariants(
  input: ProcessInput,
  value: unknown,
  repos: ProcessLaunchRepos,
): ProcessLaunchVariantDraft[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((variant, at) => {
    const filled = isRecord(variant.values) ? variant.values : {}
    return {
      key: `v${at}`,
      label: typeof variant.label === 'string' ? variant.label : '',
      ...(typeof variant.id === 'string' && variant.id ? { id: variant.id } : {}),
      values: Object.fromEntries(
        (input.fields ?? []).map((field) => [
          field.name,
          askedField(field, filled[field.name], repos),
        ]),
      ),
    }
  })
}

/**
 * A form from what a process asks for: each input as the launch named it, else
 * blank, with one blank variant to start from. `asked` is an agent's values,
 * read defensively as anything may be in them. Pure.
 */
export function processLaunchDraft(
  inputs: readonly ProcessInput[],
  repos: ProcessLaunchRepos,
  asked?: Readonly<Record<string, unknown>>,
): ProcessLaunchDraft {
  let nextKey = 0
  const values = Object.fromEntries(
    inputs.map((input): [string, ProcessLaunchValueDraft] => {
      if (input.kind !== 'variants') {
        return [input.name, askedField({ kind: input.kind }, asked?.[input.name], repos)]
      }
      const variants = askedVariants(input, asked?.[input.name], repos)
      const rows = variants.length > 0 ? variants : [blankVariant(input, 0, repos)]
      nextKey = Math.max(nextKey, rows.length)
      return [input.name, rows]
    }),
  )
  return { values, nextKey }
}

/** A form with one of its inputs set. Pure. */
export function setProcessLaunchValue(
  draft: ProcessLaunchDraft,
  name: string,
  value: ProcessLaunchValueDraft,
): ProcessLaunchDraft {
  return { ...draft, values: { ...draft.values, [name]: value } }
}

/** The variants a form holds for an input. Pure. */
export function processLaunchVariants(
  draft: ProcessLaunchDraft,
  name: string,
): readonly ProcessLaunchVariantDraft[] {
  const value = draft.values[name]
  return Array.isArray(value) && (value.length === 0 || 'key' in value[0]!)
    ? (value as readonly ProcessLaunchVariantDraft[])
    : []
}

function withVariant(
  draft: ProcessLaunchDraft,
  name: string,
  key: string,
  change: (variant: ProcessLaunchVariantDraft) => ProcessLaunchVariantDraft,
): ProcessLaunchDraft {
  return setProcessLaunchValue(
    draft,
    name,
    processLaunchVariants(draft, name).map((variant) =>
      variant.key === key ? change(variant) : variant,
    ),
  )
}

/** A form with a blank variant added under an input. Pure. */
export function addProcessLaunchVariant(
  draft: ProcessLaunchDraft,
  input: ProcessInput,
  repos: ProcessLaunchRepos,
): ProcessLaunchDraft {
  const added = blankVariant(input, draft.nextKey, repos)
  return {
    ...setProcessLaunchValue(draft, input.name, [
      ...processLaunchVariants(draft, input.name),
      added,
    ]),
    nextKey: draft.nextKey + 1,
  }
}

/** A form without one of its variants. Pure. */
export function removeProcessLaunchVariant(
  draft: ProcessLaunchDraft,
  name: string,
  key: string,
): ProcessLaunchDraft {
  return setProcessLaunchValue(
    draft,
    name,
    processLaunchVariants(draft, name).filter((variant) => variant.key !== key),
  )
}

/** A variant renamed: a label of its own gives it an id of its own. Pure. */
export function setProcessLaunchVariantLabel(
  draft: ProcessLaunchDraft,
  name: string,
  key: string,
  label: string,
): ProcessLaunchDraft {
  return withVariant(draft, name, key, ({ id: _named, ...variant }) => ({ ...variant, label }))
}

/** A variant with one of its fields set. Pure. */
export function setProcessLaunchVariantField(
  draft: ProcessLaunchDraft,
  name: string,
  key: string,
  field: string,
  value: ProcessLaunchFieldDraft,
): ProcessLaunchDraft {
  return withVariant(draft, name, key, (variant) => ({
    ...variant,
    values: { ...variant.values, [field]: value },
  }))
}

/** One repo's row of a refs value, changed. Pure. */
export function setProcessLaunchRef(
  refs: readonly ProcessLaunchRefDraft[],
  repoKey: string,
  change: Partial<Pick<ProcessLaunchRefDraft, 'ref' | 'patch' | 'patchLabel'>>,
): ProcessLaunchRefDraft[] {
  return refs.map((row) => {
    if (row.repo.key !== repoKey) return row
    const next = { ...row, ...change }
    if (change.patch === '') delete next.patchLabel
    return next
  })
}

/** Whether a refs value is the one ref standing for every repo. Pure. */
export function isProcessLaunchOneRef(
  refs: readonly ProcessLaunchRefDraft[],
  repos: ProcessLaunchRepos,
): boolean {
  return repos.one !== undefined && refs.length === 1 && refs[0]!.repo.key === repos.one.key
}

/** A refs value switched between one ref and a ref per repo, keeping the first ref typed. Pure. */
export function toggleProcessLaunchOneRef(
  refs: readonly ProcessLaunchRefDraft[],
  repos: ProcessLaunchRepos,
): ProcessLaunchRefDraft[] {
  if (!repos.one) return [...refs]
  const first = refs[0]
  if (isProcessLaunchOneRef(refs, repos)) {
    return repos.repos.map((repo, at) => ({
      repo,
      ref: at === 0 ? (first?.ref ?? '') : '',
      patch: at === 0 ? (first?.patch ?? '') : '',
      ...(at === 0 && first?.patchLabel ? { patchLabel: first.patchLabel } : {}),
    }))
  }
  return [
    {
      repo: repos.one,
      ref: first?.ref ?? '',
      patch: first?.patch ?? '',
      ...(first?.patchLabel ? { patchLabel: first.patchLabel } : {}),
    },
  ]
}

function numberOf(text: string): number | string {
  const value = Number(text)
  return text.trim() !== '' && Number.isFinite(value) ? value : text
}

function refsValue(rows: readonly ProcessLaunchRefDraft[]) {
  return rows
    .filter((row) => row.ref.trim() !== '')
    .map((row) => ({
      ...(row.repo.role ? { role: row.repo.role } : {}),
      ...(row.repo.project ? { project: row.repo.project } : {}),
      ref: row.ref.trim(),
      ...(row.patch ? { patch: row.patch } : {}),
    }))
}

function fieldValue(
  kind: ProcessInputField['kind'],
  held: ProcessLaunchFieldDraft | undefined,
): unknown {
  if (typeof held !== 'string') return refsValue(held ?? [])
  return kind === 'number' ? numberOf(held) : held
}

const isLeftOut = (value: unknown): boolean =>
  value === '' || (Array.isArray(value) && value.length === 0)

function variantValue(input: ProcessInput, variant: ProcessLaunchVariantDraft) {
  const entries = (input.fields ?? []).flatMap((field) => {
    const value = fieldValue(field.kind, variant.values[field.name])
    return isLeftOut(value) ? [] : [[field.name, value] as const]
  })
  return {
    id: variant.id ?? processLaunchVariantId(variant.label),
    label: variant.label.trim(),
    ...(entries.length > 0 ? { values: Object.fromEntries(entries) } : {}),
  }
}

/**
 * What a form sends, by input name: what is left out is not sent, numbers are
 * numbers once they can be, and a repo with no ref is no entry. Pure.
 */
export function processLaunchInputValues(
  inputs: readonly ProcessInput[],
  draft: ProcessLaunchDraft,
): ProcessLaunchInputValues {
  const entries = inputs.flatMap((input) => {
    const value =
      input.kind === 'variants'
        ? processLaunchVariants(draft, input.name).map((v) => variantValue(input, v))
        : fieldValue(input.kind, draft.values[input.name] as ProcessLaunchFieldDraft | undefined)
    return isLeftOut(value) ? [] : [[input.name, value] as const]
  })
  return Object.fromEntries(entries) as ProcessLaunchInputValues
}

function problemOf(
  inputs: readonly ProcessInput[],
  values: Readonly<Record<string, unknown>>,
): string | undefined {
  return processInputsProblem(inputs, { [PROCESS_INPUT_VALUES_KEY]: values })
}

function variantProblem(
  input: ProcessInput,
  draft: ProcessLaunchDraft,
  message: string,
): ProcessLaunchProblem {
  const variants = processLaunchVariants(draft, input.name)
  const sent = variants.map((variant) => variantValue(input, variant))
  const at = sent.findIndex(
    (_, end) => problemOf([input], { [input.name]: sent.slice(0, end + 1) }) !== undefined,
  )
  if (at < 0) return { message, fieldKey: input.name }
  const variant = variants[at]!
  const named = {
    message,
    fieldKey: `${input.name}.${variant.key}.label`,
    variantKey: variant.key,
  }
  const alone = sent[at]!
  const filled: Record<string, unknown> = alone.values ?? {}
  const field = (input.fields ?? []).find(
    (one) =>
      problemOf([{ ...input, fields: [one] }], {
        [input.name]: [
          { ...alone, values: one.name in filled ? { [one.name]: filled[one.name] } : {} },
        ],
      }) === message,
  )
  return field ? { ...named, fieldKey: `${input.name}.${variant.key}.${field.name}` } : named
}

/**
 * The first thing wrong with a form, in the words a launch refuses it with, and
 * the field that holds it. `undefined` when it would start. Pure.
 */
export function processLaunchProblem(
  inputs: readonly ProcessInput[],
  draft: ProcessLaunchDraft,
): ProcessLaunchProblem | undefined {
  const values = processLaunchInputValues(inputs, draft)
  const message = problemOf(inputs, values)
  if (!message) return undefined
  const input = inputs.find(
    (one) =>
      problemOf([one], one.name in values ? { [one.name]: values[one.name] } : {}) === message,
  )
  if (!input) return { message, fieldKey: '' }
  if (input.kind === 'variants' && input.name in values) {
    return variantProblem(input, draft, message)
  }
  return { message, fieldKey: input.name }
}

/** A ref as a chip shows it: a commit by its first characters, anything else whole. Pure. */
export function processLaunchShortRef(ref: string): string {
  return /^[0-9a-f]{12,}$/i.test(ref) ? ref.slice(0, PROCESS_LAUNCH_SHORT_REF) : ref
}

function variantChips(variant: ProcessLaunchVariantDraft): ProcessLaunchVariantChip[] {
  return Object.values(variant.values).flatMap((value) => {
    if (typeof value === 'string') return []
    return value.flatMap((row): ProcessLaunchVariantChip[] => [
      ...(row.ref.trim()
        ? [
            {
              key: `ref:${row.repo.key}`,
              kind: 'ref' as const,
              text: processLaunchShortRef(row.ref.trim()),
            },
          ]
        : []),
      ...(row.patch
        ? [
            {
              key: `patch:${row.repo.key}`,
              kind: 'patch' as const,
              text: row.patchLabel ?? PROCESS_LAUNCH_COPY.patchWritten,
            },
          ]
        : []),
    ])
  })
}

/** Each variant folded to one line: its name, and the refs and patches it is made of. Pure. */
export function processLaunchVariantRows(
  variants: readonly ProcessLaunchVariantDraft[],
  problem: ProcessLaunchProblem | undefined,
): ProcessLaunchVariantRow[] {
  return variants.map((variant, at) => {
    const name = variant.label.trim()
    return {
      key: variant.key,
      name: name || PROCESS_LAUNCH_COPY.unnamedVariant(at + 1),
      unnamed: name === '',
      chips: variantChips(variant),
      bad: problem?.variantKey === variant.key,
    }
  })
}

/** The form's inputs as it draws them: the short ones side by side, then each long one. Pure. */
export function processLaunchLayout(inputs: readonly ProcessInput[]): ProcessLaunchLayout {
  const rank = (input: ProcessInput) => (input.kind === 'text' ? 0 : input.kind === 'refs' ? 1 : 2)
  return {
    short: inputs.filter((input) => PROCESS_LAUNCH_SHORT_KINDS.includes(input.kind)),
    long: inputs
      .filter((input) => !PROCESS_LAUNCH_SHORT_KINDS.includes(input.kind))
      .sort((a, b) => rank(a) - rank(b)),
  }
}

/** The label of a repo's patch field. Pure. */
export function processLaunchPatchLabel(repo: ProcessLaunchRepo, rows: number): string {
  if (rows < 2) return PROCESS_LAUNCH_COPY.patch
  return PROCESS_LAUNCH_COPY.patchOf(repo.label.replace(/ ref$/, ''))
}

/** The words of the switch from one ref to a ref per repo, or back. Pure. */
export function processLaunchRefToggleLabel(
  refs: readonly ProcessLaunchRefDraft[],
  repos: ProcessLaunchRepos,
): string | undefined {
  if (!repos.one) return undefined
  if (!isProcessLaunchOneRef(refs, repos)) return PROCESS_LAUNCH_COPY.oneRef
  return PROCESS_LAUNCH_COPY.splitRefs(repos.repos.map((repo) => repo.role ?? repo.label))
}
