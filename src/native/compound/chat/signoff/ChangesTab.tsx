import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { CliRunReview } from '../../../../headless/api'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconBranch, IconChevron, IconMaximize } from '../../../icons'
import { Button } from '../../../primitives/Button'
import RefChip from '../../chips/RefChip'
import { GitFileChangesPills } from '../../git/GitFileChangesPills'
import GitFileStatusIcon from '../../git/GitFileStatusIcon'
import UnifiedDiff from '../../git/UnifiedDiff'
import { PathDisplay } from '../../PathDisplay'
import { toneText } from './tones'

/** One changed file, whichever path (review branch or captured artifact) it came from. */
export type ChangeFile = {
  path: string
  /** `A` / `M` / `D`, as the git views expect. */
  status: 'A' | 'M' | 'D'
  patch?: string
  /** Why there is no patch to show, when there is none. */
  note?: string
  /** A warning to surface beside the path (a conflict, an unsafe path). */
  warning?: string
}

export type ChangesTabProps = {
  review: CliRunReview | undefined
  files: readonly ChangeFile[]
  loading: boolean
  error: string | undefined
  onRetry: (() => void) | undefined
  /** Opens this branch in the app's Git view, when the host wires it. */
  onOpenGit: (() => void) | undefined
}

const DIFF_MAX_HEIGHT = 270

function FileRow({
  file,
  defaultOpen,
  last,
}: {
  file: ChangeFile
  defaultOpen: boolean
  last: boolean
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: pressed ? theme.surface.raised : theme.surface.overlay,
        })}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevron size={14} color={theme.text.muted} />
        </View>
        <GitFileStatusIcon status={file.status} isConflicted={file.warning !== undefined} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <PathDisplay path={file.path} />
        </View>
        {file.warning ? (
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontSize: 11,
              fontWeight: '500',
              color: toneText('danger', theme),
            }}
          >
            {file.warning}
          </Text>
        ) : null}
        <GitFileChangesPills patch={file.patch} />
      </Pressable>
      {open ? (
        <View style={{ backgroundColor: theme.surface.raised }}>
          {file.patch ? (
            <UnifiedDiff patch={file.patch} maxHeight={DIFF_MAX_HEIGHT} />
          ) : (
            <Text style={{ padding: 12, fontSize: 12, color: theme.text.muted }}>
              {file.note ?? 'No textual diff.'}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  )
}

/**
 * The change itself, on the shipped code-changes design: the git file-row trio
 * over `UnifiedDiff`. A standard commit header sits above — branch, base, head,
 * each a ref chip — with a way into the app's Git view.
 */
export default function ChangesTab({
  review,
  files,
  loading,
  error,
  onRetry,
  onOpenGit,
}: ChangesTabProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 8 }}>
      {review ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <IconBranch size={14} color={theme.text.muted} />
          <RefChip kind="branch" value={review.branch} />
          <Text style={{ fontSize: 12, color: theme.text.muted }}>from</Text>
          <RefChip kind="commit" value={review.baseSha} />
          {review.headSha ? (
            <>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>to</Text>
              <RefChip kind="commit" value={review.headSha} />
            </>
          ) : null}
          <View style={{ flex: 1 }} />
          {onOpenGit ? (
            <Button
              variant="secondary"
              size="icon"
              accessibilityLabel="Open in Git"
              onPress={onOpenGit}
            >
              <IconMaximize size={16} color={theme.text.primary} />
            </Button>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text style={{ fontSize: 12, color: toneText('danger', theme) }}>
          {error}{' '}
          {onRetry ? (
            <Text style={{ textDecorationLine: 'underline' }} onPress={onRetry}>
              Retry
            </Text>
          ) : null}
        </Text>
      ) : null}
      {loading ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading diff…</Text>
      ) : null}

      {files.length > 0 ? (
        <View
          style={{
            overflow: 'hidden',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          {files.map((file, i) => (
            <FileRow
              key={file.path}
              file={file}
              defaultOpen={i === 0 && files.length <= 3}
              last={i === files.length - 1}
            />
          ))}
        </View>
      ) : !loading && !error ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>No files changed.</Text>
      ) : null}
    </View>
  )
}
