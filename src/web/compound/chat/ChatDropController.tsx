import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  chatDropAction,
  chatDropOverlay,
  currentChatDropTarget,
  isFileDrag,
} from '../../../headless/utils/chatDrop'
import {
  CHAT_PANEL_ATTRIBUTE,
  FILE_DROP_ZONE_ATTRIBUTE,
} from '../../../headless/utils/chatDropConstants'
import type { ChatDropInput, ChatDropTargetInfo } from '../../../headless/utils/chatDropTypes'

type RegisteredTarget = {
  info: ChatDropTargetInfo
  zone: () => Element | null
  onFiles: (files: File[]) => void
}

/** The chat composers open in this window, as the drop controller sees them. */
class ChatDropRegistry {
  private readonly _targets = new Map<string, RegisteredTarget>()

  register(target: RegisteredTarget): () => void {
    this._targets.set(target.info.id, target)
    return () => {
      this._targets.delete(target.info.id)
    }
  }

  retitle(id: string, title: string): void {
    const target = this._targets.get(id)
    if (target) target.info = { ...target.info, title }
  }

  touch(id: string): void {
    const target = this._targets.get(id)
    if (target) target.info = { ...target.info, lastActiveAt: Date.now() }
  }

  get(id: string): RegisteredTarget | undefined {
    return this._targets.get(id)
  }

  all(): RegisteredTarget[] {
    return [...this._targets.values()]
  }

  under(node: EventTarget | null): RegisteredTarget | null {
    if (!(node instanceof Node)) return null
    for (const target of this._targets.values()) {
      if (target.zone()?.contains(node)) return target
    }
    return null
  }
}

const registry = new ChatDropRegistry()

type DragState = { dragging: boolean; shiftKey: boolean; overId: string | null }
const NOT_DRAGGING: DragState = { dragging: false, shiftKey: false, overId: null }

function inputFor(state: DragState): ChatDropInput {
  const targets = registry.all()
  return {
    dragging: state.dragging,
    shiftKey: state.shiftKey,
    over: targets.find((t) => t.info.id === state.overId)?.info ?? null,
    current: currentChatDropTarget(targets.map((t) => t.info)),
  }
}

/**
 * The window's file-drop controller, mounted once per app shell. Files dragged
 * in from the OS show an overlay: over a chat a plain drop adds them to it;
 * anywhere else Shift-drop adds them to the chat used last, and any other drop
 * is swallowed so the window never navigates to the file. Drags that carry no
 * files — board reordering, git staging — are left alone.
 */
export function ChatDropController() {
  const [drag, setDrag] = useState<DragState>(NOT_DRAGGING)

  useEffect(() => {
    const stateOf = (e: DragEvent): DragState => ({
      dragging: true,
      shiftKey: e.shiftKey,
      overId: registry.under(e.target)?.info.id ?? null,
    })
    const inDropZone = (e: DragEvent) =>
      e.target instanceof Element &&
      !!e.target.closest(`[${FILE_DROP_ZONE_ATTRIBUTE}]`) &&
      !registry.under(e.target)
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer?.types)) return
      if (inDropZone(e)) {
        setDrag(NOT_DRAGGING)
        return
      }
      e.preventDefault()
      const next = stateOf(e)
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect =
          chatDropAction(inputFor(next)).kind === 'attach' ? 'copy' : 'none'
      }
      setDrag((prev) =>
        prev.dragging === next.dragging &&
        prev.shiftKey === next.shiftKey &&
        prev.overId === next.overId
          ? prev
          : next,
      )
    }
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDrag(NOT_DRAGGING)
    }
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer?.types)) return
      setDrag(NOT_DRAGGING)
      if (e.defaultPrevented) return
      e.preventDefault()
      const action = chatDropAction(inputFor(stateOf(e)))
      if (action.kind !== 'attach') return
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) registry.get(action.targetId)?.onFiles(files)
    }
    const onStop = () => setDrag(NOT_DRAGGING)
    window.addEventListener('dragenter', onDragOver)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('blur', onStop)
    return () => {
      window.removeEventListener('dragenter', onDragOver)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('blur', onStop)
    }
  }, [])

  const view = chatDropOverlay(inputFor(drag))
  if (!view.visible || typeof document === 'undefined') return null
  const zone =
    view.placement === 'over-chat' && view.targetId
      ? (registry.get(view.targetId)?.zone() ?? null)
      : null
  return createPortal(<ChatDropOverlay view={view} zone={zone} />, document.body)
}

function ChatDropOverlay({
  view,
  zone,
}: {
  view: Extract<ReturnType<typeof chatDropOverlay>, { visible: true }>
  zone: Element | null
}) {
  const rect = zone?.getBoundingClientRect()
  const label = (
    <div
      className={[
        'rounded-lg px-4 py-2 text-sm font-medium shadow-lg border',
        view.willAttach
          ? 'bg-(--accent-primary) text-white border-transparent'
          : 'bg-(--surface-raised) text-(--text-primary) border-(--border-default)',
      ].join(' ')}
    >
      {view.message}
    </div>
  )
  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none" aria-live="polite">
      {rect ? (
        <div
          className="absolute flex items-center justify-center rounded-md border-2 border-dashed border-(--accent-primary) bg-(--accent-primary)/10"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          {label}
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-8 flex justify-center">{label}</div>
      )}
    </div>
  )
}

/**
 * Register a chat composer with the window's drop controller. Its drop zone is
 * the chat panel around `ref` — or the composer itself when it sits in no
 * panel. Focus or a click inside the panel makes it the chat a Shift-drop goes to.
 */
export function useChatDropTarget({
  ref,
  title,
  onFiles,
  enabled,
}: {
  ref: RefObject<HTMLElement | null>
  title: string
  onFiles: (files: File[]) => void
  enabled: boolean
}): void {
  const idRef = useRef<string>(`chat-drop-${Math.random().toString(36).slice(2)}`)
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles
  const titleRef = useRef(title)
  titleRef.current = title

  useEffect(() => {
    if (!enabled) return
    const id = idRef.current
    const zone = () => ref.current?.closest(`[${CHAT_PANEL_ATTRIBUTE}]`) ?? ref.current
    const unregister = registry.register({
      info: { id, title: titleRef.current, lastActiveAt: Date.now() },
      zone,
      onFiles: (files) => onFilesRef.current(files),
    })
    const el = zone()
    const onActive = () => registry.touch(id)
    el?.addEventListener('focusin', onActive)
    el?.addEventListener('pointerdown', onActive)
    return () => {
      el?.removeEventListener('focusin', onActive)
      el?.removeEventListener('pointerdown', onActive)
      unregister()
    }
  }, [enabled, ref])

  useEffect(() => {
    registry.retitle(idRef.current, title)
  }, [title])
}
