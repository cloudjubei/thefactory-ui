import type { MouseEvent } from 'react'

import {
  processTryBuildLinkExpired,
  qrCodePath,
  useProcessTryBuild,
  type ProcessTryBuildDisplay,
  type ProcessTryBuildTone,
} from '../../../../headless'
import { IconDownload, IconMobile } from '../../../icons'

export type ProcessTryBuildCardProps = {
  /** The run at its sign-off whose phone build this is. */
  runId: string
}

export type ProcessTryBuildPanelProps = {
  display: ProcessTryBuildDisplay
  /** Read fresh links and start the download, for a press after the link stopped working. */
  onRefreshLink?: () => void
}

const TONE_CLASS: Record<ProcessTryBuildTone, string> = {
  working: 'text-(--status-working-soft-fg)',
  done: 'text-(--status-done-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  muted: 'text-(--text-secondary)',
}

/**
 * "Try it on your phone" on a run's sign-off: the run's head built in the app's everyday variant,
 * to download or scan, with what to check and that it runs on the person's own test account.
 * Hidden when the run offers no phone build.
 */
export default function ProcessTryBuildCard({ runId }: ProcessTryBuildCardProps) {
  const { display, refresh } = useProcessTryBuild(runId)
  if (!display) return null
  return (
    <ProcessTryBuildPanel
      display={display}
      onRefreshLink={() => {
        void refresh().then((next) => {
          if (next?.download) window.location.assign(next.download.href)
        })
      }}
    />
  )
}

/** The block itself, from its laid-out view — what the connected card and the showcase both draw. */
export function ProcessTryBuildPanel({ display, onRefreshLink }: ProcessTryBuildPanelProps) {
  const { download, qr, checks } = display
  const onDownload = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onRefreshLink || !processTryBuildLinkExpired(download, Date.now())) return
    event.preventDefault()
    onRefreshLink()
  }

  return (
    <section
      aria-label={display.title}
      className="flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4"
    >
      <div className="flex min-w-0 items-start gap-2">
        <IconMobile className="mt-0.5 h-4 w-4 shrink-0 text-(--text-secondary)" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="text-[14px] font-semibold text-(--text-primary)">{display.title}</div>
          <div className={`text-[12.5px] font-medium ${TONE_CLASS[display.tone]}`}>
            {display.headline}
          </div>
          {display.detail ? (
            <div className="wrap-break-word text-[12px] text-(--text-secondary)">
              {display.detail}
            </div>
          ) : null}
        </div>
      </div>

      {download || qr ? (
        <div className="flex flex-wrap items-end gap-4">
          {qr ? <QrCode value={qr.value} caption={qr.caption} /> : null}
          {download ? (
            <a
              className="btn btn-primary btn-sm inline-flex items-center gap-2"
              href={download.href}
              {...(download.fileName ? { download: download.fileName } : { download: true })}
              onClick={onDownload}
            >
              <IconDownload className="h-3.5 w-3.5" />
              {download.label}
            </a>
          ) : null}
        </div>
      ) : null}

      {checks.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-[12.5px] font-semibold text-(--text-primary)">
            {display.stepsTitle}
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {checks.map((check) => (
              <li key={check.title} className="flex flex-col gap-0.5 text-[12px]">
                <span className="font-medium text-(--text-primary)">{check.title}</span>
                {check.openLine ? (
                  <span className="text-(--text-secondary)">{check.openLine}</span>
                ) : null}
                {check.steps.length > 0 ? (
                  <ol className="m-0 list-decimal pl-5 text-(--text-secondary)">
                    {check.steps.map((step, i) => (
                      <li key={`${i}-${step}`}>{step}</li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {display.accountNote ? (
        <div className="text-[11.5px] text-(--text-tertiary)">{display.accountNote}</div>
      ) : null}
    </section>
  )
}

function QrCode({ value, caption }: { value: string; caption: string }) {
  const code = qrCodePath(value)
  if (!code) return null
  return (
    <figure className="m-0 flex flex-col items-start gap-1">
      <svg
        role="img"
        aria-label={caption}
        viewBox={code.viewBox}
        shapeRendering="crispEdges"
        className="h-36 w-36 rounded-md bg-white text-black"
      >
        <path d={code.path} fill="currentColor" />
      </svg>
      <figcaption className="text-[11.5px] text-(--text-tertiary)">{caption}</figcaption>
    </figure>
  )
}
