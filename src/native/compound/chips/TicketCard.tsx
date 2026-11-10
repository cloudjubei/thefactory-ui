import type { ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import {
  TICKET_CARD_DEFAULT_LAYOUT,
  TICKET_CARD_TEXT,
  ticketCardView,
  type TicketCardLayout,
  type TicketCardView,
  type TicketPreviewState,
} from '../../../headless'
import { blue } from '../../../tokens'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconJira } from '../../icons'
import Spinner from '../../primitives/Spinner'
import TicketStatusLozenge from './TicketStatusLozenge'

export type TicketKeyLinkProps = {
  ticketKey: string
  /** The ticket in Jira; without it the key is plain text. */
  url?: string | undefined
}

/** A ticket's key under Jira's mark, opening the ticket in Jira when its link is known. */
export function TicketKeyLink({ ticketKey, url }: TicketKeyLinkProps) {
  const { theme } = useNativeTheme()
  const words = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <IconJira size={14} color={blue[500]} />
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: '600',
          fontFamily: 'Menlo',
          color: theme.text.primary,
          textDecorationLine: url ? 'underline' : 'none',
        }}
      >
        {ticketKey}
      </Text>
    </View>
  )
  if (!url) return words
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${ticketKey}. ${TICKET_CARD_TEXT.open}`}
      hitSlop={8}
      onPress={() => void Linking.openURL(url)}
    >
      {words}
    </Pressable>
  )
}

export type TicketCardProps = {
  view: TicketCardView
  layout?: TicketCardLayout
}

/**
 * Native peer of [web's `TicketCard`](../../../web/compound/chips/TicketCard.tsx):
 * a ticket at a glance. The way to it in Jira is the key here and the button of
 * the sheet this sits in. Its text comes from Jira and stays plain text.
 */
export default function TicketCard({ view, layout = TICKET_CARD_DEFAULT_LAYOUT }: TicketCardProps) {
  const { theme } = useNativeTheme()
  const url = view.open?.url
  if (layout === 'compact') {
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <TicketKeyLink ticketKey={view.key} url={url} />
          {view.status ? <TicketStatusLozenge view={view.status} /> : null}
        </View>
        {view.title ? (
          <Text
            numberOfLines={2}
            style={{ fontSize: 13.5, fontWeight: '500', color: theme.text.primary }}
          >
            {view.title}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {[view.issueType, ...view.facts.map((fact) => fact.value)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    )
  }
  return (
    <View style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: blue[500] }} />
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <TicketKeyLink ticketKey={view.key} url={url} />
          {view.issueType ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.issueType}</Text>
          ) : null}
        </View>
        {view.title ? (
          <Text
            numberOfLines={3}
            style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}
          >
            {view.title}
          </Text>
        ) : null}
        {view.status ? (
          <View style={{ flexDirection: 'row' }}>
            <TicketStatusLozenge view={view.status} />
          </View>
        ) : null}
        <View style={{ gap: 4 }}>
          {view.facts.map((fact) => (
            <View key={fact.label} style={{ flexDirection: 'row', gap: nativeSpace[3] }}>
              <Text style={{ width: 74, fontSize: 13, color: theme.text.secondary }}>
                {fact.label}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{fact.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function Standing({ ticketKey, url, children }: TicketKeyLinkProps & { children: ReactNode }) {
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      <TicketKeyLink ticketKey={ticketKey} url={url} />
      {children}
    </View>
  )
}

export type TicketPreviewPanelProps = TicketKeyLinkProps & {
  state: TicketPreviewState
  layout?: TicketCardLayout
}

/**
 * Native peer of web's `TicketPreviewPanel`: what a ticket chip's sheet shows,
 * whatever the read has come to: that it is being read, the ticket's card, or
 * that it could not be read, the key and its link still there.
 */
export function TicketPreviewPanel({ ticketKey, url, state, layout }: TicketPreviewPanelProps) {
  const { theme, status } = useNativeTheme()
  if (state.kind === 'ready') {
    return <TicketCard view={ticketCardView(state.preview)} {...(layout ? { layout } : {})} />
  }
  if (state.kind === 'failed') {
    return (
      <Standing ticketKey={ticketKey} url={url}>
        <Text style={{ fontSize: 13, color: status.stuck.softFg }}>{state.reason}</Text>
      </Standing>
    )
  }
  return (
    <Standing ticketKey={ticketKey} url={url}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={TICKET_CARD_TEXT.loading}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Spinner size={12} color={theme.text.secondary} />
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {TICKET_CARD_TEXT.loading}
        </Text>
      </View>
    </Standing>
  )
}
