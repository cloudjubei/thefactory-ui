// Pure mappers behind a question's picker: the host's real branches, files,
// stories, … as rows, the agent's own options marked among them, and the
// filter the person types.

import { QUESTION_BRANCH_DETAIL } from './agentQuestionConstants'
import type {
  AgentQuestionOption,
  PickerBranch,
  PickerChat,
  PickerProcess,
  PickerProject,
  PickerStory,
  QuestionPickerItem,
} from './agentQuestionTypes'

function branchDetail(branch: PickerBranch): string | undefined {
  if (branch.current) return QUESTION_BRANCH_DETAIL.current
  if (branch.isDefault) return QUESTION_BRANCH_DETAIL.default
  if (branch.isLocal === false) return QUESTION_BRANCH_DETAIL.remoteOnly
  return undefined
}

/** The project's branches as rows, each answered with its name. Pure. */
export function branchPickerItems(branches: readonly PickerBranch[]): QuestionPickerItem[] {
  const seen = new Set<string>()
  const items: QuestionPickerItem[] = []
  for (const branch of branches) {
    const name = branch.name.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const detail = branchDetail(branch)
    items.push({
      id: name,
      label: name,
      answer: name,
      ...(detail ? { detail } : {}),
      ...(branch.current ? { tag: 'current' } : {}),
    })
  }
  return items
}

/** The project's files as rows — name first, folder under it — each answered as `@path`. Pure. */
export function filePickerItems(paths: readonly string[]): QuestionPickerItem[] {
  return paths.map((path) => {
    const cut = path.lastIndexOf('/')
    const label = cut >= 0 ? path.slice(cut + 1) : path
    const folder = cut > 0 ? path.slice(0, cut) : ''
    return { id: path, label, ...(folder ? { detail: folder } : {}), answer: `@${path}` }
  })
}

/** The project's stories as rows, each answered as its `#story` reference. Pure. */
export function storyPickerItems(stories: readonly PickerStory[]): QuestionPickerItem[] {
  return stories.map((story) => ({
    id: story.id,
    label: story.title?.trim() || story.id,
    ...(story.index !== undefined ? { detail: `#${story.index}` } : {}),
    ...(story.status ? { tag: story.status } : {}),
    answer: `#${story.id}`,
  }))
}

/** Every story's features as rows, each answered as its `#story.feature` reference. Pure. */
export function featurePickerItems(stories: readonly PickerStory[]): QuestionPickerItem[] {
  return stories.flatMap((story) =>
    (story.features ?? []).map((feature) => {
      const number =
        story.index !== undefined && feature.index !== undefined
          ? `#${story.index}.${feature.index}`
          : undefined
      const storyTitle = story.title?.trim() || story.id
      return {
        id: `${story.id}.${feature.id}`,
        label: feature.title?.trim() || feature.id,
        detail: number ? `${number} · ${storyTitle}` : storyTitle,
        ...(feature.status ? { tag: feature.status } : {}),
        answer: `#${story.id}.${feature.id}`,
      }
    }),
  )
}

/** Projects as rows, each answered with its title and id. Pure. */
export function projectPickerItems(projects: readonly PickerProject[]): QuestionPickerItem[] {
  return projects.map((p) => ({ id: p.id, label: p.title, answer: `${p.title} (project ${p.id})` }))
}

/** Chats as rows, each answered with its title and key. Pure. */
export function chatPickerItems(chats: readonly PickerChat[]): QuestionPickerItem[] {
  return chats.map((c) => ({
    id: c.key,
    label: c.title,
    ...(c.detail ? { detail: c.detail } : {}),
    answer: `${c.title} (chat ${c.key})`,
  }))
}

/** Processes as rows, each answered with its name and id. Pure. */
export function processPickerItems(processes: readonly PickerProcess[]): QuestionPickerItem[] {
  return processes.map((p) => ({
    id: p.id,
    label: p.name,
    ...(p.description ? { detail: p.description } : {}),
    answer: `${p.name} (process ${p.id})`,
  }))
}

function plain(text: string): string {
  return text.trim().replace(/^[@#]/, '').toLowerCase()
}

function namedBy(item: QuestionPickerItem, option: AgentQuestionOption): boolean {
  const wanted = plain(option.label)
  return [item.id, item.label, item.answer].some((key) => plain(key) === wanted)
}

/**
 * The rows with the agent's options found among them: its own pick first and
 * marked, then the others it named in its order, then the rest as they were. Pure.
 */
export function withAgentPicks(
  items: readonly QuestionPickerItem[],
  options: readonly AgentQuestionOption[] | undefined,
): QuestionPickerItem[] {
  const ordered = [...(options ?? [])].sort(
    (a, b) => Number(b.recommended === true) - Number(a.recommended === true),
  )
  const picked: QuestionPickerItem[] = []
  for (const option of ordered) {
    const found = items.find((i) => namedBy(i, option) && !picked.some((p) => p.id === i.id))
    if (found) picked.push(option.recommended ? { ...found, recommended: true } : found)
  }
  return [...picked, ...items.filter((i) => !picked.some((p) => p.id === i.id))]
}

/** The agent's options no listed item stands for — still offered on their own. Pure. */
export function unmatchedOptions(
  items: readonly QuestionPickerItem[],
  options: readonly AgentQuestionOption[] | undefined,
): AgentQuestionOption[] {
  return (options ?? []).filter((option) => !items.some((i) => namedBy(i, option)))
}

/**
 * The rows the filter keeps, at most `limit` — the selected one always kept, so
 * the choice never vanishes from under the button that sends it. Pure.
 */
export function filterPickerItems(
  items: readonly QuestionPickerItem[],
  query: string,
  limit: number,
  selectedId?: string,
): QuestionPickerItem[] {
  const needle = query.trim().toLowerCase()
  const matching = needle
    ? items.filter((i) =>
        [i.label, i.detail ?? '', i.answer].some((text) => text.toLowerCase().includes(needle)),
      )
    : [...items]
  const shown = matching.slice(0, limit)
  const selected = matching.find((i) => i.id === selectedId)
  return selected && !shown.includes(selected) ? [...shown, selected] : shown
}
