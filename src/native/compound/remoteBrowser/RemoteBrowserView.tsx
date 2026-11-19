import { useEffect, useRef, useState } from 'react'
import { Image, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'
import {
  REMOTE_BROWSER_MIN_MARK_PX,
  REMOTE_BROWSER_MODES,
  REMOTE_BROWSER_RESIZE_AFTER_MS,
  REMOTE_BROWSER_TEXT,
  boxBetween,
  canGoBack,
  driverOf,
  fitFrame,
  frameSrc,
  isMarkable,
  noteTitle,
  noteWhere,
  shortSelector,
  shownSession,
  toPagePoint,
  viewBoxOf,
  type RemoteBrowserBox,
  type RemoteBrowserMode,
  type RemoteBrowserNote,
  type RemoteBrowserPoint,
  type RemoteBrowserSize,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronLeft, IconClose, IconRefresh } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import IconButton from '../../primitives/IconButton'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import Skeleton from '../../primitives/Skeleton'
import Spinner from '../../primitives/Spinner'
import NoteForAgentSheet from '../chat/NoteForAgentSheet'
import ToneBadge from '../chips/ToneBadge'

export type RemoteBrowserViewProps = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
}

type Touch = { from: RemoteBrowserPoint; to: RemoteBrowserPoint; scrolled: RemoteBrowserPoint }

const EMPTY_SIZE: RemoteBrowserSize = { width: 0, height: 0 }

function boxStyle(box: RemoteBrowserBox) {
  return {
    position: 'absolute' as const,
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
  }
}

/**
 * Native peer of web's `RemoteBrowserView`: a browser beside a chat, live. A tap clicks the page
 * and a drag scrolls it; in Pick a tap finds the element under it and in Mark a drag draws an
 * area, each opening a note for the agent in a sheet. While the agent drives, the page only
 * takes picks and marks until the person takes over.
 */
export default function RemoteBrowserView({ state, store }: RemoteBrowserViewProps) {
  const { theme } = useNativeTheme()
  const [size, setSize] = useState<RemoteBrowserSize>(EMPTY_SIZE)
  const [typed, setTyped] = useState(state.address)
  const [touch, setTouch] = useState<Touch | null>(null)
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setTyped(state.address)
  }, [state.address])

  useEffect(() => {
    if (!size.width || !size.height || !state.shownId) return
    const timer = setTimeout(() => void store.resize(size), REMOTE_BROWSER_RESIZE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [store, size, state.shownId])

  const session = shownSession(state)
  const metadata = state.frame?.metadata
  const page = metadata ? { width: metadata.deviceWidth, height: metadata.deviceHeight } : size
  const fit = fitFrame(size, page)
  const live = state.status === 'live'
  const agentDrives = driverOf(state) === 'agent'
  const drives = live && !agentDrives
  const lost = state.status === 'reconnecting' || state.status === 'ended'
  const stuck = lost || agentDrives

  const pointOf = (event: GestureResponderEvent): RemoteBrowserPoint => ({
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  })

  const onGrant = (event: GestureResponderEvent) => {
    const at = pointOf(event)
    setTouch({ from: at, to: at, scrolled: at })
  }

  const onMove = (event: GestureResponderEvent) => {
    if (!touch) return
    const at = pointOf(event)
    if (state.mode === 'browse' && drives) {
      const dy = touch.scrolled.y - at.y
      const dx = touch.scrolled.x - at.x
      if (Math.abs(dy) + Math.abs(dx) >= REMOTE_BROWSER_MIN_MARK_PX) {
        const from = toPagePoint(touch.from, fit, page)
        const scale = fit.width ? page.width / fit.width : 1
        if (from)
          void store.send({ kind: 'wheel', x: from.x, y: from.y, dx: dx * scale, dy: dy * scale })
        setTouch({ ...touch, to: at, scrolled: at })
        return
      }
    }
    setTouch({ ...touch, to: at })
  }

  const onRelease = () => {
    const done = touch
    setTouch(null)
    if (!done || !live) return
    const from = toPagePoint(done.from, fit, page)
    const to = toPagePoint(done.to, fit, page)
    if (!from || !to) return
    const box = boxBetween(from, to)
    if (state.mode === 'mark') {
      if (isMarkable(box)) void store.mark(box)
      return
    }
    const moved = Math.hypot(done.to.x - done.from.x, done.to.y - done.from.y)
    if (moved >= REMOTE_BROWSER_MIN_MARK_PX) return
    if (state.mode === 'pick') void store.pick(from)
    else if (drives) void store.send({ kind: 'click', x: from.x, y: from.y, clickCount: 1 })
  }

  const shownBox = (note: RemoteBrowserNote) =>
    metadata ? viewBoxOf(note.box, note.scroll, metadata, fit) : null
  const draft = state.draft
  const draftBox = draft ? shownBox(draft) : null
  const dragBox = touch && state.mode === 'mark' ? boxBetween(touch.from, touch.to) : null
  const accent = theme.accent.primary
  const outline = (note: RemoteBrowserNote, box: RemoteBrowserBox, faded: boolean) => {
    const pick = note.kind === 'pick'
    return (
      <View
        style={{
          ...boxStyle(
            pick
              ? { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 }
              : box,
          ),
          borderWidth: 2,
          borderStyle: pick ? 'solid' : 'dashed',
          borderColor: accent,
          borderRadius: pick ? 4 : 2,
          backgroundColor: theme.accent.softBg,
          opacity: faded ? 0.6 : 1,
        }}
      />
    )
  }
  const pin = (x: number, y: number, n: number) => (
    <View
      style={{
        position: 'absolute',
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: accent,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.text.onAccent, fontSize: 11, fontWeight: '700' }}>{n}</Text>
    </View>
  )
  const tag = (box: RemoteBrowserBox, text: string) => (
    <View
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y - 22,
        backgroundColor: accent,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: theme.text.onAccent, fontSize: 11, fontFamily: 'Menlo' }}>{text}</Text>
    </View>
  )
  const card = (busy: boolean, title: string, body: string, action: string) => (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: nativeSpace[4],
      }}
    >
      <View
        accessibilityRole="summary"
        style={{
          maxWidth: 300,
          alignItems: 'center',
          gap: nativeSpace[2],
          padding: nativeSpace[4],
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        {busy ? <Spinner size={22} color={theme.text.muted} /> : null}
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{title}</Text>
        <Text style={{ fontSize: 12.5, textAlign: 'center', color: theme.text.secondary }}>
          {body}
        </Text>
        <Button variant="secondary" size="sm" onPress={() => void store.retry()}>
          {action}
        </Button>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.surface.base }}>
      <View
        style={{
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[2],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
          <IconButton
            size="sm"
            accessibilityLabel={REMOTE_BROWSER_TEXT.back}
            disabled={stuck || !canGoBack(state)}
            onPress={() => void store.back()}
          >
            <IconChevronLeft />
          </IconButton>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input
              size="sm"
              accessibilityLabel={REMOTE_BROWSER_TEXT.address}
              placeholder={REMOTE_BROWSER_TEXT.addressPlaceholder}
              value={typed}
              disabled={stuck}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onFocus={() => {
                editing.current = true
              }}
              onBlur={() => {
                editing.current = false
                setTyped(state.address)
              }}
              onChangeText={setTyped}
              onSubmitEditing={() => {
                editing.current = false
                void store.open(typed, size.width && size.height ? size : undefined)
              }}
              style={{ borderRadius: 999 }}
            />
          </View>
          <IconButton
            size="sm"
            accessibilityLabel={REMOTE_BROWSER_TEXT.reload}
            disabled={stuck || state.status === 'opening' || !state.address}
            onPress={() => void store.reload()}
          >
            <IconRefresh />
          </IconButton>
          {session && session.holder?.kind !== 'agent' ? (
            <IconButton
              size="sm"
              accessibilityLabel={REMOTE_BROWSER_TEXT.close}
              onPress={() => void store.close()}
            >
              <IconClose />
            </IconButton>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          <SegmentedControl
            size="sm"
            ariaLabel={REMOTE_BROWSER_TEXT.modes}
            value={state.mode}
            options={REMOTE_BROWSER_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
            onChange={(value) => {
              if (live) store.setMode(value as RemoteBrowserMode)
            }}
            style={{ opacity: live ? 1 : 0.55 }}
          />
          <View style={{ flex: 1 }} />
          {session ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              <ToneBadge
                tone={agentDrives ? 'running' : 'empty'}
                label={agentDrives ? REMOTE_BROWSER_TEXT.agentDrives : REMOTE_BROWSER_TEXT.youDrive}
              />
              {agentDrives ? (
                <Button variant="secondary" size="sm" onPress={() => store.takeOver()}>
                  {REMOTE_BROWSER_TEXT.takeOver}
                </Button>
              ) : session.holder?.kind === 'agent' ? (
                <Button variant="ghost" size="sm" onPress={() => store.handBack()}>
                  {REMOTE_BROWSER_TEXT.handBack}
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
        {state.status === 'opening' ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              bottom: -1,
              height: 2,
              width: '58%',
              backgroundColor: accent,
            }}
          />
        ) : null}
      </View>
      <View
        accessibilityLabel={state.title || REMOTE_BROWSER_TEXT.page}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: theme.surface.muted }}
        onLayout={(event: LayoutChangeEvent) =>
          setSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
        onStartShouldSetResponder={() => live}
        onMoveShouldSetResponder={() => live}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={() => setTouch(null)}
      >
        {state.frame ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: frameSrc(state.frame.data) }}
              style={{ ...boxStyle(fit), opacity: lost ? 0.45 : 1 }}
            />
          </View>
        ) : state.status === 'opening' ? (
          <View
            pointerEvents="none"
            style={{ flex: 1, padding: nativeSpace[4], gap: nativeSpace[4] }}
          >
            <Skeleton style={{ height: 22, width: '30%', borderRadius: 4 }} />
            <Skeleton style={{ height: 26, width: '55%', alignSelf: 'center', borderRadius: 8 }} />
            <Skeleton style={{ height: 90, borderRadius: 8 }} />
            <Skeleton style={{ height: 90, borderRadius: 8 }} />
            <Skeleton style={{ height: 90, borderRadius: 8 }} />
          </View>
        ) : state.status === 'idle' ? (
          <View
            pointerEvents="none"
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 24 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>
              {REMOTE_BROWSER_TEXT.emptyTitle}
            </Text>
            <Text style={{ fontSize: 12.5, textAlign: 'center', color: theme.text.secondary }}>
              {REMOTE_BROWSER_TEXT.emptyBody}
            </Text>
          </View>
        ) : null}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {state.notes.map((note, index) => {
            const box = shownBox(note)
            if (!box) return null
            return (
              <View
                key={note.id}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                {outline(note, box, true)}
                {note.kind === 'pick'
                  ? pin(box.x + box.width + 4, box.y - 4, index + 1)
                  : pin(box.x, box.y, index + 1)}
              </View>
            )
          })}
          {draft && draftBox ? (
            <>
              {outline(draft, draftBox, false)}
              {draft.kind === 'mark'
                ? tag(
                    draftBox,
                    REMOTE_BROWSER_TEXT.size(
                      Math.round(draft.box.width),
                      Math.round(draft.box.height),
                    ),
                  )
                : draft.target?.kind === 'element'
                  ? tag(
                      { ...draftBox, x: draftBox.x - 4, y: draftBox.y - 4 },
                      `${shortSelector(draft.target.selector)} · ${REMOTE_BROWSER_TEXT.size(
                        Math.round(draft.box.width),
                        Math.round(draft.box.height),
                      )}`,
                    )
                  : null}
            </>
          ) : null}
          {dragBox ? (
            <View
              style={{
                ...boxStyle(dragBox),
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: accent,
                backgroundColor: theme.accent.softBg,
              }}
            />
          ) : null}
        </View>
        {state.status === 'reconnecting'
          ? card(
              true,
              REMOTE_BROWSER_TEXT.reconnectingTitle,
              REMOTE_BROWSER_TEXT.reconnectingBody,
              REMOTE_BROWSER_TEXT.tryNow,
            )
          : state.status === 'ended'
            ? card(
                false,
                REMOTE_BROWSER_TEXT.endedTitle,
                REMOTE_BROWSER_TEXT.endedBody,
                REMOTE_BROWSER_TEXT.openAgain,
              )
            : null}
        {state.error ? (
          <View style={{ position: 'absolute', top: 8, left: 8, right: 8 }}>
            <Alert onDismiss={() => store.dismissError()}>{state.error}</Alert>
          </View>
        ) : null}
      </View>
      <NoteForAgentSheet
        isOpen={!!draft}
        title={draft ? noteTitle(draft, state.notes.length + 1) : ''}
        where={draft ? noteWhere(draft) : ''}
        onCancel={() => store.cancelDraft()}
        onAdd={(note) => store.addDraft(note)}
      />
    </View>
  )
}
