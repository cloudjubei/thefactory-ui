import { Linking, Pressable, Text, View } from 'react-native'
import {
  PROCESS_MERGE_HEADING,
  type ProcessDeliveryLink,
  type ProcessMergeRow,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ToneBadge from '../chips/ToneBadge'

export interface MergeProgressListProps {
  rows: readonly ProcessMergeRow[]
  /** Leave out the heading, where the frame names it. */
  bare?: boolean
  /** Open a repo's run, where what waits on it is answered: no button without it. */
  onOpen?: (row: ProcessMergeRow) => void
  /** Send a repo's conflict to an agent, the existing resolve. */
  onResolve?: (row: ProcessMergeRow) => void
}

function LinkText({ link, strong }: { link: ProcessDeliveryLink; strong: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={8}
      onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: strong ? '500' : '400',
          color: strong ? theme.accent.primary : theme.text.secondary,
          textDecorationLine: 'underline',
        }}
      >
        {`${link.label} ↗`}
      </Text>
    </Pressable>
  )
}

/** Native peer of web's `MergeProgressRowView`: one repo's merge as a line. */
export function MergeProgressRowView({
  row,
  onOpen,
  onResolve,
}: {
  row: ProcessMergeRow
  onOpen?: MergeProgressListProps['onOpen']
  onResolve?: MergeProgressListProps['onResolve']
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        <ToneBadge tone={row.tone} label={row.label} />
        {row.active ? <Spinner size={12} /> : null}
        {row.link ? <LinkText link={row.link} strong /> : null}
        {row.checksLink ? <LinkText link={row.checksLink} strong={false} /> : null}
      </View>
      {row.line ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.line}</Text>
      ) : null}
      {row.canResolve && onResolve ? (
        <Button size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => onResolve(row)}>
          {row.openLabel}
        </Button>
      ) : row.openLabel && onOpen ? (
        <Button
          size="sm"
          variant="secondary"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => onOpen(row)}
        >
          {`${row.openLabel} ›`}
        </Button>
      ) : null}
    </View>
  )
}

/** Native peer of web's `MergeProgressList`: each repo's merge after Accept. */
export default function MergeProgressList({
  rows,
  bare = false,
  onOpen,
  onResolve,
}: MergeProgressListProps) {
  const { theme } = useNativeTheme()
  if (rows.length === 0) return null
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {bare ? null : (
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {PROCESS_MERGE_HEADING}
        </Text>
      )}
      <View
        style={{
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        {rows.map((row, i) => (
          <View
            key={row.legId ?? row.projectId}
            style={{
              gap: nativeSpace[1],
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {rows.length > 1 ? (
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                {row.name}
              </Text>
            ) : null}
            <MergeProgressRowView
              row={row}
              {...(onOpen ? { onOpen } : {})}
              {...(onResolve ? { onResolve } : {})}
            />
          </View>
        ))}
      </View>
    </View>
  )
}
