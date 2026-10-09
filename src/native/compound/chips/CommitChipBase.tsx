import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  COMMIT_DETAILS_TEXT,
  commitChangesLabel,
  formatFriendlyTimestamp,
  shortSha,
  type CommitDetails,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCommit } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'

export type CommitCardProps = {
  /** The commit's full sha. */
  sha: string
  details?: CommitDetails
  loading?: boolean
  /** Git does not have the commit here. */
  missing?: boolean
  /** Why the commit could not be read. */
  error?: string
}

export type CommitChipBaseProps = CommitCardProps & {
  /** Opens the commit on a press; its details then open on a long press. Omitted, a press opens the details. */
  onOpen?: () => void
  /** Replaces the details sheet's body — a host that reads the commit when it opens passes its own. */
  renderDetails?: () => ReactNode
}

/**
 * Native peer of web's `CommitCard`: the commit's full sha (selectable to copy),
 * subject, author and date, and what it changed — or that it is being read, is
 * not here, or could not be read.
 */
export function CommitCard({ sha, details, loading, missing, error }: CommitCardProps) {
  const { theme, status } = useNativeTheme()
  const muted = { fontSize: 12.5, color: theme.text.secondary }
  return (
    <View style={{ gap: 6 }}>
      <Text
        selectable
        style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11.5, color: theme.text.secondary }}
      >
        {details?.sha ?? sha}
      </Text>
      {details ? (
        <>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            {details.subject}
          </Text>
          <Text style={muted}>
            {details.authorName} ·{' '}
            {formatFriendlyTimestamp(new Date(details.authorDate).toISOString())}
          </Text>
          {details.changes ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={muted}>{commitChangesLabel(details.changes)}</Text>
              <Text style={{ fontFamily: nativeFontFamilies.mono, color: status.done.softFg }}>
                +{details.changes.insertions}
              </Text>
              <Text style={{ fontFamily: nativeFontFamilies.mono, color: status.stuck.softFg }}>
                −{details.changes.deletions}
              </Text>
            </View>
          ) : null}
        </>
      ) : missing ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {COMMIT_DETAILS_TEXT.missing}
          </Text>
          <Text style={muted}>{COMMIT_DETAILS_TEXT.missingDetail}</Text>
        </>
      ) : error ? (
        <Text style={muted}>{error}</Text>
      ) : loading ? (
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>
          {COMMIT_DETAILS_TEXT.loading}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's `CommitChipBase`: a commit as a chip in the ref-chip
 * family, its short sha — a press opens it, or its details in a sheet, the
 * touch analogue of the web hover card. Pure rendering.
 */
export default function CommitChipBase({
  sha,
  details,
  loading,
  missing,
  error,
  onOpen,
  renderDetails,
}: CommitChipBaseProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const fg = onOpen && !missing ? theme.accent.primary : theme.text.secondary
  return (
    <>
      <Pressable
        onPress={onOpen ?? (() => setOpen(true))}
        {...(onOpen ? { onLongPress: () => setOpen(true) } : {})}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Commit ${sha}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          height: 22,
          paddingHorizontal: 8,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderStyle: missing ? 'dashed' : 'solid',
          borderColor: theme.border.default,
          backgroundColor: theme.surface.base,
        }}
      >
        <View style={{ opacity: 0.8 }}>
          <IconCommit size={11} color={fg} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: 11,
            color: fg,
            textDecorationLine: missing ? 'line-through' : 'none',
          }}
        >
          {shortSha(sha)}
        </Text>
      </Pressable>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={`Commit ${shortSha(sha)}`}>
        <View style={{ paddingHorizontal: nativeSpace[4], paddingBottom: nativeSpace[5] }}>
          {open ? (
            renderDetails ? (
              renderDetails()
            ) : (
              <CommitCard
                sha={sha}
                {...(details ? { details } : {})}
                {...(loading ? { loading } : {})}
                {...(missing ? { missing } : {})}
                {...(error ? { error } : {})}
              />
            )
          ) : null}
        </View>
      </BottomSheet>
    </>
  )
}
