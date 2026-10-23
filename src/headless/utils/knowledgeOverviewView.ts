import { KNOWLEDGE_SOURCES_PER_ENTRY, KNOWLEDGE_TEXT } from './knowledgeOverviewConstants'
import type {
  KnowledgeClaimRow,
  KnowledgeMapStatus,
  KnowledgeModelMark,
  KnowledgeNote,
  KnowledgePlannedRow,
  KnowledgeSectionId,
  KnowledgeSectionView,
  KnowledgeSource,
  KnowledgeTextPart,
  KnowledgeView,
  KnowledgeViewFormat,
  KnowledgeViewInput,
  KnowledgeWorkStory,
  ProjectOverviewData,
} from './knowledgeOverviewTypes'
import { formatDurationMs, formatFriendlyTimestamp } from './time'

type Claim = ProjectOverviewData['purpose']
type Citations = NonNullable<ProjectOverviewData['citations']>
type ModelWritten = NonNullable<ProjectOverviewData['purposeModelWritten']>
type Entry = ProjectOverviewData['capabilities'][number]

const DEFAULT_FORMAT: KnowledgeViewFormat = {
  when: formatFriendlyTimestamp,
  duration: formatDurationMs,
}

const PATH_LIKE = /^[^\s]+(\/[^\s]*|\.[A-Za-z0-9]+)$/

function modelMark(
  written: ModelWritten | undefined,
  format: KnowledgeViewFormat,
): KnowledgeModelMark | undefined {
  if (!written) return undefined
  const when = format.when(written.refreshedAt)
  return {
    refreshedAt: written.refreshedAt,
    when,
    label: KNOWLEDGE_TEXT.model(when),
    stale: written.stale,
    title: KNOWLEDGE_TEXT.modelTitle(when, written.stale),
  }
}

function fileSource(path: string, line: number | undefined, name?: string): KnowledgeSource {
  const file = path.split('/').filter(Boolean).pop() ?? path
  return {
    label: line !== undefined ? `${file}:${line}` : file,
    ...(name !== undefined && name !== file ? { name } : {}),
    path,
    ...(line !== undefined ? { line } : {}),
  }
}

function sourcesOf(claim: Claim, citations: Citations): KnowledgeSource[] {
  const seen = new Set<string>()
  const sources: KnowledgeSource[] = []
  for (const id of claim.citations) {
    const cited = citations[id]
    if (!cited?.path) continue
    const key = `${cited.path}:${cited.line ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push(fileSource(cited.path, cited.line, cited.name))
    if (sources.length === KNOWLEDGE_SOURCES_PER_ENTRY) break
  }
  return sources
}

function claimRow(
  key: string,
  claim: Claim,
  citations: Citations,
  format: KnowledgeViewFormat,
  written: ModelWritten | undefined,
  name?: string,
): KnowledgeClaimRow {
  const model = modelMark(written, format)
  return {
    key,
    ...(name !== undefined ? { name } : {}),
    text: claim.text,
    quiet: claim.label === 'abstain',
    ...(model ? { model } : {}),
    sources: sourcesOf(claim, citations),
  }
}

function entryRows(
  entries: Entry[],
  citations: Citations,
  format: KnowledgeViewFormat,
): KnowledgeClaimRow[] {
  return entries.map((e) => claimRow(e.id, e.claim, citations, format, e.modelWritten, e.name))
}

function workStories(work: NonNullable<ProjectOverviewData['recordedWork']>): KnowledgeWorkStory[] {
  return work.stories.map((story) => {
    const hidden = story.openFeatures - story.features.length
    return {
      key: story.id,
      dependency: story.id,
      title: story.name,
      status: story.status,
      features: story.features.map((f) => ({
        key: `${story.id}.${f.id}`,
        dependency: `${story.id}.${f.id}`,
        title: f.name,
        status: f.status,
      })),
      ...(hidden > 0 ? { more: KNOWLEDGE_TEXT.more.features(hidden) } : {}),
    }
  })
}

function workNote(work: ProjectOverviewData['recordedWork']): KnowledgeNote {
  if (!work) return { text: KNOWLEDGE_TEXT.recordedUnknown, quiet: true }
  if (work.totalStories === 0) return { text: KNOWLEDGE_TEXT.noStories, quiet: true }
  return { text: KNOWLEDGE_TEXT.openOf(work.openStories, work.totalStories), quiet: false }
}

function plannedSource(
  work: ProjectOverviewData['documentWork'][number],
  citations: Citations,
): KnowledgePlannedRow['source'] {
  const { reference, line } = work.source
  const path = reference
    ? PATH_LIKE.test(reference)
      ? reference
      : undefined
    : citations[work.source.attachmentId]?.path
  if (path) return fileSource(path, line)
  return reference ? { label: reference } : undefined
}

function plannedRows(overview: ProjectOverviewData, citations: Citations): KnowledgePlannedRow[] {
  const depth = new Map<string, number>()
  return overview.documentWork.map((work) => {
    const level = work.parentId ? (depth.get(work.parentId) ?? 0) + 1 : 0
    depth.set(work.id, level)
    const source = plannedSource(work, citations)
    return { key: work.id, text: work.claim.text, depth: level, ...(source ? { source } : {}) }
  })
}

function overviewSections(
  overview: ProjectOverviewData,
  format: KnowledgeViewFormat,
): KnowledgeSectionView[] {
  const citations = overview.citations ?? {}
  const omitted = overview.omitted
  const base = (id: KnowledgeSectionId, more?: string, note?: KnowledgeNote) => {
    const freshness = overview.sections?.[id]
    const refreshedAt = freshness?.refreshedAt ?? overview.provenance.refreshedAt
    return {
      id,
      title: KNOWLEDGE_TEXT.sections[id],
      refreshed: KNOWLEDGE_TEXT.refreshed(format.when(refreshedAt)),
      refreshedAt,
      stale: freshness?.stale ?? false,
      ...(note ? { note } : {}),
      ...(more ? { more } : {}),
    }
  }
  const noneFound = { text: KNOWLEDGE_TEXT.noEntries, quiet: true }
  const work = overview.recordedWork
  const hiddenStories = work ? work.openStories - work.stories.length : 0
  return [
    {
      ...base('purpose'),
      kind: 'claims',
      rows: [
        claimRow('purpose', overview.purpose, citations, format, overview.purposeModelWritten),
      ],
    },
    {
      ...base(
        'capabilities',
        omitted?.capabilities ? KNOWLEDGE_TEXT.more.capabilities(omitted.capabilities) : undefined,
        overview.capabilities.length ? undefined : noneFound,
      ),
      kind: 'claims',
      rows: entryRows(overview.capabilities, citations, format),
    },
    {
      ...base(
        'modules',
        omitted?.modules ? KNOWLEDGE_TEXT.more.modules(omitted.modules) : undefined,
        overview.modules.length ? undefined : noneFound,
      ),
      kind: 'claims',
      rows: entryRows(overview.modules, citations, format),
    },
    {
      ...base(
        'recordedWork',
        hiddenStories > 0 ? KNOWLEDGE_TEXT.more.stories(hiddenStories) : undefined,
        workNote(work),
      ),
      kind: 'work',
      stories: work ? workStories(work) : [],
    },
    {
      ...base(
        'documentWork',
        omitted?.documentWork ? KNOWLEDGE_TEXT.more.documentWork(omitted.documentWork) : undefined,
        { text: overview.documentWorkStatus.text, quiet: true },
      ),
      kind: 'planned',
      items: plannedRows(overview, citations),
    },
  ]
}

function buildingBody(map: KnowledgeMapStatus, format: KnowledgeViewFormat): string {
  const text = KNOWLEDGE_TEXT.empty.building
  if (map.percent === undefined) {
    return text.body(text.started(format.duration(map.elapsedMs ?? 0)))
  }
  const left = map.expectedMs !== undefined ? map.expectedMs - (map.elapsedMs ?? 0) : undefined
  const parts = [
    text.percent(map.percent),
    ...(left && left > 0 ? [text.left(format.duration(left))] : []),
  ]
  return text.body(parts.join(' · '))
}

function emptyView(
  map: KnowledgeMapStatus | undefined,
  hasCheckout: boolean,
  format: KnowledgeViewFormat,
): KnowledgeView {
  const text = KNOWLEDGE_TEXT.empty
  if (!hasCheckout) return { kind: 'empty', reason: 'no-checkout', ...text['no-checkout'] }
  if (map?.state === 'queued') {
    return {
      kind: 'empty',
      reason: 'queued',
      title: text.queued.title,
      body: text.queued.body(Math.max(0, (map.queuePosition ?? 1) - 1)),
    }
  }
  if (map?.state === 'building') {
    return {
      kind: 'empty',
      reason: 'building',
      title: text.building.title,
      body: buildingBody(map, format),
      ...(map.percent !== undefined ? { percent: map.percent } : {}),
    }
  }
  if (map?.state === 'failed') {
    return {
      kind: 'empty',
      reason: 'failed',
      title: text.failed.title,
      body: text.failed.body(map.lastError),
    }
  }
  return { kind: 'empty', reason: 'none', ...text.none }
}

/**
 * Everything the project's Knowledge tab draws from what its route answered: the overview's parts in order — each
 * with its refresh time and staleness, model-written entries marked, what the overview could not say kept quiet —
 * or why there is no overview to show. Pure, the same on every client; times are written with `format`.
 */
export function knowledgeView(
  input: KnowledgeViewInput,
  format: KnowledgeViewFormat = DEFAULT_FORMAT,
): KnowledgeView {
  const { data } = input
  if (data?.overview) {
    return {
      kind: 'overview',
      sections: overviewSections(data.overview, format),
      ...(data.map?.state === 'building' ? { updating: KNOWLEDGE_TEXT.updating } : {}),
    }
  }
  if (data) return emptyView(data.map, data.hasCheckout, format)
  if (input.error) {
    return {
      kind: 'error',
      title: KNOWLEDGE_TEXT.error,
      message: input.error,
      retry: KNOWLEDGE_TEXT.retry,
    }
  }
  if (!input.loaded) return { kind: 'loading', title: KNOWLEDGE_TEXT.loading }
  return {
    kind: 'error',
    title: KNOWLEDGE_TEXT.error,
    message: KNOWLEDGE_TEXT.errorFallback,
    retry: KNOWLEDGE_TEXT.retry,
  }
}

const CODE_SPAN = /`([^`]+)`/g

/** An entry's text as plain runs and the code spans written in backticks, for drawing code as code. */
export function knowledgeTextParts(text: string): KnowledgeTextPart[] {
  const parts: KnowledgeTextPart[] = []
  let at = 0
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > at) parts.push({ text: text.slice(at, match.index), code: false })
    parts.push({ text: match[1]!, code: true })
    at = match.index + match[0].length
  }
  if (at < text.length) parts.push({ text: text.slice(at), code: false })
  return parts
}
