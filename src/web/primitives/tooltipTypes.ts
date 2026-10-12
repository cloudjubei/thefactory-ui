/** A mounted part of a tooltip — its anchor or its content. */
export type TooltipRegion = { contains: (node: Node | null) => boolean }

/** What a tooltip does when focus leaves its anchor or its content. */
export type TooltipBlurAction = 'keep' | 'close'

export type TooltipBlurInput = {
  /** Where focus went (`FocusEvent.relatedTarget`); `null` when it went nowhere. */
  nextFocus: EventTarget | null
  regions: ReadonlyArray<TooltipRegion | null | undefined>
  pinned: boolean
}

export type OutsideDismissTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

export type OutsideDismissOptions = {
  isInside: (target: EventTarget | null) => boolean
  onDismiss: () => void
}
