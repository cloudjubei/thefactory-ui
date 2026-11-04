import { useState } from 'react'

export type InlineStopConfirmProps = {
  ask: string
  stop: string
  keep: string
  /** What the first press would stop, for a screen reader. */
  label: string
  onStop: () => void
}

/** A Stop that asks in place: work ends only on the second press. */
export default function InlineStopConfirm({
  ask,
  stop,
  keep,
  label,
  onStop,
}: InlineStopConfirmProps) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button
        type="button"
        className="hover:underline"
        onClick={() => setAsking(true)}
        aria-label={label}
      >
        {stop}
      </button>
    )
  }
  return (
    <>
      <span>{ask}</span>
      <button
        type="button"
        className="text-(--status-stuck-soft-fg) hover:underline"
        onClick={onStop}
      >
        {stop}
      </button>
      <button type="button" className="hover:underline" onClick={() => setAsking(false)}>
        {keep}
      </button>
    </>
  )
}
