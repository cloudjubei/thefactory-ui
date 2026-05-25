import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import BottomSheet from '../../../primitives/BottomSheet'
import Code from '../../Code'
import { isFilePathTool } from '../../../../headless/utils/toolPreview'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'
import { nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { PathDisplay } from '../../PathDisplay'
import { StatusIcon, statusVisual } from './StatusIcon'

/**
 * Tool names whose rich preview is a single scrollable unit (one
 * `UnifiedDiff` filling the sheet). These render inside a flex body so the
 * UnifiedDiff owns its scroll + gets sticky hunk headers — matching
 * web where `StructuredUnifiedDiff` uses CSS `position: sticky` against
 * the hover card's `overflow-auto` body. Multi-content tools
 * (`writeExactReplaces`, list-style tools) stay in the default
 * auto-scroll body where the sheet handles vertical scroll.
 */
const SINGLE_SCROLLER_TOOLS: ReadonlySet<string> = new Set(['writeFile'])

export interface ToolPreviewSheetProps {
  isOpen: boolean
  onClose: () => void
  toolCall?: ToolCallLike | null
  result?: unknown
  resultType?: ToolResultTypeLike
  headerPath?: string
  /**
   * Pluggable rich-preview renderer. Consumers (mobile chat screen) pass
   * `renderToolPreviewNative` here to get the same per-tool registry the
   * web hover card uses. When omitted, the sheet falls back to a generic
   * args + result JSON dump so callers without a registry still see
   * something useful.
   */
  renderResult?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
  }) => ReactNode
}

function jsonString(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Touch analogue of web's `ToolCallHoverCard`. The status icon + tool
 * name + path live in the sheet's pinned header (via `BottomSheet`'s
 * `headerNode` slot), so only the rich preview body scrolls — matching
 * web where the hover card's header is fixed and only the renderResult
 * area gets `overflow: auto`.
 */
export default function ToolPreviewSheet({
  isOpen,
  onClose,
  toolCall,
  result,
  resultType,
  headerPath,
  renderResult,
}: ToolPreviewSheetProps) {
  const { theme } = useNativeTheme()
  if (!toolCall) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <View />
      </BottomSheet>
    )
  }
  const status = statusVisual(resultType)
  const showPathDisplay = !!headerPath && isFilePathTool(toolCall.name)
  const singleScroller = SINGLE_SCROLLER_TOOLS.has(toolCall.name)

  const body = renderResult ? (
    renderResult({ toolCall, result, resultType })
  ) : (
    <FallbackArgsResult toolCall={toolCall} result={result} resultType={resultType} />
  )

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeightFraction={0.85}
      // `fillHeight` is reserved for single-scroller tools where the body
      // contains a `UnifiedDiff` that owns its own scroll + sticky hunk
      // headers and therefore needs a definite parent height. Multi-content
      // previews (writeExactReplaces, list tools, …) keep the default
      // hugs-content behaviour so the sheet starts small and grows as the
      // user expands rows.
      fillHeight={singleScroller}
      headerNode={
        <View style={{ gap: nativeSpace[4] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
            }}
          >
            {status ? <StatusIcon kind={status.kind} color={status.iconColor} size={18} /> : null}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '600',
                color: theme.text.primary,
              }}
            >
              {toolCall.name}
            </Text>
          </View>
          {headerPath ? (
            showPathDisplay ? (
              <PathDisplay path={headerPath} />
            ) : (
              <Text
                numberOfLines={2}
                selectable
                style={{
                  fontFamily: 'Menlo',
                  fontSize: 11,
                  color: theme.text.secondary,
                }}
              >
                {headerPath}
              </Text>
            )
          ) : null}
        </View>
      }
    >
      {singleScroller ? (
        // The preview owns its own scroll (UnifiedDiff with sticky hunk
        // headers). Give it a flex-1 box so the scroll height resolves;
        // `fillHeight` on the sheet provides the matching definite height.
        <View
          style={{
            flex: 1,
            paddingHorizontal: nativeSpace[5],
            paddingBottom: nativeSpace[5],
          }}
        >
          {body}
        </View>
      ) : (
        // Non-fillHeight sheet: BottomSheet's own content wrapper already
        // adds horizontal + top padding and wraps in a ScrollView when the
        // measured content exceeds available space. Just add bottom padding
        // here so the body has breathing room above the safe-area inset.
        <View style={{ paddingBottom: nativeSpace[5] }}>{body}</View>
      )}
    </BottomSheet>
  )
}

function FallbackArgsResult({
  toolCall,
  result,
  resultType,
}: {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
}) {
  const { theme } = useNativeTheme()
  const hasArgs =
    toolCall.arguments &&
    (typeof toolCall.arguments !== 'object' ||
      Object.keys(toolCall.arguments as object).length > 0)
  const hasResult = result !== undefined && resultType !== 'aborted'
  const resultLang: 'text' | 'json' | 'diff' = resultType === 'errored' ? 'text' : 'json'
  return (
    <>
      {hasArgs ? (
        <Section label="Arguments">
          <Code language="json" code={jsonString(toolCall.arguments)} />
        </Section>
      ) : null}
      {hasResult ? (
        <Section label={resultType === 'errored' ? 'Error' : 'Result'}>
          <Code language={resultLang} code={jsonString(result)} />
        </Section>
      ) : null}
      {!hasArgs && !hasResult ? (
        <Text style={{ fontSize: 13, color: theme.text.muted }}>
          No arguments or result to display.
        </Text>
      ) : null}
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ marginBottom: nativeSpace[4] }}>
      <Text
        style={{
          marginBottom: nativeSpace[2],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.secondary,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  )
}
