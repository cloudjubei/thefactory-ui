import { useState } from 'react'
import { Text, View } from 'react-native'
import { GIT_MERGE_TEXT, mergeBannerTitle } from '../../../headless'
import type { GitMergeInProgress } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { PathDisplay } from '../PathDisplay'

export type MergeInProgressBannerProps = {
  merging: GitMergeInProgress
  current: string | undefined
  /** Opens a conflicted file to resolve it. */
  onResolveFile: (path: string) => void
  /** Marks a conflicted file resolved — stages it. */
  onMarkResolved: (path: string) => Promise<void>
  /** Opens the commit composer, prefilled with the merge message. */
  onCommit: () => void
  onAbort: () => Promise<void>
}

/**
 * Native peer of web's `MergeInProgressBanner`: what is being merged, the
 * files still in conflict — each openable to resolve, or marked resolved —
 * and commit or abort, the abort confirmed in place.
 */
export default function MergeInProgressBanner({
  merging,
  current,
  onResolveFile,
  onMarkResolved,
  onCommit,
  onAbort,
}: MergeInProgressBannerProps) {
  const { theme, status } = useNativeTheme()
  const [confirmingAbort, setConfirmingAbort] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const conflicted = merging.conflictedFiles

  const run = async (key: string, op: () => Promise<void>) => {
    setBusy(key)
    try {
      await op()
    } finally {
      setBusy(null)
    }
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel="Merge in progress"
      style={{
        marginHorizontal: nativeSpace[4],
        marginTop: nativeSpace[3],
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: 10,
        borderWidth: 1,
        borderColor: status.working.softBorder,
        backgroundColor: status.working.softBg,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
        {mergeBannerTitle(merging, current)}
      </Text>
      {confirmingAbort ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {GIT_MERGE_TEXT.abortConfirm}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
            <Button size="sm" variant="secondary" onPress={() => setConfirmingAbort(false)}>
              Keep merging
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busy === 'abort'}
              onPress={() =>
                void run('abort', async () => {
                  await onAbort()
                  setConfirmingAbort(false)
                })
              }
            >
              Abort merge
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          {conflicted.length === 0 ? (
            <Button size="sm" onPress={onCommit}>
              Commit merge
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onPress={() => setConfirmingAbort(true)}>
            Abort merge
          </Button>
        </View>
      )}
      {conflicted.map((path) => (
        <View
          key={path}
          style={{
            gap: nativeSpace[2],
            padding: nativeSpace[2],
            borderRadius: 8,
            backgroundColor: theme.surface.raised,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                paddingHorizontal: 4,
                borderRadius: 4,
                overflow: 'hidden',
                color: status.stuck.softFg,
                backgroundColor: status.stuck.softBg,
              }}
            >
              CONFLICT
            </Text>
            <View style={{ flex: 1 }}>
              <PathDisplay path={path} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
            <Button size="sm" variant="secondary" onPress={() => onResolveFile(path)}>
              Resolve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={busy === path}
              onPress={() => void run(path, () => onMarkResolved(path))}
            >
              Mark resolved
            </Button>
          </View>
        </View>
      ))}
    </View>
  )
}
