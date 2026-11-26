import { useEffect, useState, type ReactNode } from 'react'

/** Opens one view of a page by the button it offers, by its words or label, once it has drawn. */
export function Click({ label, children }: { label: string | undefined; children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!host || !label) return undefined
    const timer = setInterval(() => {
      const found = [...host.querySelectorAll('button,[role="button"]')].find(
        (el) => el.textContent === label || el.getAttribute('aria-label') === label,
      )
      if (found) {
        ;(found as HTMLElement).click()
        clearInterval(timer)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [host, label])
  return (
    <div ref={setHost} className="h-full">
      {children}
    </div>
  )
}

/** Presses several buttons of a page in order, each once it is offered after the one before it was pressed. */
export function ClickEach({
  labels,
  children,
}: {
  labels: readonly string[] | undefined
  children: ReactNode
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const joined = (labels ?? []).join('\n')
  useEffect(() => {
    if (!host || !joined) return undefined
    const wanted = joined.split('\n')
    let at = 0
    const timer = setInterval(() => {
      const label = wanted[at]
      const found = [...host.querySelectorAll('button,[role="button"]')].find(
        (el) => el.textContent === label || el.getAttribute('aria-label') === label,
      )
      if (!found) return
      ;(found as HTMLElement).click()
      at += 1
      if (at >= wanted.length) clearInterval(timer)
    }, 150)
    return () => clearInterval(timer)
  }, [host, joined])
  return (
    <div ref={setHost} className="h-full" style={{ height: '100%' }}>
      {children}
    </div>
  )
}
