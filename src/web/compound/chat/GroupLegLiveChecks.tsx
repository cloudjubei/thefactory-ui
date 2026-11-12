import {
  groupLegLiveCheckRows,
  type GroupLaunchLiveCheckPicks,
  type GroupLegLiveCheckOffer,
  type LiveCheckDraft,
} from '../../../headless'
import LaunchLiveCheckRow from './LaunchLiveCheckRow'

export type GroupLegLiveChecksProps = {
  leg: { projectId: string; liveCheckOffers?: readonly GroupLegLiveCheckOffer[] }
  picks: GroupLaunchLiveCheckPicks
  onChange: (featureId: string, change: Partial<LiveCheckDraft>) => void
  busy?: boolean
}

/**
 * One group leg's "Live check" rows: one per feature the preview offers a
 * live check for, named by the feature. Nothing for a leg offered none.
 * Native peer: `native/compound/chat/GroupLegLiveChecks`.
 */
export default function GroupLegLiveChecks({
  leg,
  picks,
  onChange,
  busy,
}: GroupLegLiveChecksProps) {
  const rows = groupLegLiveCheckRows(leg, picks)
  if (rows.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <LaunchLiveCheckRow
          key={row.featureId}
          view={row.view}
          title={row.title}
          projectId={leg.projectId}
          {...(busy !== undefined ? { busy } : {})}
          onChange={(change) => onChange(row.featureId, change)}
        />
      ))}
    </div>
  )
}
