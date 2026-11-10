import { Linking, View } from 'react-native'

import {
  TICKET_CHIP_DEFAULT_LAYOUT,
  type TicketChipLayout,
  type TicketChipView,
} from '../../../headless'
import { blue } from '../../../tokens'
import { IconJira } from '../../icons'
import { GroupStoryChip } from '../groupStories/GroupStoryBits'
import TicketStatusLozenge from './TicketStatusLozenge'

export type TicketChipProps = {
  view: TicketChipView
  layout?: TicketChipLayout
}

/**
 * Native peer of [web's `TicketChip`](../../../web/compound/chips/TicketChip.tsx):
 * Jira's mark, a ticket's key and status, opening it in Jira. With no status known it says the
 * key; with no web link it opens nothing.
 */
export default function TicketChip({ view, layout = TICKET_CHIP_DEFAULT_LAYOUT }: TicketChipProps) {
  const pill = layout === 'split' ? view.status : undefined
  const { url } = view
  const chip = (
    <GroupStoryChip
      label={pill ? view.key : view.label}
      tone={url ? 'ok' : 'neutral'}
      icon={<IconJira size={12} color={blue[500]} />}
      accessibilityLabel={`${view.label}. ${view.hint}`}
      {...(url ? { onPress: () => void Linking.openURL(url) } : {})}
    />
  )
  if (!pill) return chip
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {chip}
      <TicketStatusLozenge view={{ label: pill, tone: view.statusTone ?? 'unknown' }} />
    </View>
  )
}
