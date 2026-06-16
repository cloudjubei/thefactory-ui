import { type ReactNode } from 'react'
import Code from '../../Code'
import type { ToolCall, ToolResultType } from './../ToolCall'
import {
  InlineOldNew,
  NewContentOnly,
  PreLimited,
  ReorderList,
  Row,
  SectionTitle,
} from './components'
import { PatchPreview, SmallBadge } from './FieldDiff'
import { WriteMultiToolsPreview } from './WriteMultiToolsPreview'
import { WriteToolsPreview, type ToolPreview } from './WriteToolsPreview'
import { extract, safePreviewString, tryString } from '../../../../headless/utils/toolPreview'

export type StoryShape = {
  id: string
  title?: string
  description?: string
  status?: string
  features?: FeatureShape[]
}
export type FeatureShape = {
  id: string
  title?: string
  description?: string
  status?: string
}

export type ToolPreviewHooks = {
  /** Lookup a story by id — used by `updateStory` / `addStory` previews. */
  getStory?: (id: string) => StoryShape | undefined
  /** Lookup a feature by (storyId, featureId) — used by `updateFeature`. */
  getFeature?: (storyId: string, featureId: string) => FeatureShape | undefined
  /** Render the rich `StoryCard` for a completed `addStory` / `updateStory`.
   * Host owns the styling — the registry just hands off the story object. */
  renderStoryCard?: (story: StoryShape) => ReactNode
  /** Render the rich `FeatureCard` for a completed `addFeature` /
   * `updateFeature`. */
  renderFeatureCard?: (story: StoryShape, feature: FeatureShape) => ReactNode
  /** Render a story-and-feature callout (used for `finishFeature` /
   * `blockFeature`). Host wires its own component. */
  renderStoryAndFeatureCallout?: (args: { storyId?: string; featureId?: string }) => ReactNode
  /** Render a dependency bullet for `listStories` / inline `#` refs.
   * Receives the story id. */
  renderStoryBullet?: (storyId: string) => ReactNode
  /** Pre-applied diff preview for `require_confirmation` write tools.
   * Host typically caches these per toolCallId (see desktop's
   * `toolPreviewById` map). */
  getToolPreview?: (toolCallId: string) => ToolPreview | undefined
}

export type RenderToolPreviewArgs = {
  toolCall: ToolCall
  result?: unknown
  resultType?: ToolResultType
  sideBySide?: boolean
  /** Host-supplied hooks for story/feature/preview rendering. Falls back
   * gracefully when omitted. */
  hooks?: ToolPreviewHooks
}

const STORY_FIELDS = [
  'title',
  'description',
  'status',
  'blockers',
  'rejection',
  'completedAt',
] as const
const FEATURE_FIELDS = [
  'title',
  'description',
  'status',
  'context',
  'plan',
  'acceptance',
  'blockers',
  'rejection',
  'completedAt',
  'files',
] as const

function changedKeys(patch: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(patch).filter((key) => allowed.includes(key))
}

/**
 * The shared tool-call hover-preview dispatcher. Mirrors
 * `overseer-local`'s `ToolCallHoverCard` body 1:1, with host-specific
 * pieces (story/feature cards, story bullets) injected via `hooks` so
 * both web and desktop render identical previews against their own data.
 *
 * Consumers wire this as `<ChatBody renderToolResult={({toolCall, result,
 * resultType}) => renderToolPreview({toolCall, result, resultType,
 * hooks})}>`. Tool-call hover cards then show the rich body.
 */
/**
 * Tool names that {@link renderToolPreview} renders with a dedicated drawer
 * (everything else falls through to the raw-JSON fallback). Kept in sync with
 * the `name === '…'` branches below — callers (e.g. the CLI run transcript) use
 * {@link hasToolPreview} to decide whether to delegate here or render their own
 * generic drawer instead of the JSON fallback.
 */
export const RECOGNIZED_TOOL_PREVIEW_NAMES: ReadonlySet<string> = new Set([
  'writeExactReplaces', 'writeFile', 'updateStory', 'updateFeature', 'addStory', 'addFeature',
  'getStory', 'proposePr', 'proposeCommitToRealRepo',
  'readPaths', 'readFile', 'readFileRanges', 'grepFiles', 'grepFile', 'renamePath', 'deletePath', 'listStories',
  'reorderFeature', 'finishFeature', 'blockFeature', 'searchFilesByExact', 'searchFilesByKeywords',
  'searchFiles', 'searchFilePaths', 'searchFilesAndRead', 'compileCheck', 'gitResetFiles', 'gitDiff',
  'gitFetch', 'gitPull', 'gitPush', 'gitCommit', 'gitCreateBranch', 'gitCheckoutBranch',
  'gitDeleteBranch', 'gitListBranches', 'gitCreateMergePlan', 'gitApplyMerge', 'gitListStashes',
  'gitAddStash', 'gitApplyStash', 'gitRemoveStash', 'webReadURLs', 'getAstOutline', 'getCode',
  'getInterface', 'listContents', 'webSearch', 'runTests', 'runAllTests', 'runTestsCoverage',
  'bash', 'runShellCommand', 'shell',
])

/** True when {@link renderToolPreview} has a dedicated drawer for `name`. */
export function hasToolPreview(name: string): boolean {
  return RECOGNIZED_TOOL_PREVIEW_NAMES.has(name)
}

export function renderToolPreview({
  toolCall,
  result,
  resultType,
  sideBySide = false,
  hooks,
}: RenderToolPreviewArgs): ReactNode {
  const name = String(toolCall?.name ?? 'tool')
  const args = (toolCall?.arguments as Record<string, unknown>) ?? {}
  const isInFlight =
    resultType === 'pending' || resultType === 'running' || resultType === 'require_confirmation'

  if (resultType === 'errored') {
    const msg = tryString(
      extract(result, ['message']) || extract(result, ['error']) || extract(result, ['result']),
    )
    return <NewContentOnly text={msg} label={msg ? 'Error' : 'Error (no details)'} />
  }

  // ---- write tools ----
  if (name === 'writeExactReplaces') {
    const toolCallId = String((toolCall as { toolCallId?: string }).toolCallId ?? '')
    const previewFromHost = hooks?.getToolPreview?.(toolCallId)
    return (
      <WriteMultiToolsPreview
        toolCall={toolCall}
        result={previewFromHost ?? result}
        resultType={resultType}
      />
    )
  }
  if (name === 'writeFile') {
    const toolCallId = String((toolCall as { toolCallId?: string }).toolCallId ?? '')
    const previewFromHost = hooks?.getToolPreview?.(toolCallId)
    return (
      <WriteToolsPreview
        toolCall={toolCall}
        result={previewFromHost ?? result}
        resultType={resultType}
        sideBySide={sideBySide}
      />
    )
  }

  // ---- story / feature update tools ----
  if (name === 'updateStory') {
    const storyId = tryString(extract(args, ['storyId']))
    const patch = (extract(args, ['patch']) || {}) as Record<string, unknown>
    const story = storyId ? hooks?.getStory?.(storyId) : undefined
    const resultObject =
      typeof (result as { patch?: string })?.patch === 'string'
        ? safeParseJson((result as { patch: string }).patch)
        : result
    const resultStory =
      resultObject && typeof resultObject === 'object' && !Array.isArray(resultObject)
        ? (resultObject as StoryShape)
        : undefined
    const nextStory = resultStory ?? (story ? ({ ...story, ...patch } as StoryShape) : undefined)
    const isComplete = !isInFlight
    const completedCard =
      isComplete && hooks?.renderStoryCard && nextStory
        ? hooks.renderStoryCard(nextStory)
        : undefined
    if (!story && !nextStory) {
      return <div className="text-[11px] text-(--text-secondary)">No story data</div>
    }
    return (
      <PatchPreview
        headerBadge="story"
        headerId={story?.id || nextStory?.id}
        patchKeys={changedKeys(patch, STORY_FIELDS)}
        before={story as Record<string, unknown> | undefined}
        after={nextStory as Record<string, unknown> | undefined}
        sideBySide={sideBySide}
        completedCard={completedCard}
      />
    )
  }
  if (name === 'updateFeature') {
    const storyId = tryString(extract(args, ['storyId']))
    const featureId = tryString(extract(args, ['featureId']))
    const patch = (extract(args, ['patch']) || {}) as Record<string, unknown>
    const story = storyId ? hooks?.getStory?.(storyId) : undefined
    const feature = storyId && featureId ? hooks?.getFeature?.(storyId, featureId) : undefined
    const resultStory =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as StoryShape)
        : undefined
    const targetId = feature?.id ?? featureId
    const resultFeature = resultStory?.features?.find((f) => f.id === targetId)
    const nextFeature =
      resultFeature ?? (feature ? ({ ...feature, ...patch } as FeatureShape) : undefined)
    const isComplete = !isInFlight
    const completedCard =
      isComplete && hooks?.renderFeatureCard && story && nextFeature
        ? hooks.renderFeatureCard(story, nextFeature)
        : undefined
    if (!feature && !nextFeature) {
      return <div className="text-[11px] text-(--text-secondary)">No feature data</div>
    }
    return (
      <PatchPreview
        headerBadge="feature"
        headerId={feature?.id || nextFeature?.id}
        headerSub={
          story?.id || resultStory?.id ? (
            <div className="text-[11px] text-(--text-secondary)">
              Story: <span className="font-mono">{story?.id || resultStory?.id}</span>
            </div>
          ) : undefined
        }
        patchKeys={changedKeys(patch, FEATURE_FIELDS)}
        before={feature as Record<string, unknown> | undefined}
        after={nextFeature as Record<string, unknown> | undefined}
        sideBySide={sideBySide}
        completedCard={completedCard}
      />
    )
  }
  if (name === 'addStory') {
    const storyInput = (extract(args, ['input']) || {}) as StoryShape
    const isComplete = !isInFlight && !!(result as { id?: string } | undefined)?.id
    const card =
      isComplete && hooks?.renderStoryCard && result
        ? hooks.renderStoryCard(result as StoryShape)
        : undefined
    if (card) return <>{card}</>
    return (
      <PatchPreview
        headerBadge="story · new"
        headerId={storyInput.id}
        patchKeys={Object.keys(storyInput).filter((k) =>
          (STORY_FIELDS as readonly string[]).includes(k),
        )}
        before={undefined}
        after={storyInput as unknown as Record<string, unknown>}
        sideBySide={sideBySide}
      />
    )
  }
  if (name === 'addFeature') {
    const storyId = tryString(extract(args, ['storyId']))
    const featureInput = (extract(args, ['featureInput']) || {}) as FeatureShape
    const story = storyId ? hooks?.getStory?.(storyId) : undefined
    const resultStory = result && typeof result === 'object' ? (result as StoryShape) : undefined
    const isComplete = !isInFlight && !!resultStory?.id
    const completedFeature = isComplete
      ? resultStory?.features?.[resultStory.features.length - 1]
      : undefined
    const card =
      isComplete && hooks?.renderFeatureCard && resultStory && completedFeature
        ? hooks.renderFeatureCard(resultStory, completedFeature)
        : undefined
    if (card) return <>{card}</>
    return (
      <PatchPreview
        headerBadge="feature · new"
        headerId={featureInput.id}
        headerSub={
          story?.id ? (
            <div className="text-[11px] text-(--text-secondary)">
              Story: <span className="font-mono">{story.id}</span>
            </div>
          ) : undefined
        }
        patchKeys={Object.keys(featureInput).filter((k) =>
          (FEATURE_FIELDS as readonly string[]).includes(k),
        )}
        before={undefined}
        after={featureInput as unknown as Record<string, unknown>}
        sideBySide={sideBySide}
      />
    )
  }

  if (name === 'getStory') {
    const storyId = tryString(extract(args, ['storyId'])) || '(unknown)'
    const title = tryString(extract(result, ['title']))
    const status = tryString(extract(result, ['status']))
    return (
      <Row className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-mono text-[11px]">{storyId}</span>
        {title ? <span className="text-[11px] text-(--text-primary)">{title}</span> : null}
        {status ? <SmallBadge>{status}</SmallBadge> : null}
      </Row>
    )
  }
  if (name === 'proposePr') {
    const title = tryString(extract(args, ['title'])) || '(untitled)'
    const branch = tryString(extract(args, ['branchName']))
    const baseRef = tryString(extract(args, ['baseRef']))
    const body = tryString(extract(args, ['body']))
    return (
      <div className="text-xs space-y-1">
        <SectionTitle>Proposed PR</SectionTitle>
        <div className="text-[12px] font-medium text-(--text-primary)">{title}</div>
        {branch ? (
          <Row className="font-mono text-[11px] text-(--text-secondary)">
            {branch}
            {baseRef ? ` ← ${baseRef}` : ''}
          </Row>
        ) : null}
        {body ? <PreLimited lines={body.split('\n')} maxLines={10} /> : null}
      </div>
    )
  }
  if (name === 'proposeCommitToRealRepo') {
    const message = tryString(extract(args, ['message'])) || '(no message)'
    const paths = Array.isArray(extract(args, ['paths'])) ? (extract(args, ['paths']) as string[]) : []
    const notes = tryString(extract(args, ['notes']))
    return (
      <div className="text-xs space-y-1">
        <SectionTitle>Proposed commit</SectionTitle>
        <div className="text-[12px] text-(--text-primary)">{message}</div>
        {paths.map((p, i) => (
          <Row key={p || i}>
            <span className="font-mono text-[11px]">{p}</span>
          </Row>
        ))}
        {notes ? <PreLimited lines={notes.split('\n')} maxLines={6} /> : null}
      </div>
    )
  }
  // ---- file / shell tools ----
  if (name === 'readFile') {
    const path = tryString(extract(args, ['path'])) || '(unknown)'
    const content = typeof result === 'string' ? result : safePreviewString(result).text
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5">
          <span className="font-mono text-[11px]">{path}</span>
        </Row>
        {resultType === 'success' && content ? (
          <PreLimited lines={content.split('\n')} maxLines={12} />
        ) : null}
      </div>
    )
  }
  if (name === 'grepFile') {
    const path = tryString(extract(args, ['path'])) || '(unknown)'
    const pattern = tryString(extract(args, ['pattern'])) || ''
    const matches = typeof result === 'string' ? result : safePreviewString(result).text
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          {pattern ? <span className="font-mono text-[11px]">/{pattern}/</span> : null}
          <span className="font-mono text-[11px] text-(--text-secondary)">{path}</span>
        </Row>
        {resultType === 'success' && matches ? (
          <PreLimited lines={matches.split('\n')} maxLines={12} />
        ) : null}
      </div>
    )
  }
  if (name === 'readPaths') {
    const files: string[] = Array.isArray(extract(args, ['paths']))
      ? (extract(args, ['paths']) as string[])
      : []
    const resultMap =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, string>)
        : {}
    if (files.length === 0) {
      return <div className="text-[11px] text-(--text-secondary)">No paths</div>
    }
    return (
      <div className="text-xs space-y-1">
        {files.map((file, idx) => {
          const content = typeof resultMap[file] === 'string' ? resultMap[file] : undefined
          const suffix =
            resultType === 'success' && typeof content === 'string'
              ? `: ${content.length} chars`
              : ''
          return (
            <Row key={file || idx} className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px]">{file || '(unknown)'}</span>
              {suffix ? (
                <span className="font-mono text-[11px] text-(--text-secondary)">{suffix}</span>
              ) : null}
            </Row>
          )
        })}
      </div>
    )
  }
  if (name === 'readFileRanges') {
    const queries = extract(args, ['queries']) as Array<Record<string, unknown>> | undefined
    const safe = Array.isArray(queries) ? queries : []
    const resultMap =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, string>)
        : {}
    return (
      <div className="text-xs space-y-1">
        {safe.length > 0 ? (
          safe.map((q, idx) => {
            const path = tryString(extract(q, ['path'])) || '(unknown)'
            const startLine = extract(q, ['startLine'])
            const endLine = extract(q, ['endLine'])
            const content = typeof resultMap[path] === 'string' ? resultMap[path] : undefined
            const suffix =
              resultType === 'success' && typeof content === 'string'
                ? `: ${content.length} chars`
                : ''
            return (
              <Row key={`${path}-${idx}`} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px]">
                  L{String(startLine ?? '?')}:L{String(endLine ?? '?')} {path}
                </span>
                {suffix ? (
                  <span className="font-mono text-[11px] text-(--text-secondary)">{suffix}</span>
                ) : null}
              </Row>
            )
          })
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No queries</div>
        )}
      </div>
    )
  }
  if (name === 'grepFiles') {
    const queries = extract(args, ['queries']) as Array<Record<string, unknown>> | undefined
    const safe = Array.isArray(queries) ? queries : []
    const resultMap =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown[]>)
        : {}
    return (
      <div className="text-xs space-y-2">
        {safe.length > 0 ? (
          safe.map((q, idx) => {
            const path = tryString(extract(q, ['path'])) || '(unknown)'
            const pattern = tryString(extract(q, ['pattern'])) || ''
            const matches = Array.isArray(resultMap[path]) ? resultMap[path] : undefined
            const suffix = resultType === 'success' && matches ? `: ${matches.length} matches` : ''
            return (
              <div key={`${path}-${idx}`} className="space-y-0.5">
                <Row>
                  <span className="font-mono text-[11px] break-words">
                    {pattern || '(no pattern)'}
                  </span>
                </Row>
                <Row className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[11px]">{path}</span>
                  {suffix ? (
                    <span className="font-mono text-[11px] text-(--text-secondary)">{suffix}</span>
                  ) : null}
                </Row>
              </div>
            )
          })
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No queries</div>
        )}
      </div>
    )
  }
  if (name === 'renamePath') {
    const srcPath = tryString(extract(args, ['src'])) || tryString(extract(result, ['src']))
    const dstPath = tryString(extract(args, ['dst'])) || tryString(extract(result, ['dst']))
    return <InlineOldNew oldVal={srcPath} newVal={dstPath} />
  }
  if (name === 'deletePath') {
    const delPath = tryString(extract(args, ['path']))
    return <InlineOldNew oldVal={delPath} newVal="(deleted)" />
  }

  // ---- listStories / reorderFeature / callouts ----
  if (name === 'listStories') {
    const stories = coerceStoriesList(result)
    if (stories.length === 0) {
      return <div className="text-[11px] text-(--text-secondary)">No stories</div>
    }
    if (hooks?.renderStoryBullet) {
      return (
        <div className="grid grid-cols-4 gap-2 items-start">
          {stories.map((story) => (
            <div key={story.id} className="min-w-0">
              {hooks.renderStoryBullet!(story.id)}
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="text-xs space-y-1">
        {stories.map((s) => (
          <Row key={s.id} className="flex items-center gap-1.5 flex-wrap">
            <SmallBadge>story</SmallBadge>
            <span className="font-mono text-[11px]">{s.id}</span>
            {s.title ? <span className="truncate">— {s.title}</span> : null}
          </Row>
        ))}
      </div>
    )
  }
  if (name === 'reorderFeature') {
    const feature = extract(result, ['feature']) || result
    const order =
      (extract(result, ['order']) ||
        extract(feature, ['order']) ||
        extract(feature, ['features'])) ??
      []
    const movedId = tryString(extract(args, ['featureId']) || extract(result, ['featureId']))
    if (Array.isArray(order)) return <ReorderList items={order} movedId={movedId} />
    return <div className="text-[11px] text-(--text-secondary)">No reorder data</div>
  }
  if (name === 'finishFeature' || name === 'blockFeature') {
    const storyId = tryString(extract(args, ['storyId']))
    const featureId = tryString(extract(args, ['featureId']))
    if (hooks?.renderStoryAndFeatureCallout) {
      return <div className="p-2">{hooks.renderStoryAndFeatureCallout({ storyId, featureId })}</div>
    }
    return (
      <div className="text-xs">
        <SectionTitle>{name === 'finishFeature' ? 'Finished' : 'Blocked'}</SectionTitle>
        <Row>
          story <span className="font-mono">{storyId}</span> / feature{' '}
          <span className="font-mono">{featureId}</span>
        </Row>
      </div>
    )
  }

  // ---- search variants ----
  if (name === 'searchFilesByExact' || name === 'searchFilesByKeywords') {
    // Args carry an array of needles / keywords.
    const rawQ = extract(args, ['needles']) ?? extract(args, ['keywords'])
    const qLines: string[] = Array.isArray(rawQ)
      ? rawQ.filter((l): l is string => typeof l === 'string')
      : typeof rawQ === 'string'
        ? [rawQ]
        : ['']
    const resultLines: string[] = Array.isArray(result)
      ? (result as unknown[]).filter((l): l is string => typeof l === 'string')
      : []
    return (
      <div className="text-xs space-y-1">
        <SectionTitle>Query:</SectionTitle>
        <PreLimited lines={qLines} maxLines={10} />
        {resultType === 'success' ? (
          resultLines.length > 0 ? (
            <div>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={resultLines}
                maxLines={10}
                renderTruncationMessage={(omitted) => <>+ {omitted} more</>}
              />
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No matches</div>
          )
        ) : null}
      </div>
    )
  }
  if (name === 'searchFiles' || name === 'searchFilePaths' || name === 'searchFilesAndRead') {
    // Args carry a single `query` string (multi-line ok).
    const query = tryString(extract(args, ['query']) ?? extract(result, ['query'])) ?? ''
    const qLines = query ? query.split(/\r?\n/) : ['']
    const resultLines: string[] = Array.isArray(result)
      ? (result as unknown[]).filter((l): l is string => typeof l === 'string')
      : []
    return (
      <div className="text-xs space-y-1">
        <SectionTitle>Query:</SectionTitle>
        <PreLimited lines={qLines} maxLines={2} />
        {resultType === 'success' ? (
          resultLines.length > 0 ? (
            <div>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={resultLines}
                maxLines={10}
                renderTruncationMessage={(omitted) => <>+ {omitted} more</>}
              />
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No matches</div>
          )
        ) : null}
      </div>
    )
  }

  // ---- compileCheck ----
  if (name === 'compileCheck') {
    const paths = (extract(args, ['paths']) ?? []) as Array<string | undefined>
    const safePaths = paths.filter((p): p is string => typeof p === 'string')
    const strict = extract(args, ['strict'])

    const failingPathsRaw =
      extract(result, ['failingPaths']) ??
      extract(result, ['failedPaths']) ??
      extract(result, ['errorsByFile']) ??
      extract(result, ['failuresByPath']) ??
      extract(result, ['files'])
    const failingPaths: string[] = Array.isArray(failingPathsRaw)
      ? (failingPathsRaw as unknown[]).filter((p): p is string => typeof p === 'string')
      : failingPathsRaw && typeof failingPathsRaw === 'object'
        ? Object.keys(failingPathsRaw as Record<string, unknown>)
        : []
    const shownPaths = resultType === 'success' ? failingPaths : safePaths

    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          <span className="text-(--text-secondary)">strict:</span>
          <span className="font-mono text-[11px]">{String(!!strict)}</span>
        </Row>

        {shownPaths.length > 0 ? (
          <div>
            <SectionTitle>{resultType === 'success' ? 'Failing paths' : 'Paths'}</SectionTitle>
            <PreLimited lines={shownPaths} maxLines={10} />
          </div>
        ) : resultType === 'success' ? (
          <div className="text-[11px] text-(--text-secondary)">No failing paths</div>
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No paths</div>
        )}
      </div>
    )
  }

  // ---- gitResetFiles ----
  if (name === 'gitResetFiles') {
    const paths = (extract(args, ['paths']) ?? []) as Array<string | undefined>
    const safePaths = paths.filter((p): p is string => typeof p === 'string')
    return (
      <div className="text-xs space-y-1">
        {safePaths.length > 0 ? (
          safePaths.map((file, idx) => (
            <Row key={`${file}-${idx}`}>
              <span className="font-mono text-[11px]">{file}</span>
            </Row>
          ))
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No paths</div>
        )}
      </div>
    )
  }

  // ---- gitDiff ----
  if (name === 'gitDiff') {
    const options = (extract(args, ['options']) ?? {}) as Record<string, unknown>
    const paths = (extract(options, ['paths']) ?? []) as Array<string | undefined>
    const safePaths = paths.filter((p): p is string => typeof p === 'string')
    const staged = extract(options, ['staged'])
    const includePatch = extract(options, ['includePatch'])
    const includeStructured = extract(options, ['includeStructured'])

    const filesRaw =
      extract(result, ['files']) ?? extract(result, ['diffs']) ?? extract(result, ['entries']) ?? []
    const files = Array.isArray(filesRaw) ? (filesRaw as Array<Record<string, unknown>>) : []

    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          <span className="text-(--text-secondary)">mode:</span>
          <span className="font-mono text-[11px]">{staged ? 'staged' : 'unstaged'}</span>
          {includePatch ? (
            <span className="text-[10px] font-medium text-(--text-secondary)">patch</span>
          ) : null}
          {includeStructured ? (
            <span className="text-[10px] font-medium text-(--text-secondary)">structured</span>
          ) : null}
        </Row>

        {safePaths.length > 0 ? (
          <div>
            <SectionTitle>Paths</SectionTitle>
            <PreLimited lines={safePaths} maxLines={10} />
          </div>
        ) : null}

        {resultType === 'success' ? (
          files.length > 0 ? (
            <div>
              <SectionTitle>Results</SectionTitle>
              <div className="space-y-1">
                {files.map((file, idx) => {
                  const path =
                    tryString(extract(file, ['path'])) ??
                    tryString(extract(file, ['newPath'])) ??
                    tryString(extract(file, ['oldPath'])) ??
                    `(entry ${idx + 1})`
                  const added = extract(file, ['addedLines']) ?? extract(file, ['additions'])
                  const removed = extract(file, ['removedLines']) ?? extract(file, ['deletions'])
                  const truncated = !!extract(file, ['patchTruncated'])
                  return (
                    <Row key={`${path}-${idx}`} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px]">{path}</span>
                      {typeof added === 'number' ? (
                        <span className="font-mono text-[11px] text-(--text-secondary)">
                          +{added}
                        </span>
                      ) : null}
                      {typeof removed === 'number' ? (
                        <span className="font-mono text-[11px] text-(--text-secondary)">
                          -{removed}
                        </span>
                      ) : null}
                      {truncated ? (
                        <span className="text-[10px] font-medium text-(--text-secondary)">
                          patch truncated
                        </span>
                      ) : null}
                    </Row>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No diff results</div>
          )
        ) : null}
      </div>
    )
  }

  // ---- gitFetch / gitPull / gitPush (remote sync) ----
  if (name === 'gitFetch' || name === 'gitPull' || name === 'gitPush') {
    const remote = tryString(extract(args, ['remote'])) ?? 'origin'
    const branch = tryString(extract(args, ['branch']))
    const ok = resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok !== false
    const errMsg =
      resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok === false
        ? (tryString(extract(result, ['error'])) ?? 'failed')
        : undefined
    const action = name === 'gitFetch' ? 'fetched' : name === 'gitPull' ? 'pulled' : 'pushed'
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          <span className="text-(--text-secondary)">remote:</span>
          <span className="font-mono text-[11px]">{remote}</span>
          {branch ? (
            <>
              <span className="text-(--text-secondary)">branch:</span>
              <span className="font-mono text-[11px]">{branch}</span>
            </>
          ) : null}
          {resultType === 'success' ? (
            <SmallBadge>{ok ? action : 'failed'}</SmallBadge>
          ) : null}
        </Row>
        {errMsg ? (
          <div className="text-[11px] text-(--text-secondary)">{errMsg}</div>
        ) : null}
      </div>
    )
  }

  // ---- gitCommit ----
  if (name === 'gitCommit') {
    const input = (extract(args, ['input']) ?? {}) as Record<string, unknown>
    const message = tryString(extract(input, ['message']))
    const amend = !!extract(input, ['amend'])
    const pushToOrigin = !!extract(input, ['pushToOrigin'])
    const ok = resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok !== false
    return (
      <div className="text-xs space-y-1">
        {message ? (
          <div>
            <SectionTitle>Message</SectionTitle>
            <PreLimited lines={message.split(/\r?\n/)} maxLines={5} />
          </div>
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No message</div>
        )}
        <Row className="flex items-center gap-1.5 flex-wrap">
          {amend ? <SmallBadge>amend</SmallBadge> : null}
          {pushToOrigin ? <SmallBadge>push to origin</SmallBadge> : null}
          {resultType === 'success' ? (
            <SmallBadge>{ok ? 'committed' : 'failed'}</SmallBadge>
          ) : null}
        </Row>
      </div>
    )
  }

  // ---- gitCreateBranch / gitCheckoutBranch / gitDeleteBranch ----
  if (
    name === 'gitCreateBranch' ||
    name === 'gitCheckoutBranch' ||
    name === 'gitDeleteBranch'
  ) {
    const branchName = tryString(extract(args, ['name']))
    const checkoutAfter = !!extract(args, ['checkoutAfter'])
    const create = !!extract(args, ['create'])
    const ok = resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok !== false
    const action =
      name === 'gitCreateBranch'
        ? 'created'
        : name === 'gitCheckoutBranch'
          ? 'checked out'
          : 'deleted'
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          <span className="text-(--text-secondary)">branch:</span>
          <span className="font-mono text-[11px]">{branchName || '(unknown)'}</span>
          {name === 'gitCreateBranch' && checkoutAfter ? <SmallBadge>+checkout</SmallBadge> : null}
          {name === 'gitCheckoutBranch' && create ? <SmallBadge>create if missing</SmallBadge> : null}
          {resultType === 'success' ? (
            <SmallBadge>{ok ? action : 'failed'}</SmallBadge>
          ) : null}
        </Row>
      </div>
    )
  }

  // ---- gitListBranches ----
  if (name === 'gitListBranches') {
    const scope = tryString(extract(args, ['scope'])) ?? 'local'
    const branchesRaw = extract(result, ['branches'])
    const branches = Array.isArray(branchesRaw)
      ? (branchesRaw as Array<Record<string, unknown>>)
      : []
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          <span className="text-(--text-secondary)">scope:</span>
          <span className="font-mono text-[11px]">{scope}</span>
        </Row>
        {resultType === 'success' ? (
          branches.length > 0 ? (
            <div>
              <SectionTitle>Branches</SectionTitle>
              <PreLimited
                lines={branches.map((b) => {
                  const bn = tryString(extract(b, ['name'])) ?? '(unknown)'
                  const current = !!extract(b, ['current'])
                  return `${current ? '* ' : '  '}${bn}`
                })}
                maxLines={15}
              />
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No branches</div>
          )
        ) : null}
      </div>
    )
  }

  // ---- gitCreateMergePlan / gitApplyMerge ----
  if (name === 'gitCreateMergePlan' || name === 'gitApplyMerge') {
    const options = (extract(args, ['options']) ?? {}) as Record<string, unknown>
    const baseRef = tryString(extract(options, ['baseRef']))
    const sourcesRaw = extract(options, ['sources'])
    const sources: string[] = Array.isArray(sourcesRaw)
      ? (sourcesRaw as unknown[]).filter((s): s is string => typeof s === 'string')
      : []
    const conflictsRaw = extract(result, ['conflicts']) ?? extract(result, ['conflictFiles'])
    const conflicts: string[] = Array.isArray(conflictsRaw)
      ? (conflictsRaw as unknown[]).filter((s): s is string => typeof s === 'string')
      : []
    const ok = resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok !== false
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          {baseRef ? (
            <>
              <span className="text-(--text-secondary)">base:</span>
              <span className="font-mono text-[11px]">{baseRef}</span>
            </>
          ) : null}
          {sources.length > 0 ? (
            <>
              <span className="text-(--text-secondary)">sources:</span>
              <span className="font-mono text-[11px]">{sources.join(', ')}</span>
            </>
          ) : null}
          {resultType === 'success' ? (
            <SmallBadge>{ok ? (name === 'gitCreateMergePlan' ? 'planned' : 'merged') : 'failed'}</SmallBadge>
          ) : null}
        </Row>
        {conflicts.length > 0 ? (
          <div>
            <SectionTitle>Conflicts</SectionTitle>
            <PreLimited lines={conflicts} maxLines={10} />
          </div>
        ) : null}
      </div>
    )
  }

  // ---- gitListStashes / gitAddStash / gitApplyStash / gitRemoveStash ----
  if (name === 'gitListStashes') {
    const stashesRaw = extract(result, ['stashes'])
    const stashes = Array.isArray(stashesRaw)
      ? (stashesRaw as Array<Record<string, unknown>>)
      : []
    return (
      <div className="text-xs space-y-1">
        {resultType === 'success' ? (
          stashes.length > 0 ? (
            <div>
              <SectionTitle>Stashes</SectionTitle>
              <PreLimited
                lines={stashes.map((s) => {
                  const ref = tryString(extract(s, ['ref'])) ?? '?'
                  const msg = tryString(extract(s, ['name'])) ?? tryString(extract(s, ['message'])) ?? ''
                  return `${ref}  ${msg}`
                })}
                maxLines={10}
              />
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No stashes</div>
          )
        ) : null}
      </div>
    )
  }
  if (name === 'gitAddStash' || name === 'gitApplyStash' || name === 'gitRemoveStash') {
    const options = (extract(args, ['options']) ?? {}) as Record<string, unknown>
    const stashRef = tryString(extract(options, ['stashRef']))
    const stashName = tryString(extract(options, ['name']))
    const keepStaged = !!extract(options, ['keepStagedChanges'])
    const includeUntracked = !!extract(options, ['includeUntracked'])
    const deleteAfterApply = !!extract(options, ['deleteAfterApply'])
    const ok = resultType === 'success' && (result as { ok?: boolean } | undefined)?.ok !== false
    const action =
      name === 'gitAddStash' ? 'stashed' : name === 'gitApplyStash' ? 'applied' : 'removed'
    return (
      <div className="text-xs space-y-1">
        <Row className="flex items-center gap-1.5 flex-wrap">
          {stashName ? (
            <>
              <span className="text-(--text-secondary)">name:</span>
              <span className="font-mono text-[11px]">{stashName}</span>
            </>
          ) : null}
          {stashRef ? (
            <>
              <span className="text-(--text-secondary)">ref:</span>
              <span className="font-mono text-[11px]">{stashRef}</span>
            </>
          ) : null}
          {name === 'gitAddStash' && keepStaged ? <SmallBadge>keep staged</SmallBadge> : null}
          {name === 'gitAddStash' && includeUntracked ? (
            <SmallBadge>+untracked</SmallBadge>
          ) : null}
          {name === 'gitApplyStash' && deleteAfterApply ? <SmallBadge>+drop</SmallBadge> : null}
          {resultType === 'success' ? (
            <SmallBadge>{ok ? action : 'failed'}</SmallBadge>
          ) : null}
        </Row>
      </div>
    )
  }

  // ---- webReadURLs ----
  if (name === 'webReadURLs') {
    const urls = (extract(args, ['urls']) ?? []) as Array<string | undefined>
    const safeUrls = urls.filter((u): u is string => typeof u === 'string')
    return (
      <div className="text-xs space-y-1">
        {safeUrls.length > 0 ? (
          safeUrls.map((url, idx) => (
            <Row key={url || idx}>
              <span className="font-mono text-[11px]">{url || '(unknown)'}</span>
            </Row>
          ))
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No URLs</div>
        )}
      </div>
    )
  }

  // ---- AST outline / code intel ----
  if (name === 'getAstOutline') {
    const raw = extract(result, ['result']) ?? extract(result, ['nodes']) ?? result
    const items: Array<Record<string, unknown>> = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : []
    return (
      <div className="text-xs space-y-1">
        {items.length > 0 ? (
          <div>
            <SectionTitle>AST Outline</SectionTitle>
            <PreLimited
              lines={items.map(
                (it) =>
                  `${String(it.kind ?? '').padEnd(25)} ${String(it.name ?? '')} (L${String(it.startLine ?? '?')}-L${String(it.endLine ?? '?')})`,
              )}
              maxLines={15}
              renderTruncationMessage={(omitted) => <>+ {omitted} more nodes</>}
            />
          </div>
        ) : resultType === 'success' ? (
          <div className="text-[11px] text-(--text-secondary)">No nodes</div>
        ) : null}
      </div>
    )
  }
  if (name === 'getCode') {
    const requestedNamesRaw = extract(args, ['names'])
    const requestedNames: string[] = Array.isArray(requestedNamesRaw)
      ? (requestedNamesRaw as unknown[]).filter((it): it is string => typeof it === 'string')
      : []
    const rawResults =
      extract(result, ['result']) ??
      extract(result, ['results']) ??
      extract(result, ['items']) ??
      result
    const resultCount = Array.isArray(rawResults)
      ? rawResults.length
      : rawResults && typeof rawResults === 'object'
        ? Object.keys(rawResults as Record<string, unknown>).length
        : 0
    return (
      <div className="text-xs space-y-1">
        <SectionTitle>Names</SectionTitle>
        {requestedNames.length > 0 ? (
          <PreLimited lines={requestedNames} maxLines={10} />
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No names</div>
        )}
        {resultType === 'success' ? (
          <div>
            <SectionTitle>Results</SectionTitle>
            <div className="text-[11px] text-(--text-secondary)">
              {resultCount} result{resultCount === 1 ? '' : 's'}
            </div>
          </div>
        ) : null}
      </div>
    )
  }
  if (name === 'listContents' || name === 'getInterface') {
    const raw =
      extract(result, ['result']) ??
      extract(result, ['results']) ??
      extract(result, ['items']) ??
      extract(result, ['files']) ??
      extract(result, ['paths']) ??
      result
    const items: string[] = Array.isArray(raw)
      ? (raw as unknown[])
          .flatMap((it) => {
            if (typeof it === 'string') return [it]
            const p = tryString(extract(it, ['path', 'name', 'id', 'key', 'title']))
            if (p) return [p]
            const s = tryString(it)
            return s ? [s] : []
          })
          .filter((l): l is string => typeof l === 'string')
      : typeof raw === 'string'
        ? raw.split(/\r?\n/).filter((l) => l.length > 0)
        : []
    return (
      <div className="text-xs space-y-1">
        {items.length > 0 ? (
          items.map((line, idx) => (
            <Row key={`${line}-${idx}`}>
              <span className="font-mono text-[11px]">{line}</span>
            </Row>
          ))
        ) : (
          <div className="text-[11px] text-(--text-secondary)">No results</div>
        )}
      </div>
    )
  }
  if (name === 'webSearch') {
    const query = tryString(extract(args, ['query'])) || ''
    const qLines = query.split(/\r?\n/)
    const rawItems =
      (extract(result, ['items']) as unknown[] | undefined) ||
      (extract(result, ['results']) as unknown[] | undefined)
    const titles: string[] = Array.isArray(rawItems)
      ? rawItems
          .flatMap((it: unknown) => {
            const t =
              tryString(extract(it, ['title'])) ||
              tryString(extract(it, ['name'])) ||
              tryString((it as { title?: string } | undefined)?.title)
            return t ? [t] : []
          })
          .filter((t): t is string => !!t)
      : []
    return (
      <div className="text-xs space-y-1">
        <Row>
          <span className="text-(--text-secondary)">Query:</span>
        </Row>
        <PreLimited lines={qLines} maxLines={2} />
        {resultType === 'success' ? (
          titles.length > 0 ? (
            <div>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={titles}
                maxLines={10}
                renderTruncationMessage={(omitted) => <>+ {omitted} more</>}
              />
            </div>
          ) : (
            <div className="text-[11px] text-(--text-secondary)">No results</div>
          )
        ) : null}
      </div>
    )
  }
  if (name === 'runTests' || name === 'runAllTests' || name === 'runTestsCoverage') {
    const stats = (extract(result, ['summary']) as Record<string, unknown>) || {}
    const passed = (extract(stats, ['passed']) as number | undefined) ?? 0
    const failed = (extract(stats, ['failed']) as number | undefined) ?? 0
    const skipped = (extract(stats, ['skipped']) as number | undefined) ?? 0
    const total = (extract(stats, ['total']) as number | undefined) ?? 0
    const duration = (extract(stats, ['durationMs']) as number | undefined) ?? 0
    const testFiles = (extract(args, ['paths']) as Array<string | undefined> | undefined) ?? []
    const safeTestFiles = testFiles.filter((p): p is string => typeof p === 'string')
    return (
      <div className="text-xs space-y-1">
        <Row>
          <span className="text-(--text-secondary)">Summary:</span>
        </Row>
        <Row>
          <span className="font-mono text-[11px]">passed={passed}</span>
          <span className="mx-1">·</span>
          <span className="font-mono text-[11px]">failed={failed}</span>
          <span className="mx-1">·</span>
          <span className="font-mono text-[11px]">skipped={skipped}</span>
          <span className="mx-1">·</span>
          <span className="font-mono text-[11px]">total={total}</span>
        </Row>
        <Row>
          <span className="font-mono text-[11px]">durationMs={duration}</span>
        </Row>
        {safeTestFiles.length > 0 ? (
          <div>
            <SectionTitle>Files</SectionTitle>
            <PreLimited lines={safeTestFiles} maxLines={10} />
          </div>
        ) : null}
      </div>
    )
  }
  if (name === 'bash' || name === 'runShellCommand' || name === 'shell') {
    const cmd = tryString(extract(args, ['command'])) || ''
    const stdout = tryString(extract(result, ['stdout'])) || ''
    const stderr = tryString(extract(result, ['stderr'])) || ''
    return (
      <div className="text-xs space-y-2">
        <div>
          <SectionTitle>Command</SectionTitle>
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{cmd}</pre>
        </div>
        {stdout ? (
          <div>
            <SectionTitle>stdout</SectionTitle>
            <PreLimited lines={stdout.split(/\r?\n/)} maxLines={20} />
          </div>
        ) : null}
        {stderr ? (
          <div>
            <SectionTitle>stderr</SectionTitle>
            <PreLimited lines={stderr.split(/\r?\n/)} maxLines={20} />
          </div>
        ) : null}
      </div>
    )
  }

  // Fallback: dump result (or arguments) as JSON, capped so a huge unrecognised result can't freeze the UI.
  const str = result != null ? safePreviewString(result).text : safePreviewString(args).text
  return <Code language="json" code={str} />
}

function coerceStoriesList(raw: unknown): StoryShape[] {
  const candidate =
    (extract(raw, ['stories']) as unknown[] | undefined) ||
    (extract(raw, ['items']) as unknown[] | undefined) ||
    (extract(raw, ['results']) as unknown[] | undefined) ||
    (extract(raw, ['data.stories']) as unknown[] | undefined) ||
    raw
  if (!Array.isArray(candidate)) return []
  return candidate.filter(
    (item): item is StoryShape =>
      !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string',
  )
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}
