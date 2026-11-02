import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NEEDS_YOU_LINK_PARAM } from '../../../../headless'

export type NeedsYouLinkParamProps = {
  /** The item a "Needs you" link opened the run on. */
  onItem: (itemId: string) => void
}

/**
 * Reads the item a "Needs you" link opened the run page on — `?needsYou=<itemId>`
 * — hands it on, and takes it off the address, so the next link to the same
 * item opens it again.
 */
export default function NeedsYouLinkParam({ onItem }: NeedsYouLinkParamProps) {
  const [params, setParams] = useSearchParams()
  const itemId = params.get(NEEDS_YOU_LINK_PARAM)
  useEffect(() => {
    if (!itemId) return
    onItem(itemId)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(NEEDS_YOU_LINK_PARAM)
        return next
      },
      { replace: true },
    )
  }, [itemId, onItem, setParams])
  return null
}
