import { View } from 'react-native'

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

/** Native peer of the web `GroupLegLiveChecks`. */
export default function GroupLegLiveChecks({
  leg,
  picks,
  onChange,
  busy,
}: GroupLegLiveChecksProps) {
  const rows = groupLegLiveCheckRows(leg, picks)
  if (rows.length === 0) return null
  return (
    <View style={{ gap: 10 }}>
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
    </View>
  )
}
