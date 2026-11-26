import {
  RECORDING_SITES_TEXT as TEXT,
  useRecordingSites,
  type RecordingSiteRowView,
  type RecordingSitesView,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type RecordingSitesPanelProps = {
  view: RecordingSitesView
  /** Open a site's sign-in window on the backend's machine. */
  onSignIn: (siteId: string) => void
}

const MUTED = 'm-0 text-[12.5px] text-(--text-secondary)'

/**
 * The person's sign-ins to the sites colleagues share recordings on, in the
 * group's Settings: a row per site with how its sign-in stands and the button
 * that opens its sign-in window on the backend's machine. The row reads as
 * signing in the moment the button is pressed and until the window closes.
 */
export function RecordingSitesPanel({ view, onSignIn }: RecordingSitesPanelProps) {
  return (
    <section aria-label={TEXT.heading} className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">{TEXT.heading}</h3>
        <p className="m-0 text-sm text-(--text-secondary)">{TEXT.intro}</p>
      </div>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.loading ? <p className={MUTED}>{TEXT.loading}</p> : null}
      {!view.loading && !view.readError && view.sites.length === 0 ? (
        <p className={MUTED}>{TEXT.none}</p>
      ) : null}
      {view.sites.length > 0 ? (
        <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle) p-0">
          {view.sites.map((site) => (
            <SiteRow key={site.id} site={site} onSignIn={onSignIn} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SiteRow({
  site,
  onSignIn,
}: {
  site: RecordingSiteRowView
  onSignIn: RecordingSitesPanelProps['onSignIn']
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2 px-3 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{site.name}</span>
        <ToneBadge tone={site.tone}>{site.stateLabel}</ToneBadge>
        {site.checked ? (
          <span className="text-[12px] text-(--text-muted)">{site.checked}</span>
        ) : null}
        <Button
          size="sm"
          variant={site.primary ? 'primary' : 'ghost'}
          className="ml-auto"
          aria-label={site.action}
          loading={site.signingIn}
          onClick={() => onSignIn(site.id)}
        >
          {site.action}
        </Button>
      </div>
      {site.hint ? <p className={MUTED}>{site.hint}</p> : null}
      {site.error ? <Alert>{site.error}</Alert> : null}
    </li>
  )
}

/** {@link RecordingSitesPanel} on the person's live sign-ins, placed in Settings → Group. */
export default function GroupRecordingsSettings() {
  const recordings = useRecordingSites()
  return <RecordingSitesPanel view={recordings.view} onSignIn={recordings.signIn} />
}
