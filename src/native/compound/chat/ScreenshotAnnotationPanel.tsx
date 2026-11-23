import { useMemo, useRef, useState } from 'react'
import { Image, PanResponder, Text, TextInput, View } from 'react-native'
import { Button } from '../../primitives/Button'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  previewCropMapping,
  screenshotCropPercent,
  screenshotDragRect,
  screenshotPreviewUri,
} from '../../../headless/utils/screenshotAnnotation'
import { SCREENSHOT_ANNOTATION_TEXT } from '../../../headless/utils/screenshotAnnotationConstants'
import type {
  ScreenshotAnnotationView,
  ScreenshotImageSize,
} from '../../../headless/utils/screenshotAnnotationTypes'

export type ScreenshotAnnotationPanelProps = {
  view: ScreenshotAnnotationView
}

type Point = { x: number; y: number }

/** Capture, preview, crop and comment on the app before it joins the chat as a note. Native peer of the web panel. */
export default function ScreenshotAnnotationPanel({ view }: ScreenshotAnnotationPanelProps) {
  const { theme, status } = useNativeTheme()
  const { draft, snapshot, unavailableReason, previewFile, capture } = view
  const previewUri = previewFile ? screenshotPreviewUri(previewFile) : null
  const [drag, setDrag] = useState<{ from: Point; to: Point } | null>(null)
  const layout = useRef<ScreenshotImageSize | null>(null)
  // The outline follows `drag`. The responder reads this ref, which it writes
  // itself: `drag` copied during render is still the previous box when the
  // finger lets go in the same turn.
  const dragRef = useRef<{ from: Point; to: Point } | null>(null)
  const latest = useRef({ draft, snapshot })
  latest.current = { draft, snapshot }
  const rememberDrag = (next: { from: Point; to: Point } | null) => {
    dragRef.current = next
    setDrag(next)
  }
  const holding =
    !!snapshot.image &&
    (snapshot.phase === 'preview' || snapshot.phase === 'failed' || snapshot.phase === 'uploading')

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.snapshot.canCrop,
        onMoveShouldSetPanResponder: () => latest.current.snapshot.canCrop,
        onPanResponderGrant: (event) => {
          const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }
          rememberDrag({ from: point, to: point })
        },
        onPanResponderMove: (event) => {
          const from = dragRef.current?.from
          if (!from) return
          rememberDrag({
            from,
            to: { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
          })
        },
        onPanResponderRelease: () => {
          const { draft: current, snapshot: shown } = latest.current
          const done = dragRef.current
          rememberDrag(null)
          if (!done || !shown.image || !layout.current) return
          const selection = screenshotDragRect(done.from, done.to)
          // A tap is a press and release on the same point. Applying that
          // zero-size drag flags an empty crop and leaves the previous region.
          if (selection.width === 0 || selection.height === 0) return
          const mapping = previewCropMapping(shown.image, layout.current)
          if (mapping) current?.applyCrop(selection, mapping)
        },
        onPanResponderTerminate: () => rememberDrag(null),
      }),
    [],
  )

  const dragRect = drag ? screenshotDragRect(drag.from, drag.to) : null
  const crop =
    snapshot.crop && snapshot.image ? screenshotCropPercent(snapshot.crop, snapshot.image) : null
  const muted = { color: theme.text.secondary, fontSize: 13 }
  const alert = { color: status.stuck.softFg, fontSize: 13 }

  if (!holding) {
    return (
      <View
        accessibilityLabel={SCREENSHOT_ANNOTATION_TEXT.title}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
      >
        {snapshot.phase === 'capturing' ? (
          <>
            <Text style={muted}>{SCREENSHOT_ANNOTATION_TEXT.capturing}</Text>
            <Button size="sm" variant="ghost" onPress={() => draft?.cancel()}>
              {SCREENSHOT_ANNOTATION_TEXT.cancel}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onPress={capture}
            disabled={!!unavailableReason || !draft || !snapshot.canCapture}
          >
            {SCREENSHOT_ANNOTATION_TEXT.capture}
          </Button>
        )}
        {unavailableReason ? (
          <Text accessibilityRole="text" style={muted}>
            {unavailableReason}
          </Text>
        ) : null}
        {snapshot.error ? (
          <Text accessibilityRole="alert" style={alert}>
            {snapshot.error}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <View
      accessibilityLabel={SCREENSHOT_ANNOTATION_TEXT.title}
      style={{
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: 8,
        padding: 8,
        backgroundColor: theme.surface.base,
      }}
    >
      <View
        {...responder.panHandlers}
        onLayout={(event) => {
          layout.current = {
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          }
        }}
        style={{
          width: '100%',
          aspectRatio: (snapshot.image?.width ?? 1) / (snapshot.image?.height ?? 1),
          borderWidth: 1,
          borderColor: theme.border.default,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            accessibilityLabel={SCREENSHOT_ANNOTATION_TEXT.preview}
            resizeMode="stretch"
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
        {crop && !dragRect ? (
          <View
            accessibilityLabel={SCREENSHOT_ANNOTATION_TEXT.cropArea}
            pointerEvents="none"
            style={{
              position: 'absolute',
              ...crop,
              borderWidth: 2,
              borderColor: theme.accent.primary,
            }}
          />
        ) : null}
        {dragRect ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: dragRect.x,
              top: dragRect.y,
              width: dragRect.width,
              height: dragRect.height,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: theme.accent.primary,
            }}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {snapshot.areaLabel ? <Text style={muted}>{snapshot.areaLabel}</Text> : null}
        {snapshot.canCrop ? <Text style={muted}>{SCREENSHOT_ANNOTATION_TEXT.cropHint}</Text> : null}
        {snapshot.canUseEntireImage && snapshot.crop ? (
          <Button size="sm" variant="ghost" onPress={() => draft?.useEntireImage()}>
            {SCREENSHOT_ANNOTATION_TEXT.useEntireImage}
          </Button>
        ) : null}
        {snapshot.canUseAppRegion ? (
          <Button size="sm" variant="ghost" onPress={() => draft?.useAppRegion()}>
            {SCREENSHOT_ANNOTATION_TEXT.useAppRegion}
          </Button>
        ) : null}
      </View>
      {snapshot.needsAppCrop ? (
        <Text style={muted}>{SCREENSHOT_ANNOTATION_TEXT.displaySource}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={SCREENSHOT_ANNOTATION_TEXT.comment}
        placeholder={SCREENSHOT_ANNOTATION_TEXT.commentPlaceholder}
        placeholderTextColor={theme.text.muted}
        multiline
        value={snapshot.comment}
        editable={snapshot.canComment}
        onChangeText={(comment) => draft?.setComment(comment)}
        style={{
          minHeight: 44,
          color: theme.text.primary,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          padding: 8,
          borderRadius: 4,
        }}
      />
      {snapshot.error ? (
        <Text accessibilityRole="alert" style={alert}>
          {snapshot.error}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {snapshot.phase === 'uploading' ? (
          <>
            <Text style={muted}>{SCREENSHOT_ANNOTATION_TEXT.uploading}</Text>
            <Button size="sm" variant="ghost" onPress={() => draft?.cancel()}>
              {SCREENSHOT_ANNOTATION_TEXT.cancel}
            </Button>
          </>
        ) : (
          <>
            {snapshot.canRetry ? (
              <Button size="sm" variant="primary" onPress={() => draft?.retry()}>
                {SCREENSHOT_ANNOTATION_TEXT.retry}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={!snapshot.canConfirm}
                onPress={() => draft?.confirm()}
              >
                {SCREENSHOT_ANNOTATION_TEXT.confirm}
              </Button>
            )}
            {snapshot.canRemove ? (
              <Button size="sm" variant="ghost" onPress={() => draft?.remove()}>
                {SCREENSHOT_ANNOTATION_TEXT.remove}
              </Button>
            ) : null}
          </>
        )}
      </View>
      <Text style={{ color: theme.text.muted, fontSize: 12 }}>
        {SCREENSHOT_ANNOTATION_TEXT.confirmHint}
      </Text>
    </View>
  )
}
