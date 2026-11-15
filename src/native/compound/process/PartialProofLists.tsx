import { Text, View } from 'react-native'

import type { PartialProofView, ProofPointList } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

function PointList({ list, muted }: { list: ProofPointList; muted: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      {list.items.map((item) => (
        <Text
          key={item}
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: muted ? theme.text.secondary : theme.text.primary,
          }}
        >
          {`• ${item}`}
        </Text>
      ))}
    </View>
  )
}

/** A heading over what a proof did show — the thumbnails, or its list. */
export function ShownTitle({ view }: { view: PartialProofView }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {view.shown.title}
    </Text>
  )
}

/** The points a proof could not show, under a dashed rule that says none of them is proven. */
export function NotShownList({ view }: { view: PartialProofView }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[1],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: status.working.softBorder,
        backgroundColor: theme.surface.base,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[2],
      }}
    >
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {view.notShown.title}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '500', color: status.working.softFg }}>
        {view.notShown.caveat}
      </Text>
      <PointList list={view.notShown} muted />
    </View>
  )
}

/**
 * What a proving step showed and what it could not, as two lists — the shown
 * points count on their own; the not-shown ones are marked as not proven.
 * Web peer: `web/compound/process/PartialProofLists`.
 */
export default function PartialProofLists({ view }: { view: PartialProofView }) {
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {view.shown.items.length > 0 ? (
        <View style={{ gap: nativeSpace[1] }}>
          <ShownTitle view={view} />
          <PointList list={view.shown} muted={false} />
        </View>
      ) : null}
      <NotShownList view={view} />
    </View>
  )
}
