import type {
  GroupStoryForm,
  GroupStoryFormRow,
  GroupStoryMemberProject,
  GroupStoryPartView,
  GroupStoryRunSummary,
  GroupStoryStepColumn,
  GroupStoryView,
  GroupStoryWriteBody,
} from './groupStoryTypes'

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

/** The projects of the parts a part needs, by title. */
export function groupStoryNeedTitles(part: GroupStoryPartView, view: GroupStoryView): string[] {
  return part.needs.map((id) => view.partViews.find((p) => p.projectId === id)?.projectTitle ?? id)
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

/** The form for a new group story — every member project taking no part — or for changing one. */
export function groupStoryFormFor(
  members: readonly GroupStoryMemberProject[],
  view?: GroupStoryView,
): GroupStoryForm {
  const partOf = (projectId: string) => view?.partViews.find((p) => p.projectId === projectId)
  const row = (projectId: string, projectTitle: string): GroupStoryFormRow => {
    const part = partOf(projectId)
    return part
      ? {
          projectId,
          projectTitle,
          choice: 'existing',
          storyId: part.storyId,
          needs: [...part.needs],
        }
      : { projectId, projectTitle, choice: 'none', needs: [] }
  }
  const rows = members.map((m) => row(m.id, m.title))
  for (const part of view?.partViews ?? []) {
    if (!members.some((m) => m.id === part.projectId)) {
      rows.push(row(part.projectId, part.projectTitle))
    }
  }
  return { title: view?.title ?? '', description: view?.description ?? '', rows }
}

function takingPart(form: GroupStoryForm): GroupStoryFormRow[] {
  return form.rows.filter((r) => r.choice !== 'none')
}

/** What still stops the form from being saved, in the words it shows. */
export function groupStoryFormProblems(form: GroupStoryForm): string[] {
  if (!form.title.trim()) return ['Give it a title.']
  const rows = takingPart(form)
  if (rows.length === 0) return ['Pick at least one project.']
  const unpicked = rows.find((r) => r.choice === 'existing' && !r.storyId)
  if (unpicked) return [`Pick ${unpicked.projectTitle}’s story.`]
  const ids = new Set(rows.map((r) => r.projectId))
  const needs = new Map(rows.map((r) => [r.projectId, r.needs.filter((n) => ids.has(n))]))
  const placed = new Set<string>()
  let left = rows.map((r) => r.projectId)
  while (left.length > 0) {
    const step = left.filter((id) => (needs.get(id) ?? []).every((n) => placed.has(n)))
    if (step.length === 0) break
    for (const id of step) placed.add(id)
    left = left.filter((id) => !placed.has(id))
  }
  if (left.length === 0) return []
  const titles = left.map((id) => rows.find((r) => r.projectId === id)!.projectTitle)
  return [
    titles.length === 2
      ? `${titles[0]} and ${titles[1]} need each other, so neither could start.`
      : `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)} wait on one another, so none could start.`,
  ]
}

/** What saving the form sends: the projects taking part, and what each needs among them. */
export function groupStoryFormRequest(form: GroupStoryForm): GroupStoryWriteBody {
  const rows = takingPart(form)
  const ids = new Set(rows.map((r) => r.projectId))
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    parts: rows.map((r) => {
      if (r.choice === 'existing') return { projectId: r.projectId, storyId: r.storyId }
      const title = r.newStoryTitle?.trim()
      return title ? { projectId: r.projectId, newStoryTitle: title } : { projectId: r.projectId }
    }),
    needs: Object.fromEntries(rows.map((r) => [r.projectId, r.needs.filter((n) => ids.has(n))])),
  }
}

/** The projects a row may need: the other projects taking part. */
export function groupStoryNeedOptions(
  form: GroupStoryForm,
  projectId: string,
): GroupStoryMemberProject[] {
  return takingPart(form)
    .filter((r) => r.projectId !== projectId)
    .map((r) => ({ id: r.projectId, title: r.projectTitle }))
}
