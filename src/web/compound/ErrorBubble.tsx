import { useState } from 'react'
import { IconError } from '../icons'

export type ErrorBubbleProps = {
  /** Arbitrary error-like value. The bubble extracts message/reason/code
   *  for the short label and JSON-stringifies the full value for details. */
  error: unknown
}

function readMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; reason?: string; code?: string }
    return e.message ?? e.reason ?? e.code ?? 'Unknown error'
  }
  if (typeof err === 'string') return err
  return 'Unknown error'
}

/**
 * Inline error indicator. Click the icon to toggle the full JSON payload —
 * keeps the message tight by default and the full details one click away
 * for debugging. Used by chat and assistant flows where errors need to be
 * shown without taking over the layout.
 */
export default function ErrorBubble({ error }: ErrorBubbleProps) {
  const [showDetails, setShowDetails] = useState(false)
  const message = readMessage(error)

  return (
    <div className="relative w-full">
      <div className="flex items-start gap-1 p-2 rounded-lg bg-red-100 border border-red-400 text-red-800">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="btn-icon"
          aria-label="Show error details"
          title="Show error details"
        >
          <IconError className="w-5 h-5" />
        </button>
        <div className="mt-1 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold">An error occurred</p>
            </div>
          </div>

          {showDetails ? (
            <div className="mt-2 text-xs bg-white/70 border border-red-300 text-red-900 rounded p-2 overflow-auto max-h-52">
              <div className="mb-2 break-words break-all">{String(message)}</div>
              <pre className="whitespace-pre-wrap break-all">
                {(() => {
                  try {
                    return JSON.stringify(error, null, 2)
                  } catch {
                    return String(error)
                  }
                })()}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
