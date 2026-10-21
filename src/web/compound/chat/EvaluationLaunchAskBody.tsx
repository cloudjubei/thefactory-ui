import { EVALUATION_LAUNCH_ASK } from '../../../headless/utils/evaluationLaunchAskViewConstants'
import type { EvaluationLaunchAskBodyView } from '../../../headless/utils/evaluationLaunchAskViewTypes'

export type EvaluationLaunchAskBodyProps = {
  body: EvaluationLaunchAskBodyView
}

const BOX = 'flex flex-col gap-2 rounded-lg border border-(--border-subtle) px-3 py-2.5'
const HEADING = 'text-[11.5px] font-semibold tracking-wide text-(--text-muted) uppercase'
const CHIP =
  'rounded-md border border-(--border-default) px-2 py-0.5 font-mono text-[12px] text-(--text-primary)'

/**
 * An evaluation launch on its approval card: a mixed-builds warning first when the ledger would mix
 * builds, every resolved setting with where it came from — a capped one with what capped it — the
 * run it matched, and what its dry run says it would do — the ledger, the work by capability, and
 * the build that would run.
 */
export default function EvaluationLaunchAskBody({ body }: EvaluationLaunchAskBodyProps) {
  const preview = body.preview
  return (
    <div className="flex flex-col gap-2">
      {preview?.mixedBuilds ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-(--status-blocked-soft-border) bg-(--status-blocked-soft-bg) px-3 py-2.5"
        >
          <span className="text-[12.5px] font-bold tracking-wide text-(--status-blocked-soft-fg) uppercase">
            {preview.mixedBuilds.title}
          </span>
          <span className="text-[12.5px] text-(--text-primary)">{preview.mixedBuilds.detail}</span>
        </div>
      ) : null}

      <div className={BOX}>
        <span className={HEADING}>{EVALUATION_LAUNCH_ASK.settings}</span>
        <dl className="m-0 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1.5 text-[12.5px]">
          {body.settings.map((row) => (
            <div key={row.key} className="contents">
              <dt className="text-(--text-secondary)">{row.label}</dt>
              <dd className="m-0 flex min-w-0 flex-col">
                <span className="font-semibold wrap-break-word text-(--text-primary)">
                  {row.value}
                </span>
                {row.detail ? (
                  <span className="text-[12px] wrap-break-word text-(--text-muted)">
                    {row.detail}
                  </span>
                ) : null}
                {row.capped ? (
                  <span className="text-[12px] wrap-break-word text-(--status-stuck-soft-fg)">
                    {row.capped}
                  </span>
                ) : null}
              </dd>
              <span className="text-[11.5px] text-(--text-muted)">{row.source ?? ''}</span>
            </div>
          ))}
        </dl>
        {body.matchActivityId ? (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="text-(--text-secondary)">{EVALUATION_LAUNCH_ASK.matched}</span>
            <span className={CHIP}>{body.matchActivityId}</span>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className={BOX}>
          <span
            className={`text-[13px] font-semibold ${
              preview.rewritesLedger ? 'text-(--status-blocked-soft-fg)' : 'text-(--text-primary)'
            }`}
          >
            {preview.ledger}
          </span>
          {preview.covered ? (
            <span className="text-[12.5px] font-semibold text-(--status-done-soft-fg)">
              {preview.covered}
            </span>
          ) : null}
          <span className="text-[12.5px] text-(--text-secondary)">{preview.totals}</span>
          {preview.capabilities.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[12px]">
              {preview.capabilities.map((c) => (
                <li key={c.capability} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-(--text-primary)">{c.label}</span>
                  <span className="shrink-0 text-(--text-muted) tabular-nums">{c.work}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {preview.unavailable ? (
            <span className="text-[12.5px] text-(--status-stuck-soft-fg)">
              {preview.unavailable}
            </span>
          ) : null}
          {preview.unknownFocus ? (
            <span className="text-[12.5px] text-(--status-stuck-soft-fg)">
              {preview.unknownFocus}
            </span>
          ) : null}
          {preview.buildHeading && preview.builds.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className={HEADING}>{preview.buildHeading}</span>
              {preview.builds.map((b) => (
                <div key={b.name} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-(--text-primary)">{b.name}</span>
                  {b.at ? <span className={CHIP}>{b.at}</span> : null}
                  {b.dirty ? (
                    <span className="font-semibold text-(--status-stuck-soft-fg)">
                      {EVALUATION_LAUNCH_ASK.uncommitted}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {preview.error ? (
            <span className="text-[12.5px] text-(--status-stuck-soft-fg)">{preview.error}</span>
          ) : null}
        </div>
      ) : body.previewUnavailable ? (
        <div className="rounded-lg border border-(--border-subtle) bg-(--surface-muted) px-3 py-2.5 text-[12.5px] text-(--text-secondary)">
          {body.previewUnavailable}
        </div>
      ) : null}
    </div>
  )
}
