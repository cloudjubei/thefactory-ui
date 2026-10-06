import { useState } from 'react'
import type { CredentialHelp } from '../../../headless/utils/credentialCaptureTypes'
import { IconChevron, IconExternalLink, IconInfo } from '../../icons'

export interface CredentialHelpPanelProps {
  help: CredentialHelp
}

/**
 * "How do I get this?" under a credential form: the page that issues the
 * secret, one click away, and the steps to take there behind a toggle so the
 * form stays short for a user who already knows.
 */
export default function CredentialHelpPanel({ help }: CredentialHelpPanelProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border border-(--border-subtle) bg-(--surface-base) text-[12px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-medium text-(--text-primary)"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <IconInfo className="w-3.5 h-3.5 shrink-0 text-(--accent-primary)" />
          <span className="min-w-0">{help.title}</span>
          <IconChevron
            className="w-3.5 h-3.5 shrink-0 transition-transform"
            style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
          />
        </button>
        {help.link ? (
          <a
            href={help.link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-(--accent-primary) underline"
          >
            {help.link.label}
            <IconExternalLink className="w-3 h-3" />
          </a>
        ) : null}
      </div>
      {open ? (
        <ol className="list-decimal border-t border-(--border-subtle) py-2 pr-2 pl-6 flex flex-col gap-1 text-(--text-secondary)">
          {help.steps.map((step) => (
            <li key={step} className="wrap-break-word">
              {step}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
