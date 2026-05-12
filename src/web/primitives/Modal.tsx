import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Button } from './Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: ModalSize
  hideCloseButton?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  /** `aria-describedby` target inside the modal content, if any. */
  describedById?: string
  closeOnEsc?: boolean
  closeOnOverlayClick?: boolean
  headerActions?: ReactNode
  hideHeader?: boolean
  /**
   * Extra classes applied to the scrollable content area that wraps
   * `children`. Use this to override the default `p-4` padding (e.g. set to
   * `'p-0'` for full-bleed content) without giving up the `flex-grow
   * overflow-y-auto` scroll behaviour.
   */
  contentClassName?: string
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden'),
  )
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
  hideCloseButton = false,
  initialFocusRef,
  describedById,
  closeOnEsc = true,
  closeOnOverlayClick = true,
  headerActions,
  hideHeader = false,
  contentClassName,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  const reactId = useId()
  const titleId = title ? `modal-title-${reactId}` : undefined

  // ESC handling
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeOnEsc, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // Focus management
  useLayoutEffect(() => {
    if (!isOpen) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstFocusable = initialFocusRef?.current ?? (panel ? focusableWithin(panel)[0] : null)
    firstFocusable?.focus()
    return () => {
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen, initialFocusRef])

  const onOverlayMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current && closeOnOverlayClick) onClose()
    },
    [closeOnOverlayClick, onClose],
  )

  const onPanelKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusables = focusableWithin(panel)
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40"
        onMouseDown={onOverlayMouseDown}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        onKeyDown={onPanelKeyDown}
        className={`relative z-10 w-full ${SIZE_CLASS[size]} max-h-[90vh] flex flex-col rounded-lg border shadow-xl outline-none`}
        style={{ background: 'var(--surface-overlay)', borderColor: 'var(--border-subtle)' }}
      >
        {!hideHeader && (title || headerActions || !hideCloseButton) && (
          <div
            className="flex items-center justify-between gap-4 px-4 py-2 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {title && (
              <div id={titleId} className="text-base font-semibold">
                {title}
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {headerActions}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md opacity-70 hover:opacity-100"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
        )}
        <div
          className={['flex-grow overflow-y-auto p-4', contentClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t p-3" style={{ borderColor: 'var(--border-subtle)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export type ConfirmDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const reactId = useId()
  const descId = description ? `confirm-${reactId}` : undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      initialFocusRef={confirmRef}
      describedById={descId}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEsc={closeOnEsc}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? 'danger' : 'primary'}
            onClick={async () => {
              await onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {description && (
        <p id={descId} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </Modal>
  )
}
