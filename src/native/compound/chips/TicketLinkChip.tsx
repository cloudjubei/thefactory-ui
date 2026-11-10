import { useState } from 'react'
import { Linking, Text } from 'react-native'
import {
  TICKET_CARD_TEXT,
  useTicketPreview,
  type TicketCardLayout,
  type TicketLink,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { TicketPreviewPanel } from './TicketCard'

export type TicketLinkChipProps = {
  link: TicketLink
  /** How the preview card is laid out. */
  layout?: TicketCardLayout
  /** Start with the preview open: a showcase's way to show the sheet. */
  initialOpen?: boolean
}

function TicketLinkSheet({
  link,
  layout,
  onClose,
}: Pick<TicketLinkChipProps, 'link' | 'layout'> & { onClose: () => void }) {
  const state = useTicketPreview(link.key, true)
  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={link.key}
      footer={
        <Button
          variant="primary"
          onPress={() => {
            onClose()
            void Linking.openURL(link.url)
          }}
        >
          {TICKET_CARD_TEXT.open}
        </Button>
      }
    >
      <TicketPreviewPanel
        ticketKey={link.key}
        url={link.url}
        state={state}
        {...(layout ? { layout } : {})}
      />
    </BottomSheet>
  )
}

/**
 * Native peer of [web's `TicketLinkChip`](../../../web/compound/chips/TicketLinkChip.tsx):
 * a link to a ticket on the chat's Jira site, inline in the text. There is no
 * hover on a phone, so a press opens the ticket's preview in a sheet, read the
 * first time it opens and kept for the session, with Open in Jira inside. A
 * ticket that could not be read says so, and the button still opens it.
 */
export default function TicketLinkChip({ link, layout, initialOpen = false }: TicketLinkChipProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <Text
        accessibilityRole="button"
        accessibilityLabel={TICKET_CARD_TEXT.preview(link.key)}
        onPress={() => setOpen(true)}
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: theme.accent.primary,
          backgroundColor: theme.surface.muted,
          borderRadius: nativeRadii[2],
        }}
      >
        {` ${link.key} `}
      </Text>
      {open ? (
        <TicketLinkSheet
          link={link}
          onClose={() => setOpen(false)}
          {...(layout ? { layout } : {})}
        />
      ) : null}
    </>
  )
}
