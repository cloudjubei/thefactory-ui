import { useEffect } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'

import type {
  EvidenceTile,
  ProofPairView,
  ProofScreenView,
  ProofUnpairedView,
  VerifyProofView,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck } from '../../icons'

export type ProofScreensProps = {
  view: VerifyProofView
  /** Opens the comparison overlay on a pair or new screen, by its key. */
  onOpen: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

/** One capture, or what stands in its place — see the web peer. */
function Frame({
  tile,
  absent,
  width,
  height,
}: {
  tile: EvidenceTile | undefined
  absent: string | undefined
  width: number
  height: number
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderStyle: tile ? 'solid' : 'dashed',
        borderColor: theme.border.default,
        backgroundColor: theme.surface.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {tile?.dataUri ? (
        <Image
          source={{ uri: tile.dataUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : tile ? null : (
        <Text style={{ fontSize: 9.5, color: theme.text.muted, textAlign: 'center', padding: 4 }}>
          {absent}
        </Text>
      )}
    </View>
  )
}

function GroupHead({ title, hint }: { title: string; hint?: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {title}
      </Text>
      {hint ? <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{hint}</Text> : null}
    </View>
  )
}

/** A pair the pass rested on — see the web peer. */
function CountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  const { theme, status } = useNativeTheme()
  const caption = {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
    textAlign: 'center' as const,
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Compare ${pair.subject}`}
      onPress={() => onOpen(pair.key)}
      style={({ pressed }) => ({
        width: 276,
        gap: 8,
        padding: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: status.done.softBorder,
        backgroundColor: theme.surface.raised,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ gap: 4 }}>
          <Frame tile={pair.before} absent={pair.beforeAbsent} width={124} height={220} />
          <Text style={caption}>Before</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Frame tile={pair.after} absent={pair.afterAbsent} width={124} height={220} />
          <Text style={caption}>After</Text>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}
      >
        {pair.subject}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <IconCheck size={14} color={status.done.softFg} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: status.done.softFg }}>
          {pair.verdict}
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
        {pair.sameScreen ? `${pair.change} · ${pair.sameScreen}` : pair.change}
      </Text>
      <Text style={{ fontSize: 11.5, fontWeight: '500', color: theme.accent.primary }}>
        Compare and see the diff
      </Text>
    </Pressable>
  )
}

/** A pair that did not count — small, muted, with the gate's reason. See the web peer. */
function UncountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Compare ${pair.subject} — did not count`}
      onPress={() => onOpen(pair.key)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 8,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 4, opacity: 0.75 }}>
        <Frame tile={pair.before} absent={pair.beforeAbsent} width={45} height={80} />
        <Frame tile={pair.after} absent={pair.afterAbsent} width={45} height={80} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}
        >
          {pair.subject}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={{
              marginTop: 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: theme.text.muted,
            }}
          />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.secondary }}>
            {pair.verdict}
          </Text>
        </View>
        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
          {pair.sameScreen ? `${pair.change} · ${pair.sameScreen}` : pair.change}
        </Text>
      </View>
    </Pressable>
  )
}

function FrameCaption({ word }: { word: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: theme.text.muted,
        textAlign: 'center',
      }}
    >
      {word}
    </Text>
  )
}

/** A screen the change adds, beside where it opens from on the base — see the web peer. */
function NewScreen({ screen, onOpen }: { screen: ProofScreenView; onOpen: (key: string) => void }) {
  const { theme } = useNativeTheme()
  const hasEntry = screen.entryPoint !== undefined || screen.entryPointAbsent !== undefined
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${screen.title}`}
      onPress={() => onOpen(screen.key)}
      style={({ pressed }) => ({ gap: 4, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {hasEntry ? (
          <View style={{ gap: 4, opacity: 0.8 }}>
            <Frame
              tile={screen.entryPoint}
              absent={screen.entryPointAbsent}
              width={79}
              height={140}
            />
            <FrameCaption word="Opens from" />
          </View>
        ) : null}
        <View style={{ gap: 4 }}>
          <Frame tile={screen.tile} absent={screen.absent} width={110} height={196} />
          {hasEntry ? <FrameCaption word="New screen" /> : null}
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{ maxWidth: 196, fontSize: 10.5, color: theme.text.secondary }}
      >
        {screen.title}
      </Text>
    </Pressable>
  )
}

/** An after filed with no before of its subject — see the web peer. */
function UnpairedAfter({
  item,
  onOpen,
}: {
  item: ProofUnpairedView
  onOpen: (key: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.subject} — did not count`}
      onPress={() => onOpen(item.key)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 8,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ opacity: 0.75 }}>
        <Frame tile={item.after} absent={item.afterAbsent} width={45} height={80} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}
        >
          {item.subject}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={{
              marginTop: 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: theme.text.muted,
            }}
          />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.secondary }}>
            {item.reason}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

/**
 * Exactly the screens a verify gate judged — the native peer of the web
 * `ProofScreens`. The pairs the pass rested on lead; the screens the change adds
 * follow, beside where they open from; the pairs and lone afters that did not
 * count come last, muted, each with the gate's reason.
 */
export default function ProofScreens({ view, onOpen, onRequestImage }: ProofScreensProps) {
  const { status, theme } = useNativeTheme()
  useEffect(() => {
    for (const pair of view.pairs) {
      if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
      if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
    }
    for (const screen of view.newScreens) {
      if (screen.tile) onRequestImage(screen.tile.ref.id, screen.tile.ref.mediaType)
      if (screen.entryPoint)
        onRequestImage(screen.entryPoint.ref.id, screen.entryPoint.ref.mediaType)
    }
    for (const item of view.unpaired) {
      if (item.after) onRequestImage(item.after.ref.id, item.after.ref.mediaType)
    }
  }, [view, onRequestImage])

  const counted = view.pairs.filter((p) => p.counted)
  const uncounted = view.pairs.filter((p) => !p.counted)
  const notCounted = uncounted.length + view.unpaired.length
  const summaryColor =
    view.summary.tone === 'empty' ? theme.text.secondary : status[view.summary.tone].softFg

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: summaryColor }}>
        {view.summary.text}
      </Text>

      {counted.length > 0 ? (
        <View style={{ gap: 8 }}>
          <GroupHead title="Shows the change" hint="The pairs this verification rests on." />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 12, paddingRight: 2 }}
          >
            {counted.map((p) => (
              <CountedPair key={p.key} pair={p} onOpen={onOpen} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {view.newScreens.length > 0 ? (
        <View style={{ gap: 8 }}>
          <GroupHead
            title="Screens the change adds"
            hint="These did not exist on the base, so each is shown beside where it opens from there, when that was captured — and counts on the reviewer’s approval of what it shows."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 12 }}
          >
            {view.newScreens.map((s) => (
              <NewScreen key={s.key} screen={s} onOpen={onOpen} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {notCounted > 0 ? (
        <View style={{ gap: 8 }}>
          <GroupHead
            title={`Did not count (${notCounted})`}
            hint="Filed, but not proof of the change — the gate’s reason is under each."
          />
          <View style={{ gap: 6 }}>
            {uncounted.map((p) => (
              <UncountedPair key={p.key} pair={p} onOpen={onOpen} />
            ))}
            {view.unpaired.map((u) => (
              <UnpairedAfter key={u.key} item={u} onOpen={onOpen} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
