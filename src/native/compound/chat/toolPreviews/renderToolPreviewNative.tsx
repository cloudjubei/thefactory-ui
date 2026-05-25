import { type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { extract, tryString } from '../../../../headless/utils/toolPreview'
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
              Story:{' '}
              <Text style={{ fontFamily: nativeFontFamilies.mono }}>{story.id}</Text>
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
              <Text
                style={{ fontSize: 12, color: theme.text.primary }}
                numberOfLines={1}
              >
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
  if (name === 'finishFeature' || name === 'blockFeature') {
    const storyId = tryString(extract(args, ['storyId']))
    const featureId = tryString(extract(args, ['featureId']))
    if (hooks?.renderStoryAndFeatureCallout) {
      return <View>{hooks.renderStoryAndFeatureCallout({ storyId, featureId })}</View>
    }
    return (
      <View>
        <SectionTitle>{name === 'finishFeature' ? 'Finished' : 'Blocked'}</SectionTitle>
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
