import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import {
  PROJECT_SEARCH_TEXT,
  projectSearchSummary,
  searchMatchSegments,
  searchRecordChip,
  useProjectSearch,
  useReferences,
  type ProjectSearchFileRow,
  type ProjectSearchRecordRow,
  type ProjectSearchTarget,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'
import { IconClose, IconSearch } from '../../icons'
import ReferenceChip from '../chips/ReferenceChip'
import StatusControl from '../StatusControl'
import FileTypeIcon from '../files/FileTypeIcon'
import { PathDisplay } from '../PathDisplay'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

const MATCH_BACKGROUND = 'rgba(251, 191, 36, 0.35)'

export interface ProjectSearchViewProps {
  projectId: string | undefined
  /** Opens a story, feature or note a result names. */
  onOpenResource: (link: ResourceLink) => void
  /** Opens a file a result names, at the line it matched when the search said. */
  onOpenFile: (path: string, line?: number) => void
}

/**
 * Native peer of [web's `ProjectSearchView`](../../../web/compound/search/ProjectSearchView.tsx):
 * one box that finds a project's files (with the lines that matched), stories,
 * features and notes, listed under a heading per kind with its count. A tap
 * opens a result; the host pushes its screen, so Back returns to the search.
 */
export default function ProjectSearchView({
  projectId,
  onOpenResource,
  onOpenFile,
}: ProjectSearchViewProps) {
  const { theme } = useNativeTheme()
  const search = useProjectSearch(projectId)
  const { describeLink } = useReferences({ scope: projectId ? { projectId } : undefined })
  const { groups, status, searched, query, rows } = search

  const open = (target: ProjectSearchTarget) => {
    if (target.type === 'resource') onOpenResource(target.link)
    else onOpenFile(target.path, target.line)
  }

  const hint = (text: string) => (
    <Text
      style={{
        paddingVertical: nativeSpace[8],
        textAlign: 'center',
        fontSize: 13,
        color: theme.text.secondary,
      }}
    >
      {text}
    </Text>
  )
  const showResults = (status === 'done' || status === 'searching') && rows.length > 0

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View
        style={{
          padding: nativeSpace[4],
          gap: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <View style={{ justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: nativeSpace[4], zIndex: 1 }}>
            <IconSearch size={16} color={theme.text.muted} />
          </View>
          <Input
            autoFocus
            value={query}
            onChangeText={search.setQuery}
            placeholder={PROJECT_SEARCH_TEXT.placeholder}
            accessibilityLabel={PROJECT_SEARCH_TEXT.title}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            disabled={!projectId}
            style={{ paddingLeft: 36, paddingRight: 40 }}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PROJECT_SEARCH_TEXT.clear}
              hitSlop={8}
              onPress={() => search.setQuery('')}
              style={{ position: 'absolute', right: nativeSpace[3], padding: nativeSpace[1] }}
            >
              <IconClose size={16} color={theme.text.muted} />
            </Pressable>
          ) : null}
        </View>
        {status === 'searching' ? (
          <Spinner size={12} label={PROJECT_SEARCH_TEXT.searching} />
        ) : status === 'done' && rows.length > 0 ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {projectSearchSummary(groups, searched)}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[6] }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!projectId ? (
          hint(PROJECT_SEARCH_TEXT.noProject)
        ) : status === 'idle' ? (
          hint(PROJECT_SEARCH_TEXT.idle)
        ) : status === 'short' ? (
          hint(PROJECT_SEARCH_TEXT.short)
        ) : status === 'error' ? (
          <Alert variant="error">{search.error ?? PROJECT_SEARCH_TEXT.failed}</Alert>
        ) : status === 'done' && rows.length === 0 ? (
          hint(projectSearchSummary(groups, searched))
        ) : null}
        {status === 'error' ? (
          <Button variant="secondary" onPress={search.retry}>
            {PROJECT_SEARCH_TEXT.retry}
          </Button>
        ) : null}

        {showResults
          ? groups.map((group) => (
              <View
                key={group.key}
                accessibilityLabel={group.label}
                style={{ gap: nativeSpace[2], opacity: status === 'searching' ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: theme.text.muted,
                    }}
                  >
                    {group.label}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: nativeSpace[2],
                      borderRadius: nativeRadii.round,
                      backgroundColor: theme.surface.muted,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                      {group.rows.length}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                    borderRadius: nativeRadii[3],
                    overflow: 'hidden',
                  }}
                >
                  {group.rows.map((row, index) => (
                    <Pressable
                      key={row.key}
                      accessibilityRole="button"
                      onPress={() => open(row.target)}
                      style={({ pressed }) => ({
                        padding: nativeSpace[3],
                        gap: nativeSpace[2],
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.border.subtle,
                        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
                      })}
                    >
                      {row.kind === 'file' ? (
                        <FileRow row={row} query={searched} />
                      ) : (
                        <RecordRow
                          row={row}
                          query={searched}
                          chip={searchRecordChip(row, describeLink(row.link))}
                          onOpen={onOpenResource}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          : null}
      </ScrollView>
    </View>
  )
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {searchMatchSegments(text, query).map((s, i) => (
        <Text key={i} style={s.match ? { backgroundColor: MATCH_BACKGROUND } : undefined}>
          {s.text}
        </Text>
      ))}
    </>
  )
}

function FileRow({ row, query }: { row: ProjectSearchFileRow; query: string }) {
  const { theme } = useNativeTheme()
  const first = row.snippet?.line ?? 0
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <FileTypeIcon path={row.path} size={16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <PathDisplay path={row.path} />
        </View>
        {row.lines ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.lines}</Text>
        ) : null}
      </View>
      {row.snippet ? (
        <View
          style={{
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.muted,
            paddingHorizontal: nativeSpace[2],
            paddingVertical: nativeSpace[1],
          }}
        >
          {row.snippet.text.split('\n').map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
              <Text
                style={{
                  width: 32,
                  textAlign: 'right',
                  fontFamily: nativeFontFamilies.mono,
                  fontSize: 11,
                  color: theme.text.muted,
                }}
              >
                {first + i}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontFamily: nativeFontFamilies.mono,
                  fontSize: 11,
                  color: theme.text.secondary,
                }}
              >
                <Highlighted text={line} query={query} />
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  )
}

function RecordRow({
  row,
  query,
  chip,
  onOpen,
}: {
  row: ProjectSearchRecordRow
  query: string
  chip: ReturnType<typeof searchRecordChip>
  onOpen: (link: ResourceLink) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <ReferenceChip description={chip.description} onOpen={onOpen} />
        {chip.title ? (
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
          >
            <Highlighted text={chip.title} query={query} />
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {row.status ? <StatusControl status={row.status} size="sm" /> : null}
      </View>
      {row.excerpt ? (
        <Text numberOfLines={2} style={{ fontSize: 12.5, color: theme.text.secondary }}>
          <Highlighted text={row.excerpt} query={query} />
        </Text>
      ) : null}
    </>
  )
}
