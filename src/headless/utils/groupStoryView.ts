import { GROUP_STORY_ACTION_LABELS, NO_GROUP_STORIES } from './groupStoryConstants'
import type {
  GroupStoryFolds,
  GroupStoryForm,
  GroupStoryFormLink,
  GroupStoryFormPartMoves,
  GroupStoryFormRow,
  GroupStoryListFilter,
  GroupStoryMemberProject,
  GroupStoryMembership,
  GroupStoryMembershipsByStory,
  GroupStoryPartView,
  GroupStoryRunButton,
  GroupStoryRunState,
  GroupStoryRunSummary,
  GroupStoryStepColumn,
  GroupStoryView,
  GroupStoryWriteBody,
} from './groupStoryTypes'
import { processGroupLiveState } from './processGroupView'
import { STATUS_ORDER, type StoryStatus } from './status'

const LIVE_RUN_STATUSES: readonly string[] = ['pending', 'running', 'parked']

/** A group story's parts by the step they run in, and the parts a loop of needs keeps out of every step. */
export function groupStoryStepColumns(view: GroupStoryView): {
  columns: GroupStoryStepColumn[]
  looping: GroupStoryPartView[]
} {
  const byStep = new Map<number, GroupStoryPartView[]>()
  const looping: GroupStoryPartView[] = []
  for (const part of view.partViews) {
    if (part.step === undefined) {
      looping.push(part)
      continue
    }
    byStep.set(part.step, [...(byStep.get(part.step) ?? []), part])
  }
  const columns = [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, parts]) => ({ step, parts }))
  return { columns, looping }
}

/** Every part's features done, out of all of them. */
export function groupStoryProgress(view: GroupStoryView): {
  done: number
  total: number
  text: string
} {
  const done = view.partViews.reduce((n, p) => n + p.featuresDone, 0)
  const total = view.partViews.reduce((n, p) => n + p.featuresTotal, 0)
  return { done, total, text: total === 0 ? 'No features yet' : `${done}/${total} done` }
}

/** How many parts it has and their features done, as its header and Parts heading say it. */
export function groupStoryPartsText(view: GroupStoryView): string {
  const count = view.partViews.length
  return `${count} part${count === 1 ? '' : 's'} · ${groupStoryProgress(view).text}`
}

/** The page's folds with one Overview section opened, or folded again when it was open. */
export function groupStoryToggledFold(folds: GroupStoryFolds, key: string): GroupStoryFolds {
  return {
    ...folds,
    sections: folds.sections.includes(key)
      ? folds.sections.filter((k) => k !== key)
      : [...folds.sections, key],
  }
}

/** How a part is named: its project, and its story too once its project has several parts. */
export function groupStoryPartName(view: GroupStoryView, part: GroupStoryPartView): string {
  const several = view.partViews.filter((p) => p.projectId === part.projectId).length > 1
  return several ? `${part.projectTitle} · ${part.storyTitle ?? part.storyId}` : part.projectTitle
}

/** Where a part runs among its project's parts — “2 of 3 in UI” — while its project has several. */
export function groupStoryPartPlace(
  view: GroupStoryView,
  part: GroupStoryPartView,
): string | undefined {
  const own = view.partViews.filter((p) => p.projectId === part.projectId)
  if (own.length < 2) return undefined
  return `${own.indexOf(part) + 1} of ${own.length} in ${part.projectTitle}`
}

/** The parts a part needs, by name. */
export function groupStoryNeedTitles(part: GroupStoryPartView, view: GroupStoryView): string[] {
  return part.needs.map((id) => {
    const needed = view.partViews.find((p) => p.storyId === id)
    return needed ? groupStoryPartName(view, needed) : id
  })
}

/** How many stories it links, as its Linked heading says it; nothing when it links none. */
export function groupStoryLinksText(view: GroupStoryView): string | undefined {
  const count = view.linkViews.length
  if (count === 0) return undefined
  return `${count} linked ${count === 1 ? 'story' : 'stories'} · tracked only`
}

/** Whether a group story's latest run is still going. */
export function isLiveGroupStoryRun(run: GroupStoryRunSummary | undefined): boolean {
  return run !== undefined && LIVE_RUN_STATUSES.includes(run.status)
}

/** Why a group story cannot be run now, or `undefined` when it can. */
export function groupStoryRunBlockedReason(view: GroupStoryView): string | undefined {
  if (isLiveGroupStoryRun(view.latestRun)) return 'It is running now.'
  if (view.problems.length > 0) return view.problems.join(' ')
  if (view.status === 'done') return 'Every part is done.'
  return undefined
}

/** A group story's Run button, or `undefined` while a run is going and its status shows instead. */
export function groupStoryRunButton(view: GroupStoryView): GroupStoryRunButton | undefined {
  if (isLiveGroupStoryRun(view.latestRun)) return undefined
  const blocked = groupStoryRunBlockedReason(view)
  return blocked === undefined
    ? { disabled: false, label: GROUP_STORY_ACTION_LABELS.run }
    : { disabled: true, label: blocked }
}

/** The form for a new group story — no parts, no links — or for changing one. */
export function groupStoryFormFor(
  members: readonly GroupStoryMemberProject[],
  view?: GroupStoryView,
): GroupStoryForm {
  const projects = [...members]
  for (const p of [...(view?.partViews ?? []), ...(view?.linkViews ?? [])]) {
    if (!projects.some((m) => m.id === p.projectId)) {
      projects.push({ id: p.projectId, title: p.projectTitle })
    }
  }
  const parts = view?.partViews ?? []
  const projectOf = new Map(parts.map((p) => [p.storyId, p.projectId]))
  const rows: GroupStoryFormRow[] = parts.map((p) => ({
    key: p.storyId,
    projectId: p.projectId,
    projectTitle: p.projectTitle,
    choice: 'existing',
    storyId: p.storyId,
    needs: p.needs.filter((n) => projectOf.has(n) && projectOf.get(n) !== p.projectId),
  }))
  const links: GroupStoryFormLink[] = (view?.linkViews ?? []).map((l) => ({
    key: `link-${l.storyId}`,
    projectId: l.projectId,
    projectTitle: l.projectTitle,
    storyId: l.storyId,
  }))
  return { title: view?.title ?? '', description: view?.description ?? '', projects, rows, links }
}

function nextKey(taken: readonly string[], prefix: string): string {
  let n = 1
  while (taken.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

function projectTitleIn(form: GroupStoryForm, projectId: string): string {
  return form.projects.find((p) => p.id === projectId)?.title ?? projectId
}

/** The form with a new part — a new story — after its project's other parts. */
export function groupStoryFormWithPart(form: GroupStoryForm, projectId: string): GroupStoryForm {
  const row: GroupStoryFormRow = {
    key: nextKey(
      form.rows.map((r) => r.key),
      'new-',
    ),
    projectId,
    projectTitle: projectTitleIn(form, projectId),
    choice: 'new',
    needs: [],
  }
  return { ...form, rows: [...form.rows, row] }
}

/** The form without a part, and without every need on it. */
export function groupStoryFormWithoutPart(form: GroupStoryForm, key: string): GroupStoryForm {
  return {
    ...form,
    rows: form.rows
      .filter((r) => r.key !== key)
      .map((r) => ({ ...r, needs: r.needs.filter((n) => n !== key) })),
  }
}

function neighbourOf(
  form: GroupStoryForm,
  key: string,
  direction: 'up' | 'down',
): number | undefined {
  const at = form.rows.findIndex((r) => r.key === key)
  if (at < 0) return undefined
  const projectId = form.rows[at]!.projectId
  const same = form.rows.flatMap((r, i) => (r.projectId === projectId ? [i] : []))
  const place = same.indexOf(at)
  return same[direction === 'up' ? place - 1 : place + 1]
}

/** Which ways a part can move among its project's parts. */
export function groupStoryFormPartMoves(
  form: GroupStoryForm,
  key: string,
): GroupStoryFormPartMoves {
  return {
    up: neighbourOf(form, key, 'up') !== undefined,
    down: neighbourOf(form, key, 'down') !== undefined,
  }
}

/** The form with a part moved one place up or down among its project's parts; the same form when it cannot move. */
export function groupStoryFormMovedPart(
  form: GroupStoryForm,
  key: string,
  direction: 'up' | 'down',
): GroupStoryForm {
  const other = neighbourOf(form, key, direction)
  if (other === undefined) return form
  const at = form.rows.findIndex((r) => r.key === key)
  const rows = [...form.rows]
  ;[rows[at], rows[other]] = [rows[other]!, rows[at]!]
  return { ...form, rows }
}

/** The form with a new linked story of a project, its story not picked yet. */
export function groupStoryFormWithLink(form: GroupStoryForm, projectId: string): GroupStoryForm {
  const link: GroupStoryFormLink = {
    key: nextKey(
      form.links.map((l) => l.key),
      'link-new-',
    ),
    projectId,
    projectTitle: projectTitleIn(form, projectId),
  }
  return { ...form, links: [...form.links, link] }
}

/** The form with a linked story picked, or unpicked. */
export function groupStoryFormWithLinkStory(
  form: GroupStoryForm,
  key: string,
  storyId: string | undefined,
): GroupStoryForm {
  return {
    ...form,
    links: form.links.map((l) => {
      if (l.key !== key) return l
      const { storyId: _old, ...rest } = l
      return storyId ? { ...rest, storyId } : rest
    }),
  }
}

/** The form without a linked story. */
export function groupStoryFormWithoutLink(form: GroupStoryForm, key: string): GroupStoryForm {
  return { ...form, links: form.links.filter((l) => l.key !== key) }
}

/** What each part needs on the form: the part of its project before it, and the parts it names. */
function formNeeds(form: GroupStoryForm): Map<string, string[]> {
  const keys = new Set(form.rows.map((r) => r.key))
  return new Map(
    form.rows.map((r, i) => {
      const before = form.rows
        .slice(0, i)
        .filter((o) => o.projectId === r.projectId)
        .at(-1)
      const named = r.needs.filter((n) => keys.has(n))
      return [r.key, before ? [before.key, ...named] : named]
    }),
  )
}

/** The name a new part goes by in what parts need: its title, else the group story's. */
function newPartName(form: GroupStoryForm, row: GroupStoryFormRow): string {
  return row.newStoryTitle?.trim() || form.title.trim()
}

/** What still stops the form from being saved, in the words it shows. */
export function groupStoryFormProblems(form: GroupStoryForm): string[] {
  if (!form.title.trim()) return ['Give it a title.']
  if (form.rows.length === 0 && form.links.length === 0) return ['Add a part or a linked story.']
  const unpicked = form.rows.find((r) => r.choice === 'existing' && !r.storyId)
  if (unpicked) return [`Pick ${unpicked.projectTitle}’s story.`]
  const unlinked = form.links.find((l) => !l.storyId)
  if (unlinked) return [`Pick the ${unlinked.projectTitle} story to link.`]
  const stories = [
    ...form.rows.flatMap((r) => (r.choice === 'existing' && r.storyId ? [r.storyId] : [])),
    ...form.links.flatMap((l) => (l.storyId ? [l.storyId] : [])),
  ]
  if (new Set(stories).size < stories.length) {
    return ['A story is picked twice: each part and link is a story of its own.']
  }
  const named = new Set(form.rows.flatMap((r) => r.needs))
  const newNames = form.rows
    .filter((r) => r.choice === 'new')
    .map((r) => ({ key: r.key, name: newPartName(form, r) }))
  if (
    newNames.some((n) => named.has(n.key) && newNames.filter((o) => o.name === n.name).length > 1)
  ) {
    return ['Give each new story another part needs its own title.']
  }
  const needs = formNeeds(form)
  const placed = new Set<string>()
  let left = form.rows.map((r) => r.key)
  while (left.length > 0) {
    const step = left.filter((key) => (needs.get(key) ?? []).every((n) => placed.has(n)))
    if (step.length === 0) break
    for (const key of step) placed.add(key)
    left = left.filter((key) => !placed.has(key))
  }
  if (left.length === 0) return []
  const titles = left.map((key) => form.rows.find((r) => r.key === key)!.projectTitle)
  return [
    titles.length === 2
      ? `${titles[0]} and ${titles[1]} need each other, so neither could start.`
      : `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)} wait on one another, so none could start.`,
  ]
}

/**
 * What saving the form sends: its parts in order, its links, and what each part
 * needs among the other projects' parts — an existing story by its id, a new one
 * by its title. A new part that needs nothing is left out: it has no blockers.
 */
export function groupStoryFormRequest(form: GroupStoryForm): GroupStoryWriteBody {
  const keys = new Set(form.rows.map((r) => r.key))
  const nameOf = (row: GroupStoryFormRow) =>
    row.choice === 'existing' ? row.storyId! : newPartName(form, row)
  const needs = form.rows.flatMap((r) => {
    const named = r.needs.filter((n) => keys.has(n))
    if (r.choice === 'new' && named.length === 0) return []
    return [[nameOf(r), named.map((n) => nameOf(form.rows.find((o) => o.key === n)!))] as const]
  })
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    parts: form.rows.map((r) => {
      if (r.choice === 'existing') return { projectId: r.projectId, storyId: r.storyId }
      const title = r.newStoryTitle?.trim()
      return title ? { projectId: r.projectId, newStoryTitle: title } : { projectId: r.projectId }
    }),
    links: form.links.flatMap((l) =>
      l.storyId ? [{ projectId: l.projectId, storyId: l.storyId }] : [],
    ),
    needs: Object.fromEntries(needs),
  }
}

/**
 * The parts a part may need: the other projects' parts, each by its project
 * and — when its project has several — its story's title.
 */
export function groupStoryNeedOptions(
  form: GroupStoryForm,
  key: string,
  storiesByProject: Readonly<Record<string, readonly { id: string; title: string }[]>> = {},
): GroupStoryMemberProject[] {
  const own = form.rows.find((r) => r.key === key)
  const label = (r: GroupStoryFormRow) => {
    const several = form.rows.filter((o) => o.projectId === r.projectId).length > 1
    if (!several) return r.projectTitle
    const story =
      r.choice === 'existing'
        ? (storiesByProject[r.projectId]?.find((s) => s.id === r.storyId)?.title ?? r.storyId)
        : r.newStoryTitle?.trim() || 'New story'
    return `${r.projectTitle} · ${story}`
  }
  return form.rows
    .filter((r) => r.key !== key && r.projectId !== own?.projectId)
    .map((r) => ({ id: r.key, title: label(r) }))
}

/** The group stories a listed story is a part of; none, always the same list, for a story that is no part. */
export function groupStoriesOfStory(
  byStory: GroupStoryMembershipsByStory,
  storyId: string,
): readonly GroupStoryMembership[] {
  return byStory[storyId] ?? NO_GROUP_STORIES
}

/** What a group story's latest run is doing: a sign-off counts as needing you. */
export function groupStoryRunState(view: GroupStoryView): GroupStoryRunState {
  const live = view.latestRun ? processGroupLiveState(view.latestRun) : undefined
  if (live === undefined) return 'not-running'
  return live === 'sign-off' ? 'needs-you' : live
}

/** The projects the group stories have parts in, each once, in the order they first show. */
export function groupStoryListProjects(
  views: readonly GroupStoryView[],
): GroupStoryMemberProject[] {
  const seen = new Map<string, string>()
  for (const view of views) {
    for (const part of view.partViews) {
      if (!seen.has(part.projectId)) seen.set(part.projectId, part.projectTitle)
    }
  }
  return [...seen].map(([id, title]) => ({ id, title }))
}

function storyStatus(view: GroupStoryView): StoryStatus {
  return view.status ?? 'pending'
}

function matchesGroupStoryQuery(view: GroupStoryView, position: number, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    String(position),
    view.title,
    view.description,
    ...view.partViews.flatMap((p) => [p.projectTitle, p.projectId, p.storyTitle ?? '']),
  ].some((text) => text.toLowerCase().includes(q))
}

/**
 * The group stories the Stories tab shows for its filter, in its order — the
 * way a project's stories list filters and sorts, a group story's position in
 * the group's order standing for a story's number.
 */
export function filterGroupStories(
  views: readonly GroupStoryView[],
  filter: GroupStoryListFilter,
): GroupStoryView[] {
  const position = new Map(views.map((v, i) => [v.id, i + 1]))
  const at = (v: GroupStoryView) => position.get(v.id) ?? 0
  const rank = (v: GroupStoryView) => STATUS_ORDER.indexOf(storyStatus(v))
  const shown = views.filter((v) => {
    const status = storyStatus(v)
    const byStatus =
      filter.status === 'all' ||
      (filter.status === 'not-done' ? status !== 'done' : status === filter.status)
    return (
      byStatus &&
      (filter.projectId === undefined ||
        v.partViews.some((p) => p.projectId === filter.projectId)) &&
      (filter.run === 'all' || groupStoryRunState(v) === filter.run) &&
      matchesGroupStoryQuery(v, at(v), filter.query)
    )
  })
  switch (filter.sortBy) {
    case 'order_desc':
      return shown.sort((a, b) => at(b) - at(a))
    case 'status_asc':
      return shown.sort((a, b) => rank(a) - rank(b) || at(a) - at(b))
    case 'status_desc':
      return shown.sort((a, b) => rank(b) - rank(a) || at(b) - at(a))
    case 'order_asc':
      return shown.sort((a, b) => at(a) - at(b))
  }
}

/** How many group stories the Stories tab shows, of how many. */
export function groupStoryListCount(shown: number, total: number): string {
  return `Showing ${shown} of ${total} group ${total === 1 ? 'story' : 'stories'}`
}
