import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  KNOWLEDGE_TEXT,
  knowledgeTextParts,
  type KnowledgeClaimRow,
  type KnowledgeModelMark,
  type KnowledgeNote,
  type KnowledgePlannedRow,
  type KnowledgeSectionView,
  type KnowledgeSource,
  type KnowledgeView,
  type KnowledgeWorkRow,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ReferenceChip from '../chips/ReferenceChip'
import ToneBadge from '../chips/ToneBadge'
import StatusControl from '../StatusControl'

export type ProjectKnowledgeViewProps = {
  view: KnowledgeView
  /** The project the files belong to, for their chips. */
  projectId: string
  /** Opens a file at its line, as the Files screen does. Omitted, files show as text. */
  onOpenFile?: (path: string, line?: number) => void
  /** The story or feature chip for a recorded piece of work — the app's dependency chip. */
  renderWork: (row: KnowledgeWorkRow) => ReactNode
  onRetry?: () => void
}

type OpenFile = ((path: string, line?: number) => void) | undefined

function ModelMark({ mark }: { mark: KnowledgeModelMark }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      accessible
      accessibilityLabel={mark.title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[1],
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: theme.accent.softBorder,
        backgroundColor: theme.accent.softBg,
        borderRadius: nativeRadii.round,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: mark.stale ? status.working.softFg : theme.accent.primary,
        }}
      />
      <Text numberOfLines={1} style={{ fontSize: 11, color: theme.accent.softFg }}>
        {mark.label}
      </Text>
    </View>
  )
}

function FileChip({
  source,
  projectId,
  onOpenFile,
}: {
  source: KnowledgeSource
  projectId: string
  onOpenFile: OpenFile
}) {
  return (
    <ReferenceChip
      description={{
        kind: 'file',
        label: source.label,
        ...(source.name !== undefined ? { title: source.name } : {}),
        detail: source.line !== undefined ? `${source.path}:${source.line}` : source.path,
        link: { kind: 'file', projectId, path: source.path },
      }}
      {...(onOpenFile ? { onOpen: () => onOpenFile(source.path, source.line) } : {})}
    />
  )
}

function Inline({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <>
      {knowledgeTextParts(text).map((part, i) =>
        part.code ? (
          <Text
            key={i}
            style={{
              fontFamily: nativeFontFamilies.mono,
              fontSize: 12.5,
              backgroundColor: theme.surface.muted,
            }}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        ),
      )}
    </>
  )
}

function Note({ note }: { note: KnowledgeNote }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 13,
        color: note.quiet ? theme.text.muted : theme.text.secondary,
        fontStyle: note.quiet ? 'italic' : 'normal',
      }}
    >
      {note.text}
    </Text>
  )
}

function ClaimRow({
  row,
  projectId,
  onOpenFile,
  first,
}: {
  row: KnowledgeClaimRow
  projectId: string
  onOpenFile: OpenFile
  first: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[2],
        paddingVertical: nativeSpace[4],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      {row.name !== undefined || row.model ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          {row.name !== undefined ? (
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              {row.name}
            </Text>
          ) : null}
          {row.model ? <ModelMark mark={row.model} /> : null}
        </View>
      ) : null}
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: row.quiet ? theme.text.muted : theme.text.secondary,
          fontStyle: row.quiet ? 'italic' : 'normal',
        }}
      >
        <Inline text={row.text} />
      </Text>
      {row.sources.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {row.sources.map((source) => (
            <FileChip
              key={`${source.path}:${source.line ?? ''}`}
              source={source}
              projectId={projectId}
              onOpenFile={onOpenFile}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function WorkLine({
  row,
  renderWork,
  nested,
}: {
  row: KnowledgeWorkRow
  renderWork: (row: KnowledgeWorkRow) => ReactNode
  nested?: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        minHeight: 28,
        paddingLeft: nested ? nativeSpace[8] : 0,
      }}
    >
      {renderWork(row)}
      <Text
        style={{
          flex: 1,
          fontSize: nested ? 13 : 14,
          fontWeight: nested ? '400' : '600',
          color: theme.text.primary,
        }}
      >
        <Inline text={row.title} />
      </Text>
      <StatusControl status={row.status} />
    </View>
  )
}

function PlannedLine({
  item,
  projectId,
  onOpenFile,
}: {
  item: KnowledgePlannedRow
  projectId: string
  onOpenFile: OpenFile
}) {
  const { theme } = useNativeTheme()
  const { source } = item
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingVertical: nativeSpace[2],
        paddingLeft: item.depth * 16,
      }}
    >
      <Text style={{ fontSize: 14, color: theme.text.primary }}>
        <Inline text={item.text} />
      </Text>
      {source?.path !== undefined ? (
        <FileChip source={source} projectId={projectId} onOpenFile={onOpenFile} />
      ) : source ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{source.label}</Text>
      ) : null}
    </View>
  )
}

function SectionBody({
  section,
  projectId,
  onOpenFile,
  renderWork,
}: {
  section: KnowledgeSectionView
  projectId: string
  onOpenFile: OpenFile
  renderWork: (row: KnowledgeWorkRow) => ReactNode
}) {
  const { theme } = useNativeTheme()
  if (section.kind === 'claims') {
    return (
      <View>
        {section.rows.map((row, i) => (
          <ClaimRow
            key={row.key}
            row={row}
            projectId={projectId}
            onOpenFile={onOpenFile}
            first={i === 0}
          />
        ))}
      </View>
    )
  }
  if (section.kind === 'work') {
    return (
      <View style={{ gap: nativeSpace[2] }}>
        {section.stories.map((story) => (
          <View key={story.key} style={{ gap: nativeSpace[1] }}>
            <WorkLine row={story} renderWork={renderWork} />
            {story.features.map((feature) => (
              <WorkLine key={feature.key} row={feature} renderWork={renderWork} nested />
            ))}
            {story.more ? (
              <Text style={{ fontSize: 12, color: theme.text.muted, paddingLeft: nativeSpace[8] }}>
                {story.more}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    )
  }
  return (
    <View>
      {section.items.map((item) => (
        <PlannedLine key={item.key} item={item} projectId={projectId} onOpenFile={onOpenFile} />
      ))}
    </View>
  )
}

function Section({
  section,
  projectId,
  onOpenFile,
  renderWork,
}: {
  section: KnowledgeSectionView
  projectId: string
  onOpenFile: OpenFile
  renderWork: (row: KnowledgeWorkRow) => ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }} accessibilityLabel={section.title}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: nativeSpace[4],
          rowGap: nativeSpace[1],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}
        >
          {section.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{section.refreshed}</Text>
        {section.stale ? <ToneBadge tone="working" label={KNOWLEDGE_TEXT.stale} /> : null}
      </View>
      {section.note ? <Note note={section.note} /> : null}
      <SectionBody
        section={section}
        projectId={projectId}
        onOpenFile={onOpenFile}
        renderWork={renderWork}
      />
      {section.more ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{section.more}</Text>
      ) : null}
    </View>
  )
}

function Placeholder({
  title,
  body,
  percent,
  busy,
  action,
}: {
  title: string
  body?: string
  percent?: number
  busy?: boolean
  action?: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[6],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        {busy ? <Spinner size={14} color={theme.text.muted} /> : null}
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>{title}</Text>
      </View>
      {body ? <Text style={{ fontSize: 14, color: theme.text.secondary }}>{body}</Text> : null}
      {percent !== undefined ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={{
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: theme.border.subtle,
          }}
        >
          <View
            style={{ height: 6, width: `${percent}%`, backgroundColor: theme.accent.primary }}
          />
        </View>
      ) : null}
      {action}
    </View>
  )
}

/**
 * Native peer of web's `ProjectKnowledgeView`: what the project's overview says, part by part, each with when it
 * was written and whether it is out of date, model-written entries marked, files opened where they are — or why
 * there is no overview. The host scrolls it.
 */
export default function ProjectKnowledgeView({
  view,
  projectId,
  onOpenFile,
  renderWork,
  onRetry,
}: ProjectKnowledgeViewProps) {
  const { theme } = useNativeTheme()
  if (view.kind === 'loading') return <Placeholder title={view.title} busy />
  if (view.kind === 'error') {
    return (
      <Placeholder
        title={view.title}
        body={view.message}
        action={
          onRetry ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button variant="outline" size="sm" onPress={onRetry}>
                {view.retry}
              </Button>
            </View>
          ) : null
        }
      />
    )
  }
  if (view.kind === 'empty') {
    return (
      <Placeholder
        title={view.title}
        body={view.body}
        {...(view.percent !== undefined ? { percent: view.percent } : {})}
        busy={view.reason === 'building' || view.reason === 'queued'}
      />
    )
  }
  return (
    <View style={{ gap: nativeSpace[10] }}>
      {view.updating ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Spinner size={12} color={theme.text.muted} />
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.updating}</Text>
        </View>
      ) : null}
      {view.sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          projectId={projectId}
          onOpenFile={onOpenFile}
          renderWork={renderWork}
        />
      ))}
    </View>
  )
}
