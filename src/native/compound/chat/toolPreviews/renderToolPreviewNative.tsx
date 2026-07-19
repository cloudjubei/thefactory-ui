import { type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { extract, tryString } from '../../../../headless/utils/toolPreview'
import { toolResultResourceLinks } from '../../../../headless/utils/toolResultLinks'
import { parseResourceLink } from 'thefactory-tools/utils'
import type { ResourceLink } from 'thefactory-tools/types'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'
import { nativeFontFamilies, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Code from '../../Code'
import {
  InlineOldNew,
  MonoText,
  NewContentOnly,
  PreLimited,
  ReorderList,
  Row,
  SectionTitle,
  SecondaryText,
} from './components'
import { PatchPreview, SmallBadge } from './FieldDiff'
import { WriteMultiToolsPreview } from './WriteMultiToolsPreview'
import { WriteToolsPreview, type ToolPreview } from './WriteToolsPreview'

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
  getStory?: (id: string) => StoryShape | undefined
  getFeature?: (storyId: string, featureId: string) => FeatureShape | undefined
  renderStoryCard?: (story: StoryShape) => ReactNode
  renderFeatureCard?: (story: StoryShape, feature: FeatureShape) => ReactNode
  renderStoryAndFeatureCallout?: (args: { storyId?: string; featureId?: string }) => ReactNode
  renderStoryBullet?: (storyId: string) => ReactNode
  getToolPreview?: (toolCallId: string) => ToolPreview | undefined
  /** Render the live cross-project feature-request card for a `requestProjectFeature` result.
   * The host looks the LIVE record up by `requestId` (via `useCrossProjectRequests`) and owns
   * accept/reject; `status`/`cycleDetected` from the frozen tool result are a fallback. */
  renderFeatureRequestWidget?: (args: {
    requestId: string
    status?: string
    cycleDetected?: boolean
  }) => ReactNode
  /** Route an in-app `overseer://…` resource link tapped in a tool result (F.3). Host wires its
   * `navigateToResource`; omitted ⇒ result links render as inert labels. */
  onResourceLink?: (link: ResourceLink) => void
}

export type RenderToolPreviewArgs = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
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
 * Tool names {@link renderToolPreviewNative} renders with a dedicated drawer.
 * Mirrors web's `RECOGNIZED_TOOL_PREVIEW_NAMES` (the dispatchers are parallel);
 * the CLI transcript uses {@link hasToolPreview} to decide whether to delegate
 * here or render its own generic drawer instead of the JSON fallback.
 */
export const RECOGNIZED_TOOL_PREVIEW_NAMES: ReadonlySet<string> = new Set([
  'writeExactReplaces',
  'writeFile',
  'updateStory',
  'updateFeature',
  'addStory',
  'addFeature',
  'getStory',
  'proposePr',
  'proposeCommitToRealRepo',
  'readPaths',
  'readFile',
  'readFileRanges',
  'grepFiles',
  'grepFile',
  'renamePath',
  'deletePath',
  'listStories',
  'reorderFeature',
  'completeAssignment',
  'blockFeature',
  'searchFilesByExact',
  'searchFilesByKeywords',
  'searchFiles',
  'searchFilePaths',
  'searchFilesAndRead',
  'compileCheck',
  'gitResetFiles',
  'gitDiff',
  'gitFetch',
  'gitPull',
  'gitPush',
  'gitCommit',
  'gitCreateBranch',
  'gitCheckoutBranch',
  'gitDeleteBranch',
  'gitListBranches',
  'gitCreateMergePlan',
  'gitApplyMerge',
  'gitListStashes',
  'gitAddStash',
  'gitApplyStash',
  'gitRemoveStash',
  'webReadURLs',
  'getAstOutline',
  'getCode',
  'getInterface',
  'listContents',
  'webSearch',
  'runTests',
  'runAllTests',
  'runTestsCoverage',
  'bash',
  'runShellCommand',
  'shell',
  'requestProjectFeature',
  'recommendTrainingExperiments',
  'queryProjectData',
  'updateProjectRecord',
])

/** Compact one-line summary of a training experiment spec — mirrors web's `summarizeExperimentSpec`. */
function summarizeExperimentSpec(spec: unknown): string {
  const parts: string[] = []
  const sweep = extract(spec, ['sweep']) as Record<string, unknown> | undefined
  if (sweep && typeof sweep === 'object' && !Array.isArray(sweep)) {
    const keys = Object.entries(sweep).map(
      ([k, v]) => `${k} (${Array.isArray(v) ? v.length : 1} value${Array.isArray(v) && v.length !== 1 ? 's' : ''})`,
    )
    if (keys.length) parts.push(`sweep ${keys.join(', ')}`)
  }
  const fixed = extract(spec, ['fixed']) as Record<string, unknown> | undefined
  if (fixed && typeof fixed === 'object' && !Array.isArray(fixed)) {
    const keys = Object.entries(fixed).map(([k, v]) => `${k}=${String(v)}`)
    if (keys.length) parts.push(`fixed ${keys.join(', ')}`)
  }
  const seeds = extract(spec, ['seeds'])
  if (Array.isArray(seeds) && seeds.length)
    parts.push(`${seeds.length} seed${seeds.length === 1 ? '' : 's'}`)
  const envs = extract(spec, ['environments'])
  if (Array.isArray(envs) && envs.length)
    parts.push(`${envs.length} env${envs.length === 1 ? '' : 's'}`)
  const datasets = extract(spec, ['datasets'])
  if (Array.isArray(datasets) && datasets.length)
    parts.push(`${datasets.length} dataset${datasets.length === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'default config'
}

/** True when {@link renderToolPreviewNative} has a dedicated drawer for `name`. */
export function hasToolPreview(name: string): boolean {
  return RECOGNIZED_TOOL_PREVIEW_NAMES.has(name)
}

/**
 * Native peer of web's `renderToolPreview`. Returns the rich per-tool
 * preview React tree (View / Text / Code / UnifiedDiff) — the wrapper sheet
 * just hosts it. Same dispatch order as web so a chat rendered on both
 * platforms picks the same renderer for each tool name.
 */
export function renderToolPreviewNative({
  toolCall,
  result,
  resultType,
  hooks,
}: RenderToolPreviewArgs): ReactNode {
  const { theme } = useNativeTheme()
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
      return <SecondaryText>No story data</SecondaryText>
    }
    return (
      <PatchPreview
        headerBadge="story"
        headerId={story?.id || nextStory?.id}
        patchKeys={changedKeys(patch, STORY_FIELDS)}
        before={story as Record<string, unknown> | undefined}
        after={nextStory as Record<string, unknown> | undefined}
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
      return <SecondaryText>No feature data</SecondaryText>
    }
    return (
      <PatchPreview
        headerBadge="feature"
        headerId={feature?.id || nextFeature?.id}
        headerSub={
          story?.id || resultStory?.id ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              Story:{' '}
              <Text style={{ fontFamily: nativeFontFamilies.mono }}>
                {story?.id || resultStory?.id}
              </Text>
            </Text>
          ) : undefined
        }
        patchKeys={changedKeys(patch, FEATURE_FIELDS)}
        before={feature as Record<string, unknown> | undefined}
        after={nextFeature as Record<string, unknown> | undefined}
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
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              Story: <Text style={{ fontFamily: nativeFontFamilies.mono }}>{story.id}</Text>
            </Text>
          ) : undefined
        }
        patchKeys={Object.keys(featureInput).filter((k) =>
          (FEATURE_FIELDS as readonly string[]).includes(k),
        )}
        before={undefined}
        after={featureInput as unknown as Record<string, unknown>}
      />
    )
  }

  // ---- file / shell tools ----
  if (name === 'getStory') {
    const storyId = tryString(extract(args, ['storyId'])) || '(unknown)'
    const title = tryString(extract(result, ['title']))
    const status = tryString(extract(result, ['status']))
    return (
      <Row>
        <MonoText>{storyId}</MonoText>
        {title ? <SecondaryText>{title}</SecondaryText> : null}
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
      <View style={{ gap: 4 }}>
        <SectionTitle>Proposed PR</SectionTitle>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>{title}</Text>
        {branch ? <MonoText>{`${branch}${baseRef ? ` ← ${baseRef}` : ''}`}</MonoText> : null}
        {body ? <PreLimited lines={body.split('\n')} maxLines={10} /> : null}
      </View>
    )
  }
  if (name === 'proposeCommitToRealRepo') {
    const message = tryString(extract(args, ['message'])) || '(no message)'
    const paths = Array.isArray(extract(args, ['paths']))
      ? (extract(args, ['paths']) as string[])
      : []
    const notes = tryString(extract(args, ['notes']))
    return (
      <View style={{ gap: 4 }}>
        <SectionTitle>Proposed commit</SectionTitle>
        <Text style={{ fontSize: 12, color: theme.text.primary }}>{message}</Text>
        {paths.map((p, i) => (
          <Row key={p || i}>
            <MonoText>{p}</MonoText>
          </Row>
        ))}
        {notes ? <PreLimited lines={notes.split('\n')} maxLines={6} /> : null}
      </View>
    )
  }
  if (name === 'readFile') {
    const path = tryString(extract(args, ['path'])) || '(unknown)'
    const content = typeof result === 'string' ? result : ''
    return (
      <View style={{ gap: 4 }}>
        <Row>
          <MonoText>{path}</MonoText>
        </Row>
        {resultType === 'success' && content ? (
          <PreLimited lines={content.split('\n')} maxLines={12} />
        ) : null}
      </View>
    )
  }
  if (name === 'grepFile') {
    const path = tryString(extract(args, ['path'])) || '(unknown)'
    const pattern = tryString(extract(args, ['pattern'])) || ''
    const matches = typeof result === 'string' ? result : ''
    return (
      <View style={{ gap: 4 }}>
        <Row>
          {pattern ? <MonoText>/{pattern}/</MonoText> : null}
          <SecondaryText>{path}</SecondaryText>
        </Row>
        {resultType === 'success' && matches ? (
          <PreLimited lines={matches.split('\n')} maxLines={12} />
        ) : null}
      </View>
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
    if (files.length === 0) return <SecondaryText>No paths</SecondaryText>
    return (
      <View style={{ gap: 4 }}>
        {files.map((file, idx) => {
          const content = typeof resultMap[file] === 'string' ? resultMap[file] : undefined
          const suffix =
            resultType === 'success' && typeof content === 'string'
              ? `: ${content.length} chars`
              : ''
          return (
            <Row key={file || idx}>
              <MonoText>{file || '(unknown)'}</MonoText>
              {suffix ? (
                <Text
                  style={{
                    fontFamily: nativeFontFamilies.mono,
                    fontSize: 11,
                    color: theme.text.secondary,
                  }}
                >
                  {suffix}
                </Text>
              ) : null}
            </Row>
          )
        })}
      </View>
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
      <View style={{ gap: 4 }}>
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
              <Row key={`${path}-${idx}`}>
                <MonoText>
                  L{String(startLine ?? '?')}:L{String(endLine ?? '?')} {path}
                </MonoText>
                {suffix ? (
                  <Text
                    style={{
                      fontFamily: nativeFontFamilies.mono,
                      fontSize: 11,
                      color: theme.text.secondary,
                    }}
                  >
                    {suffix}
                  </Text>
                ) : null}
              </Row>
            )
          })
        ) : (
          <SecondaryText>No queries</SecondaryText>
        )}
      </View>
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
      <View style={{ gap: nativeSpace[2] }}>
        {safe.length > 0 ? (
          safe.map((q, idx) => {
            const path = tryString(extract(q, ['path'])) || '(unknown)'
            const pattern = tryString(extract(q, ['pattern'])) || ''
            const matches = Array.isArray(resultMap[path]) ? resultMap[path] : undefined
            const suffix = resultType === 'success' && matches ? `: ${matches.length} matches` : ''
            return (
              <View key={`${path}-${idx}`} style={{ gap: 2 }}>
                <Row>
                  <MonoText>{pattern || '(no pattern)'}</MonoText>
                </Row>
                <Row>
                  <MonoText>{path}</MonoText>
                  {suffix ? (
                    <Text
                      style={{
                        fontFamily: nativeFontFamilies.mono,
                        fontSize: 11,
                        color: theme.text.secondary,
                      }}
                    >
                      {suffix}
                    </Text>
                  ) : null}
                </Row>
              </View>
            )
          })
        ) : (
          <SecondaryText>No queries</SecondaryText>
        )}
      </View>
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
    if (stories.length === 0) return <SecondaryText>No stories</SecondaryText>
    if (hooks?.renderStoryBullet) {
      return (
        <View style={{ gap: nativeSpace[1] }}>
          {stories.map((story) => (
            <View key={story.id}>{hooks.renderStoryBullet!(story.id)}</View>
          ))}
        </View>
      )
    }
    return (
      <View style={{ gap: 4 }}>
        {stories.map((s) => (
          <Row key={s.id}>
            <SmallBadge>story</SmallBadge>
            <MonoText>{s.id}</MonoText>
            {s.title ? (
              <Text style={{ fontSize: 12, color: theme.text.primary }} numberOfLines={1}>
                — {s.title}
              </Text>
            ) : null}
          </Row>
        ))}
      </View>
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
    return <SecondaryText>No reorder data</SecondaryText>
  }
  if (name === 'requestProjectFeature') {
    const requestId = tryString(extract(result, ['requestId']))
    if (requestId && hooks?.renderFeatureRequestWidget) {
      const cycle = extract(result, ['cycleFlag']) as { detected?: unknown } | undefined
      return (
        <View>
          {hooks.renderFeatureRequestWidget({
            requestId,
            status: tryString(extract(result, ['status'])),
            cycleDetected: cycle?.detected === true,
          })}
        </View>
      )
    }
    // No requestId yet (in flight) or no host hook — fall through to the JSON fallback.
  }

  // ---- generic project-data reads/writes (F.1) → tappable resource-link chips (F.3) ----
  if (name === 'queryProjectData' || name === 'updateProjectRecord') {
    const links = toolResultResourceLinks(result)
    if (links.length > 0) {
      const total = extract(result, ['total'])
      const onLink = hooks?.onResourceLink
      const label =
        typeof total === 'number'
          ? `${total} record${total === 1 ? '' : 's'}`
          : `${links.length} record${links.length === 1 ? '' : 's'}`
      return (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={{ color: theme.text.secondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {links.map((l) => (
              <Pressable
                key={l.link}
                disabled={!onLink}
                onPress={() => {
                  const parsed = parseResourceLink(l.link)
                  if (parsed && onLink) onLink(parsed)
                }}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  borderRadius: 999,
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: nativeSpace[1],
                }}
              >
                <Text style={{ color: onLink ? theme.accent.primary : theme.text.secondary, fontSize: 13 }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )
    }
    // No resource links — fall through to the JSON fallback.
  }

  if (name === 'completeAssignment' || name === 'blockFeature') {
    const storyId = tryString(extract(args, ['storyId']))
    const featureId = tryString(extract(args, ['featureId']))
    if (hooks?.renderStoryAndFeatureCallout) {
      return <View>{hooks.renderStoryAndFeatureCallout({ storyId, featureId })}</View>
    }
    return (
      <View>
        <SectionTitle>{name === 'completeAssignment' ? 'Finished' : 'Blocked'}</SectionTitle>
        <Row>
          <Text style={{ fontSize: 12, color: theme.text.primary }}>
            story <Text style={{ fontFamily: nativeFontFamilies.mono }}>{storyId}</Text> / feature{' '}
            <Text style={{ fontFamily: nativeFontFamilies.mono }}>{featureId}</Text>
          </Text>
        </Row>
      </View>
    )
  }

  // ---- search variants ----
  if (name === 'searchFilesByExact' || name === 'searchFilesByKeywords') {
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
      <View style={{ gap: 4 }}>
        <SectionTitle>Query:</SectionTitle>
        <PreLimited lines={qLines} maxLines={10} />
        {resultType === 'success' ? (
          resultLines.length > 0 ? (
            <View>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={resultLines}
                maxLines={10}
                renderTruncationMessage={(omitted) => `+ ${omitted} more`}
              />
            </View>
          ) : (
            <SecondaryText>No matches</SecondaryText>
          )
        ) : null}
      </View>
    )
  }
  if (name === 'searchFiles' || name === 'searchFilePaths' || name === 'searchFilesAndRead') {
    const query = tryString(extract(args, ['query']) ?? extract(result, ['query'])) ?? ''
    const qLines = query ? query.split(/\r?\n/) : ['']
    const resultLines: string[] = Array.isArray(result)
      ? (result as unknown[]).filter((l): l is string => typeof l === 'string')
      : []
    return (
      <View style={{ gap: 4 }}>
        <SectionTitle>Query:</SectionTitle>
        <PreLimited lines={qLines} maxLines={2} />
        {resultType === 'success' ? (
          resultLines.length > 0 ? (
            <View>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={resultLines}
                maxLines={10}
                renderTruncationMessage={(omitted) => `+ ${omitted} more`}
              />
            </View>
          ) : (
            <SecondaryText>No matches</SecondaryText>
          )
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          <SecondaryText>strict:</SecondaryText>
          <MonoText>{String(!!strict)}</MonoText>
        </Row>
        {shownPaths.length > 0 ? (
          <View>
            <SectionTitle>{resultType === 'success' ? 'Failing paths' : 'Paths'}</SectionTitle>
            <PreLimited lines={shownPaths} maxLines={10} />
          </View>
        ) : resultType === 'success' ? (
          <SecondaryText>No failing paths</SecondaryText>
        ) : (
          <SecondaryText>No paths</SecondaryText>
        )}
      </View>
    )
  }

  // ---- gitResetFiles ----
  if (name === 'gitResetFiles') {
    const paths = (extract(args, ['paths']) ?? []) as Array<string | undefined>
    const safePaths = paths.filter((p): p is string => typeof p === 'string')
    return (
      <View style={{ gap: 4 }}>
        {safePaths.length > 0 ? (
          safePaths.map((file, idx) => (
            <Row key={`${file}-${idx}`}>
              <MonoText>{file}</MonoText>
            </Row>
          ))
        ) : (
          <SecondaryText>No paths</SecondaryText>
        )}
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          <SecondaryText>mode:</SecondaryText>
          <MonoText>{staged ? 'staged' : 'unstaged'}</MonoText>
          {includePatch ? <SecondaryText>patch</SecondaryText> : null}
          {includeStructured ? <SecondaryText>structured</SecondaryText> : null}
        </Row>
        {safePaths.length > 0 ? (
          <View>
            <SectionTitle>Paths</SectionTitle>
            <PreLimited lines={safePaths} maxLines={10} />
          </View>
        ) : null}
        {resultType === 'success' ? (
          files.length > 0 ? (
            <View>
              <SectionTitle>Results</SectionTitle>
              <View style={{ gap: 4 }}>
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
                    <Row key={`${path}-${idx}`}>
                      <MonoText>{path}</MonoText>
                      {typeof added === 'number' ? (
                        <Text
                          style={{
                            fontFamily: nativeFontFamilies.mono,
                            fontSize: 11,
                            color: theme.text.secondary,
                          }}
                        >
                          +{added}
                        </Text>
                      ) : null}
                      {typeof removed === 'number' ? (
                        <Text
                          style={{
                            fontFamily: nativeFontFamilies.mono,
                            fontSize: 11,
                            color: theme.text.secondary,
                          }}
                        >
                          -{removed}
                        </Text>
                      ) : null}
                      {truncated ? <SecondaryText>patch truncated</SecondaryText> : null}
                    </Row>
                  )
                })}
              </View>
            </View>
          ) : (
            <SecondaryText>No diff results</SecondaryText>
          )
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          <SecondaryText>remote:</SecondaryText>
          <MonoText>{remote}</MonoText>
          {branch ? (
            <>
              <SecondaryText>branch:</SecondaryText>
              <MonoText>{branch}</MonoText>
            </>
          ) : null}
          {resultType === 'success' ? <SmallBadge>{ok ? action : 'failed'}</SmallBadge> : null}
        </Row>
        {errMsg ? <SecondaryText>{errMsg}</SecondaryText> : null}
      </View>
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
      <View style={{ gap: 4 }}>
        {message ? (
          <View>
            <SectionTitle>Message</SectionTitle>
            <PreLimited lines={message.split(/\r?\n/)} maxLines={5} />
          </View>
        ) : (
          <SecondaryText>No message</SecondaryText>
        )}
        <Row>
          {amend ? <SmallBadge>amend</SmallBadge> : null}
          {pushToOrigin ? <SmallBadge>push to origin</SmallBadge> : null}
          {resultType === 'success' ? <SmallBadge>{ok ? 'committed' : 'failed'}</SmallBadge> : null}
        </Row>
      </View>
    )
  }

  // ---- gitCreateBranch / gitCheckoutBranch / gitDeleteBranch ----
  if (name === 'gitCreateBranch' || name === 'gitCheckoutBranch' || name === 'gitDeleteBranch') {
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
      <View style={{ gap: 4 }}>
        <Row>
          <SecondaryText>branch:</SecondaryText>
          <MonoText>{branchName || '(unknown)'}</MonoText>
          {name === 'gitCreateBranch' && checkoutAfter ? <SmallBadge>+checkout</SmallBadge> : null}
          {name === 'gitCheckoutBranch' && create ? (
            <SmallBadge>create if missing</SmallBadge>
          ) : null}
          {resultType === 'success' ? <SmallBadge>{ok ? action : 'failed'}</SmallBadge> : null}
        </Row>
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          <SecondaryText>scope:</SecondaryText>
          <MonoText>{scope}</MonoText>
        </Row>
        {resultType === 'success' ? (
          branches.length > 0 ? (
            <View>
              <SectionTitle>Branches</SectionTitle>
              <PreLimited
                lines={branches.map((b) => {
                  const bn = tryString(extract(b, ['name'])) ?? '(unknown)'
                  const current = !!extract(b, ['current'])
                  return `${current ? '* ' : '  '}${bn}`
                })}
                maxLines={15}
              />
            </View>
          ) : (
            <SecondaryText>No branches</SecondaryText>
          )
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          {baseRef ? (
            <>
              <SecondaryText>base:</SecondaryText>
              <MonoText>{baseRef}</MonoText>
            </>
          ) : null}
          {sources.length > 0 ? (
            <>
              <SecondaryText>sources:</SecondaryText>
              <MonoText>{sources.join(', ')}</MonoText>
            </>
          ) : null}
          {resultType === 'success' ? (
            <SmallBadge>
              {ok ? (name === 'gitCreateMergePlan' ? 'planned' : 'merged') : 'failed'}
            </SmallBadge>
          ) : null}
        </Row>
        {conflicts.length > 0 ? (
          <View>
            <SectionTitle>Conflicts</SectionTitle>
            <PreLimited lines={conflicts} maxLines={10} />
          </View>
        ) : null}
      </View>
    )
  }

  // ---- gitListStashes / gitAddStash / gitApplyStash / gitRemoveStash ----
  if (name === 'gitListStashes') {
    const stashesRaw = extract(result, ['stashes'])
    const stashes = Array.isArray(stashesRaw) ? (stashesRaw as Array<Record<string, unknown>>) : []
    return (
      <View style={{ gap: 4 }}>
        {resultType === 'success' ? (
          stashes.length > 0 ? (
            <View>
              <SectionTitle>Stashes</SectionTitle>
              <PreLimited
                lines={stashes.map((s) => {
                  const ref = tryString(extract(s, ['ref'])) ?? '?'
                  const msg =
                    tryString(extract(s, ['name'])) ?? tryString(extract(s, ['message'])) ?? ''
                  return `${ref}  ${msg}`
                })}
                maxLines={10}
              />
            </View>
          ) : (
            <SecondaryText>No stashes</SecondaryText>
          )
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <Row>
          {stashName ? (
            <>
              <SecondaryText>name:</SecondaryText>
              <MonoText>{stashName}</MonoText>
            </>
          ) : null}
          {stashRef ? (
            <>
              <SecondaryText>ref:</SecondaryText>
              <MonoText>{stashRef}</MonoText>
            </>
          ) : null}
          {name === 'gitAddStash' && keepStaged ? <SmallBadge>keep staged</SmallBadge> : null}
          {name === 'gitAddStash' && includeUntracked ? <SmallBadge>+untracked</SmallBadge> : null}
          {name === 'gitApplyStash' && deleteAfterApply ? <SmallBadge>+drop</SmallBadge> : null}
          {resultType === 'success' ? <SmallBadge>{ok ? action : 'failed'}</SmallBadge> : null}
        </Row>
      </View>
    )
  }

  // ---- webReadURLs ----
  if (name === 'webReadURLs') {
    const urls = (extract(args, ['urls']) ?? []) as Array<string | undefined>
    const safeUrls = urls.filter((u): u is string => typeof u === 'string')
    return (
      <View style={{ gap: 4 }}>
        {safeUrls.length > 0 ? (
          safeUrls.map((url, idx) => (
            <Row key={url || idx}>
              <MonoText>{url || '(unknown)'}</MonoText>
            </Row>
          ))
        ) : (
          <SecondaryText>No URLs</SecondaryText>
        )}
      </View>
    )
  }

  // ---- AST outline / code intel ----
  if (name === 'getAstOutline') {
    const raw = extract(result, ['result']) ?? extract(result, ['nodes']) ?? result
    const items: Array<Record<string, unknown>> = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : []
    return (
      <View style={{ gap: 4 }}>
        {items.length > 0 ? (
          <View>
            <SectionTitle>AST Outline</SectionTitle>
            <PreLimited
              lines={items.map(
                (it) =>
                  `${String(it.kind ?? '').padEnd(25)} ${String(it.name ?? '')} (L${String(
                    it.startLine ?? '?',
                  )}-L${String(it.endLine ?? '?')})`,
              )}
              maxLines={15}
              renderTruncationMessage={(omitted) => `+ ${omitted} more nodes`}
            />
          </View>
        ) : resultType === 'success' ? (
          <SecondaryText>No nodes</SecondaryText>
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <SectionTitle>Names</SectionTitle>
        {requestedNames.length > 0 ? (
          <PreLimited lines={requestedNames} maxLines={10} />
        ) : (
          <SecondaryText>No names</SecondaryText>
        )}
        {resultType === 'success' ? (
          <View>
            <SectionTitle>Results</SectionTitle>
            <SecondaryText>
              {resultCount} result{resultCount === 1 ? '' : 's'}
            </SecondaryText>
          </View>
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        {items.length > 0 ? (
          items.map((line, idx) => (
            <Row key={`${line}-${idx}`}>
              <MonoText>{line}</MonoText>
            </Row>
          ))
        ) : (
          <SecondaryText>No results</SecondaryText>
        )}
      </View>
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
      <View style={{ gap: 4 }}>
        <SecondaryText>Query:</SecondaryText>
        <PreLimited lines={qLines} maxLines={2} />
        {resultType === 'success' ? (
          titles.length > 0 ? (
            <View>
              <SectionTitle>Results</SectionTitle>
              <PreLimited
                lines={titles}
                maxLines={10}
                renderTruncationMessage={(omitted) => `+ ${omitted} more`}
              />
            </View>
          ) : (
            <SecondaryText>No results</SecondaryText>
          )
        ) : null}
      </View>
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
      <View style={{ gap: 4 }}>
        <SecondaryText>Summary:</SecondaryText>
        <Row>
          <MonoText>passed={passed}</MonoText>
          <MonoText>·</MonoText>
          <MonoText>failed={failed}</MonoText>
          <MonoText>·</MonoText>
          <MonoText>skipped={skipped}</MonoText>
          <MonoText>·</MonoText>
          <MonoText>total={total}</MonoText>
        </Row>
        <Row>
          <MonoText>durationMs={duration}</MonoText>
        </Row>
        {safeTestFiles.length > 0 ? (
          <View>
            <SectionTitle>Files</SectionTitle>
            <PreLimited lines={safeTestFiles} maxLines={10} />
          </View>
        ) : null}
      </View>
    )
  }
  if (name === 'bash' || name === 'runShellCommand' || name === 'shell') {
    const cmd = tryString(extract(args, ['command'])) || ''
    const stdout = tryString(extract(result, ['stdout'])) || ''
    const stderr = tryString(extract(result, ['stderr'])) || ''
    return (
      <View style={{ gap: nativeSpace[2] }}>
        <View>
          <SectionTitle>Command</SectionTitle>
          <MonoText>{cmd}</MonoText>
        </View>
        {stdout ? (
          <View>
            <SectionTitle>stdout</SectionTitle>
            <PreLimited lines={stdout.split(/\r?\n/)} maxLines={20} />
          </View>
        ) : null}
        {stderr ? (
          <View>
            <SectionTitle>stderr</SectionTitle>
            <PreLimited lines={stderr.split(/\r?\n/)} maxLines={20} />
          </View>
        ) : null}
      </View>
    )
  }

  if (name === 'recommendTrainingExperiments') {
    const payload =
      extract(result, ['suggestions']) !== undefined || extract(result, ['accepted']) !== undefined
        ? result
        : (extract(result, ['result']) ?? result)
    const suggestions = (extract(payload, ['suggestions']) as unknown[] | undefined) ?? []
    const accepted = (extract(payload, ['accepted']) as number | undefined) ?? suggestions.length
    const skipped = (extract(payload, ['skippedExisting']) as number | undefined) ?? 0
    const rejected = (extract(payload, ['rejected']) as unknown[] | undefined) ?? []
    const viewLink = tryString(extract(payload, ['viewLink']))
    const onLink = hooks?.onResourceLink
    if (isInFlight && !suggestions.length) {
      return <SecondaryText>Preparing experiments…</SecondaryText>
    }
    return (
      <View style={{ gap: nativeSpace[2] }}>
        <Row>
          <MonoText>{accepted} queued</MonoText>
          {skipped ? <MonoText>· {skipped} already known</MonoText> : null}
          {rejected.length ? <MonoText>· {rejected.length} rejected</MonoText> : null}
        </Row>
        {suggestions.slice(0, 12).map((s, i) => {
          const title = tryString(extract(s, ['title'])) || `experiment ${i + 1}`
          const rationale = tryString(extract(s, ['rationale'])) || ''
          return (
            <View key={i} style={{ gap: 2 }}>
              <Text style={{ fontWeight: '600', color: theme.text.primary }}>{title}</Text>
              {rationale ? <SecondaryText>{rationale}</SecondaryText> : null}
              <MonoText>{summarizeExperimentSpec(extract(s, ['spec']))}</MonoText>
            </View>
          )
        })}
        {suggestions.length > 12 ? (
          <SecondaryText>+ {suggestions.length - 12} more</SecondaryText>
        ) : null}
        {rejected.length ? (
          <View>
            <SectionTitle>Not queued</SectionTitle>
            <PreLimited
              lines={rejected.map(
                (r) =>
                  `${tryString(extract(r, ['title'])) || '—'}: ${tryString(extract(r, ['reason'])) || 'rejected'}`,
              )}
              maxLines={6}
            />
          </View>
        ) : null}
        {suggestions.length && viewLink && onLink ? (
          <Pressable
            onPress={() => {
              const parsed = parseResourceLink(viewLink)
              if (parsed && onLink) onLink(parsed)
            }}
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: 999,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[1],
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: theme.accent.primary, fontSize: 13 }}>
              Open in xAI → Suggested to launch
            </Text>
          </Pressable>
        ) : suggestions.length ? (
          <SecondaryText>
            Queued as ✦ AI suggestions in this project’s xAI (model-insights) tab → Suggested, where
            you can launch them.
          </SecondaryText>
        ) : null}
        {!suggestions.length && !rejected.length && skipped > 0 ? (
          <SecondaryText>
            No new experiments to queue — all {skipped} proposal{skipped === 1 ? '' : 's'} already
            exist in this project.
          </SecondaryText>
        ) : null}
      </View>
    )
  }

  // Fallback: dump result or arguments as JSON.
  const str = (() => {
    if (result != null) {
      const s = tryString(result)
      if (s) return s
    }
    const a = tryString(args)
    return a || ''
  })()
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
