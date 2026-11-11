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
