import { useState, type ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  LOOM_WALKTHROUGH_DEFAULT_LAYOUT,
  LOOM_WALKTHROUGH_TEXT,
  type LoomWalkthroughActions,
  type LoomWalkthroughLayout,
  type LoomWalkthroughRow,
  type LoomWalkthroughView,
} from '../../../../headless'
import type { ChatAttachmentFile } from '../../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import { Input } from '../../../primitives/Input'
import { GroupStoryChip, GroupStoryToneBadge } from '../../groupStories/GroupStoryBits'

export type LoomWalkthroughPanelProps = LoomWalkthroughActions & {
  view: LoomWalkthroughView
  /** The app's file picker; without it a step takes a link alone. */
  pickVideo?: () => Promise<ChatAttachmentFile[]>
  layout?: LoomWalkthroughLayout
}

const ROW_MIN_HEIGHT = 44

function Part({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  )
}

function Script({ row }: { row: LoomWalkthroughRow }) {
  const { theme } = useNativeTheme()
  const line = { fontSize: 13, color: theme.text.primary }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Part label={LOOM_WALKTHROUGH_TEXT.open}>
        <Text style={line}>{row.open}</Text>
      </Part>
      <Part label={LOOM_WALKTHROUGH_TEXT.steps}>
        {row.steps.map((step, i) => (
          <Text key={i} style={line}>{`${i + 1}. ${step}`}</Text>
        ))}
      </Part>
      <Part label={LOOM_WALKTHROUGH_TEXT.mustShow}>
        {row.mustShow.map((text, i) => (
          <Text key={i} style={line}>{`• ${text}`}</Text>
        ))}
      </Part>
    </View>
  )
}

function Attach({
  row,
  pickVideo,
  attachLink,
  attachFile,
  onAttached,
}: LoomWalkthroughActions & {
  row: LoomWalkthroughRow
  pickVideo: LoomWalkthroughPanelProps['pickVideo']
  onAttached: () => void
}) {
  const { theme } = useNativeTheme()
  const [link, setLink] = useState('')
  const [replacing, setReplacing] = useState(false)
  const busy = row.sending !== undefined
  const done = (ok: boolean) => {
    if (!ok) return
    setLink('')
    setReplacing(false)
    onAttached()
  }
  const pick = async () => {
    const [file] = await (pickVideo?.() ?? Promise.resolve([])).catch(() => [])
    if (file) done(await attachFile(row.id, file))
  }
  const { result } = row
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {result ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <GroupStoryChip
            label={result.label}
            tone="ok"
            {...(result.kind === 'link' ? { onPress: () => void Linking.openURL(result.url) } : {})}
          />
          {!replacing ? (
            <Button size="sm" variant="ghost" onPress={() => setReplacing(true)}>
              {LOOM_WALKTHROUGH_TEXT.replace}
            </Button>
          ) : null}
        </View>
      ) : null}
      {!result || replacing ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Input
            size="sm"
            value={link}
            disabled={busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={LOOM_WALKTHROUGH_TEXT.linkLabel}
            placeholder={LOOM_WALKTHROUGH_TEXT.linkPlaceholder}
            onChangeText={setLink}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            <Button
              size="sm"
              variant="primary"
              disabled={busy || link.trim() === ''}
              onPress={() => void attachLink(row.id, link).then(done)}
            >
              {LOOM_WALKTHROUGH_TEXT.addLink}
            </Button>
            {pickVideo ? (
              <Button size="sm" variant="secondary" disabled={busy} onPress={() => void pick()}>
                {LOOM_WALKTHROUGH_TEXT.uploadVideo}
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
      {row.sending ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{row.sending}</Text>
      ) : null}
      {row.error ? <Alert variant="error">{row.error}</Alert> : null}
    </View>
  )
}

/**
 * Native peer of
 * [web's `LoomWalkthroughPanel`](../../../../web/compound/process/signoff/LoomWalkthroughPanel.tsx):
 * each step with what to open, what to do and what must be visible, and a place
 * for a Loom link or a video. One step is open at a time, the first still to
 * record, and attaching moves on to the next. A phone has no room for two
 * columns, so Script and attach reads as All open.
 */
export default function LoomWalkthroughPanel({
  view,
  pickVideo,
  layout = LOOM_WALKTHROUGH_DEFAULT_LAYOUT,
  attachLink,
  attachFile,
}: LoomWalkthroughPanelProps) {
  const { theme } = useNativeTheme()
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  const opened = picked === undefined ? view.firstOpen : picked
  const attach = (row: LoomWalkthroughRow) => (
    <Attach
      row={row}
      pickVideo={pickVideo}
      attachLink={attachLink}
      attachFile={attachFile}
      onAttached={() => setPicked(undefined)}
    />
  )
  const heading = (row: LoomWalkthroughRow) => (
    <>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.muted }}>{row.number}</Text>
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
        {row.title}
      </Text>
      <GroupStoryToneBadge tone={row.recorded ? 'done' : 'queued'} label={row.state} />
    </>
  )
  const frame = {
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: nativeRadii[3],
    overflow: 'hidden',
  } as const

  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {LOOM_WALKTHROUGH_TEXT.intro}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {view.summary}
        </Text>
      </View>
      {layout === 'folds' ? (
        <View style={frame}>
          {view.rows.map((row, index) => {
            const open = row.id === opened
            const Chevron = open ? IconChevronDown : IconChevronRight
            return (
              <View
                key={row.id}
                style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setPicked(open ? null : row.id)}
                  style={({ pressed }) => ({
                    minHeight: ROW_MIN_HEIGHT,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: nativeSpace[2],
                    backgroundColor: pressed ? theme.surface.hover : 'transparent',
                  })}
                >
                  <Chevron size={14} color={theme.text.muted} />
                  {heading(row)}
                </Pressable>
                {open ? (
                  <View
                    style={{
                      gap: nativeSpace[3],
                      paddingHorizontal: nativeSpace[3],
                      paddingBottom: nativeSpace[3],
                    }}
                  >
                    <Script row={row} />
                    {attach(row)}
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      ) : (
        view.rows.map((row) => (
          <View key={row.id} style={[frame, { gap: nativeSpace[2], padding: nativeSpace[3] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              {heading(row)}
            </View>
            <Script row={row} />
            {attach(row)}
          </View>
        ))
      )}
    </View>
  )
}
