import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { freezeScreenshotLaunch, screenshotUnavailableReason } from '../utils/screenshotAnnotation'
import { SCREENSHOT_ANNOTATION_IDLE } from '../utils/screenshotAnnotationConstants'
import { ScreenshotAnnotationDraft } from '../utils/screenshotAnnotationDraft'
import type {
  ScreenshotAnnotationComposer,
  ScreenshotAnnotationSnapshot,
  ScreenshotAnnotationView,
} from '../utils/screenshotAnnotationTypes'

const noSubscription = () => () => {}
const idleSnapshot = (): ScreenshotAnnotationSnapshot => SCREENSHOT_ANNOTATION_IDLE

/**
 * A composer's screenshot annotation, live. Null when the host offers none.
 * The host's draft is used when it keeps one; otherwise this composer keeps
 * its own and disposes it on unmount, so a late capture is released.
 * `noteIds` is read when the note is created, so that replacement draft does
 * not reuse an id still on the composer.
 */
export function useScreenshotAnnotation(
  screenshot: ScreenshotAnnotationComposer | undefined,
  noteIds?: () => readonly string[],
): ScreenshotAnnotationView | null {
  const noteIdsRef = useRef(noteIds)
  noteIdsRef.current = noteIds
  const hostDraft = screenshot?.draft ?? null
  const wantsOwnDraft = !!screenshot && !hostDraft
  const [ownDraft, setOwnDraft] = useState<ScreenshotAnnotationDraft | null>(null)
  useEffect(() => {
    if (!wantsOwnDraft) return
    const own = new ScreenshotAnnotationDraft()
    setOwnDraft(own)
    return () => {
      own.dispose()
      setOwnDraft(null)
    }
  }, [wantsOwnDraft])
  const draft = hostDraft ?? (wantsOwnDraft ? ownDraft : null)
  const getSnapshot = draft?.getSnapshot ?? idleSnapshot
  const snapshot = useSyncExternalStore(
    draft?.subscribe ?? noSubscription,
    getSnapshot,
    getSnapshot,
  )
  if (!screenshot) return null
  const unavailableReason =
    snapshot.phase === 'unavailable'
      ? snapshot.unavailableReason
      : snapshot.phase === 'idle'
        ? screenshotUnavailableReason(screenshot.adapter)
        : null
  return {
    draft,
    snapshot,
    unavailableReason,
    previewFile: draft?.getPreviewFile() ?? null,
    capture: () => {
      if (!draft) return
      const launch = freezeScreenshotLaunch(screenshot.launch())
      draft.requestCapture(
        launch,
        screenshot.adapter ?? null,
        screenshot.upload,
        (note) => screenshot.onNote(note, launch),
        () => noteIdsRef.current?.() ?? [],
      )
    },
  }
}
