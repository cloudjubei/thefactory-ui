import { Linking, View } from 'react-native'

import {
  TICKET_CHIP_DEFAULT_LAYOUT,
  type TicketChipLayout,
  type TicketChipView,
} from '../../../headless'
import { GroupStoryChip, GroupStoryToneBadge } from '../groupStories/GroupStoryBits'

export type TicketChipProps = {
  view: TicketChipView
  layout?: TicketChipLayout
}

/**
 * Native peer of [web's `TicketChip`](../../../web/compound/chips/TicketChip.tsx):
 * a ticket's key and status, opening it in Jira. With no status known it says the
 * key; with no web link it opens nothing.
 */
export default function TicketChip({ view, layout = TICKET_CHIP_DEFAULT_LAYOUT }: TicketChipProps) {
  const pill = layout === 'split' ? view.status : undefined
  const { url } = view
  const chip = (
    <GroupStoryChip
      label={pill ? view.key : view.label}
      tone={url ? 'ok' : 'neutral'}
      accessibilityLabel={`${view.label}. ${view.hint}`}
      {...(url ? { onPress: () => void Linking.openURL(url) } : {})}
    />
  )
  if (!pill) return chip
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {chip}
      <GroupStoryToneBadge tone="queued" label={pill} />
    </View>
  )
}
