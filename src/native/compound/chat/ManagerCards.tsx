import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type {
  ProcessManagerBriefCard,
  ProcessManagerChatCard,
  ProcessManagerEscalationCard,
  ProcessManagerInterventionCard,
  ProcessManagerPreReadCard,
  ReferenceTarget,
  ResourceLink,
} from 'thefactory-tools/types'
import { useManagerCardStanding } from '../../../headless/hooks/useManagerCardStanding'
import type {
  ManagerInterventionStanding,
  ManagerPreReadStanding,
} from '../../../headless/utils/managerCardsTypes'
import type { ParkStanding } from '../../../headless/utils/processParkStandingTypes'
import {
  MANAGER_BRIEF_ANSWERS,
  MANAGER_BRIEF_HIDE_WORDS,
  MANAGER_BRIEF_SHOW_WORDS,
  MANAGER_BRIEF_STOPPED,
  MANAGER_BRIEF_TO_AGENT,
  MANAGER_BRIEF_TRIED,
  MANAGER_ESCALATION_FOUND,
  MANAGER_ESCALATION_HIDE_DETAIL,
  MANAGER_ESCALATION_RECOMMENDS,
  MANAGER_ESCALATION_SHOW_DETAIL,
  MANAGER_ESCALATION_TRIED,
  MANAGER_OUTCOME_DID,
  MANAGER_OUTCOME_HIDE_WORDS,
  MANAGER_OUTCOME_LEFT_YOU,
  MANAGER_OUTCOME_RESULT,
  MANAGER_OUTCOME_SHOW_WORDS,
  MANAGER_OUTCOME_STILL_OPEN,
  MANAGER_OUTCOME_WHY,
} from '../../../headless/utils/managerCardsConstants'
import {
  managerBriefView,
  managerEscalationView,
  managerOutcomeView,
} from '../../../headless/utils/managerCards'
import { nativeRadii } from '../../../tokens/native'
import { CirclingNotice } from '../process/CirclingNotice'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  IconAgent,
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconWarningTriangle,
} from '../../icons'
import Markdown from '../Markdown'
import ParkClosureLine from './ParkClosureLine'

/** How a manager card renders references and in-app links in what it quotes. */
export type ManagerCardLinks = {
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  onResourceLink?: (link: ResourceLink) => void
}

const MONO = { fontFamily: 'Menlo' } as const

function Pill({ tone, children }: { tone: 'handled' | 'needs-you'; children: string }) {
  const { status } = useNativeTheme()
  const t = tone === 'needs-you' ? status.on_hold : status.empty
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: t.softBorder,
        backgroundColor: t.softBg,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', lineHeight: 18, color: t.softFg }}>
        {children}
      </Text>
    </View>
  )
}

function Caption({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.secondary,
      }}
    >
      {children}
    </Text>
  )
}

function Quote({ text, links }: { text: string; links: ManagerCardLinks }) {
  return (
    <Markdown
      text={text}
      onResourceLink={links.onResourceLink}
      renderReference={links.renderReference}
      typedReferences
    />
  )
}

function Toggle({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6}>
      <Text style={{ fontSize: 12.5, color: theme.accent.primary }}>{label}</Text>
    </Pressable>
  )
}

/** Native peer of web's `ManagerStopLine`. */
export function ManagerStopLine({ card }: { card: ProcessManagerBriefCard }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }} />
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {managerBriefView(card).stopLine}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border.subtle }} />
    </View>
  )
}

/** Native peer of web's `ManagerBriefCardView`. */
export function ManagerBriefCardView({
  card,
  words,
  links,
}: {
  card: ProcessManagerBriefCard
  words?: string
  links: ManagerCardLinks
}) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const [showWords, setShowWords] = useState(false)
  const view = managerBriefView(card)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}
      >
        <IconAgent size={13} color={theme.text.secondary} />
        <Text style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>
            {MANAGER_BRIEF_TO_AGENT}
          </Text>
          {` · ${view.line}`}
        </Text>
        <Pill tone="handled">{view.mode}</Pill>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={12} color={theme.text.secondary} />
        </View>
      </Pressable>
      {open ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            padding: 12,
            paddingLeft: 34,
            gap: 12,
          }}
        >
          {view.circling ? <CirclingNotice view={view.circling} /> : null}
          <View style={{ gap: 6 }}>
            <Caption>{MANAGER_BRIEF_STOPPED}</Caption>
            <Text style={{ fontSize: 13, color: theme.text.primary }}>{view.stopped}</Text>
            {view.failed.map((f) => (
              <Text key={f} style={{ ...MONO, fontSize: 11.5, color: theme.text.secondary }}>
                {f}
              </Text>
            ))}
          </View>
          <View style={{ gap: 6 }}>
            <Caption>{MANAGER_BRIEF_ANSWERS}</Caption>
            {view.answers.map((a) => (
              <Text key={a.key} style={{ fontSize: 12.5, color: theme.text.secondary }}>
                <Text style={{ ...MONO, fontSize: 11.5, color: theme.text.primary }}>{a.key}</Text>
                {`  ${a.label}`}
              </Text>
            ))}
          </View>
          <View style={{ gap: 6 }}>
            <Caption>{MANAGER_BRIEF_TRIED}</Caption>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.tried}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: nativeRadii.round,
                  backgroundColor: theme.surface.muted,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.round(view.triesShare * 100)}%`,
                    height: '100%',
                    backgroundColor: status.on_hold.bg,
                  }}
                />
              </View>
              <Text style={{ ...MONO, fontSize: 12, color: theme.text.secondary }}>
                {view.tries}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{view.limits}</Text>
          </View>
          {words ? (
            <View style={{ gap: 8 }}>
              <Toggle
                label={showWords ? MANAGER_BRIEF_HIDE_WORDS : MANAGER_BRIEF_SHOW_WORDS}
                onPress={() => setShowWords((s) => !s)}
              />
              {showWords ? <Quote text={words} links={links} /> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** Native peer of web's `ManagerOutcomeCardView`. */
export function ManagerOutcomeCardView({
  card,
  standing,
  reply,
  at,
  links,
}: {
  card: ProcessManagerInterventionCard | ProcessManagerPreReadCard
  standing?: ManagerInterventionStanding | ManagerPreReadStanding
  reply?: string
  at?: string
  links: ManagerCardLinks
}) {
  const { theme, status } = useNativeTheme()
  const [showReply, setShowReply] = useState(false)
  const view = managerOutcomeView(card, standing)
  const needsYou = view.tone === 'needs-you'
  const icon = needsYou ? status.on_hold : status.done
  const section = {
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    paddingVertical: 8,
    paddingRight: 14,
    paddingLeft: 54,
  } as const
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: needsYou ? status.on_hold.softBorder : theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: icon.softBg,
          }}
        >
          {needsYou ? (
            <IconClipboardCheck size={15} color={icon.softFg} />
          ) : (
            <IconCheck size={15} color={icon.softFg} />
          )}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text.primary }}>
              {view.headline}
            </Text>
            <Pill tone={view.tone}>{view.pill}</Pill>
            {at ? (
              <Text style={{ marginLeft: 'auto', fontSize: 11.5, color: theme.text.secondary }}>
                {at}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>
              {MANAGER_OUTCOME_WHY}
            </Text>
            {` ${view.why}`}
          </Text>
          {view.result ? (
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              <Text style={{ fontWeight: '600', color: theme.text.primary }}>
                {MANAGER_OUTCOME_RESULT}
              </Text>
              {` ${view.result}`}
            </Text>
          ) : null}
          {view.closure ? <ParkClosureLine closure={view.closure} /> : null}
        </View>
      </View>
      {view.open.length > 0 ? (
        <View style={{ ...section, gap: 8 }}>
          <Caption>
            {view.tone === 'needs-you' ? MANAGER_OUTCOME_STILL_OPEN : MANAGER_OUTCOME_LEFT_YOU}
          </Caption>
          {view.open.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', gap: 10 }}>
              {item.settled || view.closure ? (
                <View style={{ marginTop: 2 }}>
                  <IconCheck size={13} color={theme.text.secondary} />
                </View>
              ) : (
                <View
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: status.on_hold.bg,
                  }}
                />
              )}
              <View style={{ flex: 1, opacity: item.settled || view.closure ? 0.75 : 1 }}>
                <Quote text={item.text} links={links} />
                {item.settled ? (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>{item.settled}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ ...section, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {`${MANAGER_OUTCOME_DID} `}
          <Text style={{ ...MONO, fontSize: 11.5, color: theme.text.primary }}>{view.did}</Text>
        </Text>
        {reply ? (
          <Toggle
            label={showReply ? MANAGER_OUTCOME_HIDE_WORDS : MANAGER_OUTCOME_SHOW_WORDS}
            onPress={() => setShowReply((s) => !s)}
          />
        ) : null}
      </View>
      {reply && showReply ? (
        <View style={section}>
          <Quote text={reply} links={links} />
        </View>
      ) : null}
    </View>
  )
}

/** Native peer of web's `ManagerEscalationCardView`. */
export function ManagerEscalationCardView({
  card,
  standing,
  links,
  children,
}: {
  card: ProcessManagerEscalationCard
  standing?: ParkStanding
  links: ManagerCardLinks
  children?: ReactNode
}) {
  const { theme, status } = useNativeTheme()
  const [showDetail, setShowDetail] = useState(false)
  const view = managerEscalationView(card, standing)
  const closure = view.closure
  const detail = (
    <>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {MANAGER_ESCALATION_FOUND}
        </Text>
        <Quote text={view.found} links={links} />
      </View>
      {view.tried.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {MANAGER_ESCALATION_TRIED}
          </Text>
          {view.tried.map((t) => (
            <Text key={t} style={{ fontSize: 13, color: theme.text.secondary }}>
              {`– ${t}`}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {MANAGER_ESCALATION_RECOMMENDS}
        </Text>
        <Quote text={view.recommendation} links={links} />
      </View>
    </>
  )
  if (closure) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          backgroundColor: theme.surface.raised,
          overflow: 'hidden',
        }}
      >
        <ParkClosureLine closure={closure} banner />
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.secondary }}>
            {view.headline}
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.what}</Text>
          <Toggle
            label={showDetail ? MANAGER_ESCALATION_HIDE_DETAIL : MANAGER_ESCALATION_SHOW_DETAIL}
            onPress={() => setShowDetail((s) => !s)}
          />
          {showDetail ? detail : null}
        </View>
      </View>
    )
  }
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: status.on_hold.bg,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: status.on_hold.softBg,
        }}
      >
        <IconWarningTriangle size={15} color={status.on_hold.softFg} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.on_hold.softFg }}>
          {view.title}
        </Text>
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text.primary }}>
          {view.headline}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.what}</Text>
        {detail}
        {children}
      </View>
    </View>
  )
}

/** Native peer of web's `ManagerCardView`: read live off the run it was posted for. */
export function ManagerCardView({
  card,
  processRunId,
  at,
  reply,
  links,
  children,
}: {
  card: Exclude<ProcessManagerChatCard, ProcessManagerBriefCard>
  processRunId?: string
  at?: string
  reply?: string
  links: ManagerCardLinks
  children?: ReactNode
}) {
  const live = useManagerCardStanding(card, processRunId)
  if (card.kind === 'escalation') {
    return (
      <ManagerEscalationCardView
        card={card}
        {...(live.kind === 'escalation' ? { standing: live.standing } : {})}
        links={links}
      >
        {children}
      </ManagerEscalationCardView>
    )
  }
  return (
    <ManagerOutcomeCardView
      card={card}
      {...(live.kind !== 'escalation' ? { standing: live.standing } : {})}
      {...(at ? { at } : {})}
      {...(reply ? { reply } : {})}
      links={links}
    />
  )
}
