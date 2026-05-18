import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useTooltipState } from '../../headless/hooks/useTooltipState'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TooltipSideAlign = 'center' | 'start' | 'end'
export type TooltipVariant = 'default' | 'bare'

export type TooltipProps = {
  children: ReactNode
  content: ReactNode
  placement?: TooltipPlacement
  allowedPlacements?: TooltipPlacement[]
  sideAlign?: TooltipSideAlign
  delayMs?: number
  disabled?: boolean
  variant?: TooltipVariant
  anchorAs?: keyof JSX.IntrinsicElements
  anchorClassName?: string
  anchorStyle?: CSSProperties
  anchorRef?: RefObject<HTMLElement | null>
  disableClickToggle?: boolean
  anchorTabIndex?: number
  zIndex?: number
  closeDelayMs?: number
}

export default function Tooltip({
  children,
  content,
  placement = 'right',
  allowedPlacements,
  sideAlign = 'center',
  delayMs = 300,
  disabled = false,
  variant = 'default',
  anchorAs = 'span',
  anchorClassName,
  anchorStyle,
  anchorRef: externalAnchorRef,
  disableClickToggle = false,
  anchorTabIndex,
  zIndex,
  closeDelayMs,
}: TooltipProps) {
  const {
    open,
    show,
    hide: hideRaw,
    setOpen,
  } = useTooltipState({ delayMs, closeDelayMs, disabled })
  const [pinned, setPinned] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const [effectivePlacement, setEffectivePlacement] = useState<TooltipPlacement>(placement)
  const internalAnchorRef = useRef<HTMLElement | null>(null)
  const anchorRef = externalAnchorRef || internalAnchorRef
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipId = useId()

  const measurePassRef = useRef<0 | 1 | 2>(0)
  const sizeObserverRef = useRef<ResizeObserver | null>(null)
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
  const committedTopRef = useRef<number | null>(null)
  const positionRef = useRef<{ top: number; left: number } | null>(null)
  const deferredMeasureRafRef = useRef<number | null>(null)

  const cancelDeferredMeasure = () => {
    if (deferredMeasureRafRef.current != null) {
      window.cancelAnimationFrame(deferredMeasureRafRef.current)
      deferredMeasureRafRef.current = null
    }
  }

  // `pinned` is web-only (click-to-pin). Wrap the headless `hide` so a
  // pinned tooltip stays visible until the user dismisses it explicitly.
  const hide = (immediate = false) => {
    if (pinned && !immediate) return
    if (immediate) setPinned(false)
    hideRaw(immediate)
  }

  useEffect(() => {
    return () => {
      cancelDeferredMeasure()
      removeOutsideHandlers()
      if (sizeObserverRef.current) sizeObserverRef.current.disconnect()
      sizeObserverRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDocMouseDown = (e: globalThis.MouseEvent) => {
    if (!open) return
    const t = e.target as Node
    if (anchorRef.current && anchorRef.current.contains(t)) return
    if (tooltipRef.current && tooltipRef.current.contains(t)) return
    setPinned(false)
    hide(true)
  }
  const onDocKeyDown = (e: globalThis.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      setPinned(false)
      hide(true)
    }
  }
  const addOutsideHandlers = () => {
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown)
  }
  const removeOutsideHandlers = () => {
    document.removeEventListener('mousedown', onDocMouseDown)
    document.removeEventListener('keydown', onDocKeyDown)
  }

  useEffect(() => {
    if (open) addOutsideHandlers()
    else removeOutsideHandlers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerMove = (e: PointerEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: globalThis.MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [open])

  const requestMeasure = () => {
    measurePassRef.current = 0
    setPosition({ top: -9999, left: -9999 })
  }

  useLayoutEffect(() => {
    if (!open) {
      cancelDeferredMeasure()
      setPosition(null)
      setMaxWidth(undefined)
      setMaxHeight(undefined)
      setEffectivePlacement(placement)
      measurePassRef.current = 0
      committedTopRef.current = null
      return
    }
    if (!anchorRef.current) return

    requestMeasure()

    let raf1: number | null = null
    let raf2: number | null = null
    raf1 = window.requestAnimationFrame(() => {
      if (!open) return
      requestMeasure()
      raf2 = window.requestAnimationFrame(() => {
        if (!open) return
        requestMeasure()
      })
    })

    return () => {
      if (raf1 != null) window.cancelAnimationFrame(raf1)
      if (raf2 != null) window.cancelAnimationFrame(raf2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placement, anchorRef])

  useEffect(() => {
    if (!open) return
    if (!tooltipRef.current) return

    if (sizeObserverRef.current) sizeObserverRef.current.disconnect()

    const obs = new ResizeObserver(() => {
      if (!tooltipRef.current) return

      const currentPos = positionRef.current
      if (!currentPos || currentPos.top <= -5000) return

      const tip = tooltipRef.current
      const viewportHeight = window.innerHeight
      const spacing = 8
      const lockedTop = committedTopRef.current

      if (lockedTop !== null) {
        const newHeight = tip.getBoundingClientRect().height
        let newTop = lockedTop
        const bottomOverflow = lockedTop + newHeight + spacing - viewportHeight
        if (bottomOverflow > 0) {
          newTop = lockedTop - bottomOverflow
          const m = lastMouseRef.current
          if (m) newTop = Math.min(newTop, m.y - 4)
          newTop = Math.max(spacing, newTop)
        }

        positionRef.current = { top: newTop, left: currentPos.left }
        setPosition({ top: newTop, left: currentPos.left })
      } else {
        requestMeasure()
      }

      const m = lastMouseRef.current
      if (m) {
        const r = tip.getBoundingClientRect()
        const inside = m.x >= r.left && m.x <= r.right && m.y >= r.top && m.y <= r.bottom
        if (inside) show(true)
      }
    })

    obs.observe(tooltipRef.current)
    sizeObserverRef.current = obs

    return () => {
      obs.disconnect()
      if (sizeObserverRef.current === obs) sizeObserverRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useLayoutEffect(() => {
    if (!open || !position || position.top > -5000 || !tooltipRef.current || !anchorRef.current)
      return

    const tip = tooltipRef.current
    const tipRect = tip.getBoundingClientRect()
    const anchor = anchorRef.current
    const anchorRect = anchor.getBoundingClientRect()

    if (anchorRect.top < -5000 || anchorRect.left < -5000) {
      if (measurePassRef.current < 20) {
        measurePassRef.current = (measurePassRef.current + 1) as 0 | 1 | 2
        const nextTop = position.top === -9999 ? -9998 : -9999
        cancelDeferredMeasure()
        deferredMeasureRafRef.current = window.requestAnimationFrame(() => {
          deferredMeasureRafRef.current = null
          setPosition({ top: nextTop, left: nextTop })
        })
      }
      return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const spacing = 8

    const calcSideTop = () => {
      switch (sideAlign) {
        case 'start':
          return anchorRect.top
        case 'end':
          return anchorRect.bottom - tipRect.height
        case 'center':
        default:
          return anchorRect.top + anchorRect.height / 2 - tipRect.height / 2
      }
    }

    const calcPos = (pl: TooltipPlacement) => {
      let t = 0
      let l = 0
      switch (pl) {
        case 'right':
          t = calcSideTop()
          l = anchorRect.right + spacing
          break
        case 'left':
          t = calcSideTop()
          l = anchorRect.left - spacing - tipRect.width
          break
        case 'top':
          t = anchorRect.top - spacing - tipRect.height
          l = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
          break
        case 'bottom':
          t = anchorRect.bottom + spacing
          l = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
          break
      }
      return { top: t, left: l }
    }

    const fitsSide = (pl: 'left' | 'right') => {
      const available =
        pl === 'right' ? viewportWidth - (anchorRect.right + spacing) : anchorRect.left - spacing
      return available >= Math.min(tipRect.width, viewportWidth * 0.6)
    }
    const fitsVert = (pl: 'top' | 'bottom') => {
      const available =
        pl === 'bottom' ? viewportHeight - (anchorRect.bottom + spacing) : anchorRect.top - spacing
      return available >= Math.min(tipRect.height, viewportHeight * 0.6)
    }

    const order: TooltipPlacement[] =
      allowedPlacements ||
      (() => {
        switch (placement) {
          case 'left':
            return ['left', 'right', 'top', 'bottom']
          case 'top':
            return ['top', 'bottom', 'right', 'left']
          case 'bottom':
            return ['bottom', 'top', 'right', 'left']
          case 'right':
          default:
            return ['right', 'left', 'top', 'bottom']
        }
      })()

    let chosen: TooltipPlacement = placement

    let found = false
    for (const pl of order) {
      if ((pl === 'left' || pl === 'right') && fitsSide(pl)) {
        chosen = pl
        found = true
        break
      }
      if ((pl === 'top' || pl === 'bottom') && fitsVert(pl)) {
        chosen = pl
        found = true
        break
      }
    }

    if (!found) {
      let maxSpace = -1
      for (const pl of order) {
        const space =
          pl === 'left'
            ? anchorRect.left
            : pl === 'right'
              ? viewportWidth - anchorRect.right
              : pl === 'top'
                ? anchorRect.top
                : viewportHeight - anchorRect.bottom

        if (space > maxSpace) {
          maxSpace = space
          chosen = pl
        }
      }
    }

    const pos = calcPos(chosen)

    let availableWidth = viewportWidth
    if (chosen === 'right')
      availableWidth = Math.max(120, viewportWidth - (anchorRect.right + spacing) - 4)
    else if (chosen === 'left') availableWidth = Math.max(120, anchorRect.left - spacing - 4)
    else if (chosen === 'top' || chosen === 'bottom')
      availableWidth = Math.max(160, Math.min(viewportWidth - 16, 480))

    let availHeight: number
    if (chosen === 'top') {
      availHeight = Math.max(120, anchorRect.top - spacing - 4)
    } else if (chosen === 'bottom') {
      availHeight = Math.max(120, viewportHeight - (anchorRect.bottom + spacing) - 4)
    } else {
      availHeight = Math.max(120, viewportHeight - spacing * 2)
    }

    const clampHeight =
      maxHeight != null
        ? Math.min(tipRect.height, maxHeight)
        : Math.min(tipRect.height, availHeight)

    const clampWidth = Math.min(tipRect.width, availableWidth)

    let clampedTop = Math.max(spacing, Math.min(pos.top, viewportHeight - clampHeight - spacing))
    let clampedLeft = Math.max(spacing, Math.min(pos.left, viewportWidth - clampWidth - spacing))

    if (chosen === 'right') {
      clampedLeft = Math.max(anchorRect.right + spacing, clampedLeft)
    } else if (chosen === 'left') {
      clampedLeft = Math.min(anchorRect.left - spacing - clampWidth, clampedLeft)
    } else if (chosen === 'bottom') {
      clampedTop = Math.max(anchorRect.bottom + spacing, clampedTop)
    } else if (chosen === 'top') {
      clampedTop = Math.min(anchorRect.top - spacing - clampHeight, clampedTop)
    }

    clampedTop = Math.max(spacing, Math.min(clampedTop, viewportHeight - clampHeight - spacing))
    clampedLeft = Math.max(spacing, Math.min(clampedLeft, viewportWidth - clampWidth - spacing))

    setEffectivePlacement(chosen)
    setMaxWidth(Math.floor(availableWidth))
    setMaxHeight(Math.floor(availHeight))
    const settled = measurePassRef.current >= 2
    const nextPos = settled ? { top: clampedTop, left: clampedLeft } : { top: -9999, left: -9999 }

    if (!settled) {
      measurePassRef.current = (measurePassRef.current + 1) as 0 | 1 | 2
    } else {
      committedTopRef.current = clampedTop
      positionRef.current = { top: clampedTop, left: clampedLeft }
    }

    setPosition(nextPos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position, placement, maxHeight, sideAlign])

  useEffect(() => {
    if (!open) return

    let rafId: number | null = null
    const requestReposition = () => {
      if (rafId != null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        requestMeasure()
      })
    }

    const isFromInside = (e: Event, el: HTMLElement | null) => {
      if (!el) return false
      const composed = (e as Event & { composedPath?: () => EventTarget[] }).composedPath
      if (typeof composed === 'function') {
        const path = composed.call(e)
        return path.includes(el)
      }
      const t = e.target as Node | null
      return !!(t && el.contains(t))
    }

    const handleScrollCapture = (e: Event) => {
      if (isFromInside(e, tooltipRef.current)) return
      if (isFromInside(e, anchorRef.current)) return
      requestReposition()
    }

    const handleResize = () => requestReposition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScrollCapture, true)

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScrollCapture, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef])

  const AnchorTag = anchorAs as keyof JSX.IntrinsicElements
  const tooltipClassName = variant === 'bare' ? 'ui-tooltip ui-tooltip--bare' : 'ui-tooltip'

  // The dynamic anchor tag accepts arbitrary intrinsic props; cast at the boundary.
  const AnchorComponent = AnchorTag as unknown as React.FC<{
    ref?: RefObject<HTMLElement | null>
    onMouseEnter?: (e: MouseEvent) => void
    onMouseLeave?: () => void
    onFocus?: () => void
    onBlur?: () => void
    onKeyDown?: (e: KeyboardEvent) => void
    onClick?: () => void
    'aria-describedby'?: string
    'aria-expanded'?: boolean
    className?: string
    style?: CSSProperties
    tabIndex?: number
    children?: ReactNode
  }>

  return (
    <>
      <AnchorComponent
        ref={anchorRef}
        onMouseEnter={(e) => {
          if (typeof e?.clientX === 'number' && typeof e?.clientY === 'number') {
            lastMouseRef.current = { x: e.clientX, y: e.clientY }
          }
          show()
        }}
        onMouseLeave={() => hide()}
        onFocus={() => show(true)}
        onBlur={() => hide(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setPinned(false)
            hide(true)
          }
          if (!disableClickToggle && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setPinned((prev) => {
              const next = !prev
              setOpen(next || open)
              if (!next && !open) setOpen(false)
              return next
            })
          }
        }}
        onClick={() => {
          if (disabled || disableClickToggle) return
          setPinned((prev) => {
            const next = !prev
            setOpen(next || open)
            if (!next && !open) setOpen(false)
            return next
          })
        }}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open ? true : undefined}
        className={anchorClassName}
        style={anchorStyle}
        tabIndex={anchorTabIndex}
      >
        {children}
      </AnchorComponent>
      {open &&
        !disabled &&
        position &&
        createPortal(
          <div
            className={tooltipClassName}
            role="tooltip"
            id={tooltipId}
            ref={tooltipRef}
            onMouseEnter={() => show(true)}
            onMouseLeave={() => hide()}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: zIndex,
              maxWidth: maxWidth,
              maxHeight: maxHeight,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            data-placement={effectivePlacement}
          >
            <div
              className="ui-tooltip__content"
              style={{
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
