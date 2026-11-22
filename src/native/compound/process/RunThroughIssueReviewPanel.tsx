import { useEffect, useState, type ReactNode } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'

import {
  RUN_THROUGH_ISSUE_CHOICES,
  RUN_THROUGH_REVIEW_COPY,
  useReviewEvidenceImage,
  type EvidenceTile,
  type RunThroughIssueChoice,
  type RunThroughIssueCurrent,
  type RunThroughIssueDot,
  type RunThroughIssueReviewView,
  type RunThroughIssueStanding,
  type UseRunThroughIssueReview,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconArrowLeftMini, IconArrowRightMini, IconChat, IconCheck, IconClose } from '../../icons'
import { Button } from '../../primitives/Button'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import { Textarea } from '../../primitives/Textarea'
import EvidenceReferenceChip from '../chips/EvidenceReferenceChip'
import ToneBadge from '../chips/ToneBadge'
import Pill from './signoff/Pill'

export type RunThroughIssueReviewPanelProps = {
  review: Pick<
    UseRunThroughIssueReview,
    'view' | 'isOpen' | 'close' | 'goTo' | 'move' | 'answer' | 'finish' | 'finishing'
  >
  projectId: string
  /** The app's project, where the fixes are made. */
  projectName: string
  /** The run's recording, for each issue's moment in it. */
  recording?: EvidenceTile
  /** Open the run's chat to talk an issue over. */
  onDiscuss?: () => void
  /** Safe-area insets supplied by the host. */
  topInset?: number
  bottomInset?: number
}

function useDotStyle() {
  const { theme } = useNativeTheme()
  return (standing: RunThroughIssueStanding) => {
    const fill =
      standing === 'open'
        ? 'transparent'
        : standing === 'not-an-issue'
          ? theme.text.muted
          : theme.accent.primary
    return {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: standing === 'open' ? theme.border.strong : fill,
      backgroundColor: fill,
    }
  }
}

function Dots({
  dots,
  onPick,
}: {
  dots: readonly RunThroughIssueDot[]
  onPick: (index: number) => void
}) {
  const { theme } = useNativeTheme()
  const dotStyle = useDotStyle()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {dots.map((dot) => (
        <Pressable
          key={dot.key}
          accessibilityRole="button"
          accessibilityLabel={dot.label}
          accessibilityState={{ selected: dot.current }}
          onPress={() => onPick(dot.index)}
          style={{
            width: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            borderWidth: 2,
            borderColor: dot.current ? theme.accent.primary : 'transparent',
          }}
        >
          <View
            style={{
              padding: dot.standing === 'reply' ? 1.5 : 0,
              borderRadius: 7,
              borderWidth: dot.standing === 'reply' ? 1.5 : 0,
              borderColor: theme.accent.primary,
            }}
          >
            <View style={dotStyle(dot.standing)} />
          </View>
        </Pressable>
      ))}
    </View>
  )
}

function Label({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function Section({ label, text }: { label: string; text: string | undefined }) {
  const { theme } = useNativeTheme()
  if (!text) return null
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <Text style={{ fontSize: 13.5, lineHeight: 20, color: theme.text.primary }}>{text}</Text>
    </View>
  )
}

function Shot({
  projectId,
  current,
  recording,
}: {
  projectId: string
  current: RunThroughIssueCurrent
  recording: EvidenceTile | undefined
}) {
  const { theme } = useNativeTheme()
  const { row } = current
  const tile = row.screenshot
  const fetched = useReviewEvidenceImage(
    tile && !tile.dataUri ? projectId : undefined,
    tile?.ref.id,
    tile?.ref.mediaType,
  )
  const dataUri = tile?.dataUri ?? fetched.dataUri
  const atRecording = recording !== undefined && row.atSec !== undefined
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 16 / 10,
          overflow: 'hidden',
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dataUri ? (
          <Image
            accessibilityLabel={row.title}
            source={{ uri: dataUri }}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : tile ? null : (
          <Text style={{ fontSize: 12.5, color: '#ffffffb3', paddingHorizontal: 24 }}>
            {RUN_THROUGH_REVIEW_COPY.noShot}
          </Text>
        )}
        {row.time ? (
          <Text
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: '#000000bf',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {row.time}
          </Text>
        ) : null}
      </View>
      {atRecording || tile ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <EvidenceReferenceChip
            link={
              atRecording
                ? { kind: 'evidence', projectId, evidenceId: recording.ref.id, at: row.atSec }
                : { kind: 'evidence', projectId, evidenceId: row.key }
            }
          />
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {atRecording ? RUN_THROUGH_REVIEW_COPY.moment : RUN_THROUGH_REVIEW_COPY.shotOnly}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function KeyBox({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        minWidth: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.base,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary }}>
        {children}
      </Text>
    </View>
  )
}

function ChoiceButton({
  choice,
  chosen,
  onPick,
}: {
  choice: RunThroughIssueChoice
  chosen: boolean
  onPick: () => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onPick}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: nativeRadii[3],
        borderWidth: chosen ? 2 : 1,
        borderColor: chosen ? theme.accent.primary : theme.border.default,
        backgroundColor: chosen
          ? theme.accent.softBg
          : pressed
            ? theme.surface.hover
            : theme.surface.raised,
      })}
    >
      <KeyBox>{choice.key}</KeyBox>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {choice.label}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{choice.detail}</Text>
      </View>
      {chosen ? <IconCheck size={16} color={theme.accent.primary} /> : null}
    </Pressable>
  )
}

function IssueScreen({
  current,
  projectId,
  recording,
  replying,
  onReplying,
  onAnswer,
  onDiscuss,
}: {
  current: RunThroughIssueCurrent
  projectId: string
  recording: EvidenceTile | undefined
  replying: boolean
  onReplying: (on: boolean) => void
  onAnswer: (choice: RunThroughIssueChoice['id'], note?: string) => void
  onDiscuss: (() => void) | undefined
}) {
  const { theme } = useNativeTheme()
  const { row } = current
  const [draft, setDraft] = useState(current.note ?? '')
  useEffect(() => setDraft(current.note ?? ''), [row.key, current.note])
  const chosen = (id: RunThroughIssueChoice['id']) =>
    id === 'reply'
      ? current.standing === 'reply' || replying
      : !replying &&
        (id === 'fix' ? current.standing === 'fix' : current.standing === 'not-an-issue')
  return (
    <View style={{ gap: 16, padding: 16 }}>
      <Shot projectId={projectId} current={current} recording={recording} />
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pill tone={row.tone} label={row.severity} />
          <Text style={{ fontSize: 12.5, color: theme.text.muted }}>
            {RUN_THROUGH_REVIEW_COPY.number(current.number)}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 18, fontWeight: '600', lineHeight: 24, color: theme.text.primary }}
        >
          {row.title}
        </Text>
        <Section label={RUN_THROUGH_REVIEW_COPY.happened} text={row.happened} />
        <Section label={RUN_THROUGH_REVIEW_COPY.expected} text={row.expected} />
        <View style={{ gap: 8, paddingTop: 4 }}>
          {RUN_THROUGH_ISSUE_CHOICES.map((choice) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              chosen={chosen(choice.id)}
              onPick={() => (choice.id === 'reply' ? onReplying(true) : onAnswer(choice.id))}
            />
          ))}
        </View>
        {replying ? (
          <View style={{ gap: 8 }}>
            <Textarea
              autoFocus
              rows={3}
              accessibilityLabel={RUN_THROUGH_REVIEW_COPY.replyLabel}
              placeholder={RUN_THROUGH_REVIEW_COPY.replyPlaceholder}
              value={draft}
              onChangeText={setDraft}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button size="sm" variant="ghost" onPress={() => onReplying(false)}>
                {RUN_THROUGH_REVIEW_COPY.cancel}
              </Button>
              <Button
                size="sm"
                disabled={!draft.trim()}
                onPress={() => draft.trim() && onAnswer('reply', draft)}
              >
                {RUN_THROUGH_REVIEW_COPY.save}
              </Button>
            </View>
          </View>
        ) : current.note ? (
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: theme.accent.primary,
              backgroundColor: theme.accent.softBg,
              borderRadius: nativeRadii[2],
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.primary }}>
              {current.note}
            </Text>
          </View>
        ) : null}
        {onDiscuss ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDiscuss}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 }}
          >
            <IconChat size={14} color={theme.text.secondary} />
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.secondary }}>
              {RUN_THROUGH_REVIEW_COPY.discuss}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function SummaryScreen({
  view,
  onPick,
}: {
  view: RunThroughIssueReviewView
  onPick: (index: number) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 16, padding: 16 }}>
      {view.groups.map((group) => (
        <View key={group.answer} style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {group.heading}
          </Text>
          {group.rows.map((r) => (
            <View key={r.row.key} style={{ gap: 4 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onPick(r.index)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
                })}
              >
                <Pill tone={r.row.tone} label={r.row.severity} />
                <Text
                  style={{ fontSize: 12, color: theme.text.muted, fontVariant: ['tabular-nums'] }}
                >
                  {r.number}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 13, color: theme.text.primary }}
                >
                  {r.row.title}
                </Text>
                <ToneBadge tone={r.tone} label={r.badge} />
              </Pressable>
              {r.note ? (
                <Text
                  style={{
                    paddingHorizontal: 12,
                    fontSize: 12.5,
                    fontStyle: 'italic',
                    color: theme.text.secondary,
                  }}
                >
                  “{r.note}”
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function Bar({ children, top }: { children: ReactNode; top?: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.surface.raised,
        borderColor: theme.border.subtle,
        ...(top ? { borderBottomWidth: 1 } : { borderTopWidth: 1 }),
      }}
    >
      {children}
    </View>
  )
}

/**
 * Going over a run-through's issues one at a time, over the whole screen:
 * which issue of how many, a dot per issue coloured by its answer, the
 * screenshot at its moment, what happened and what was expected, and three
 * answers. Answering moves to the next open issue; after the last, the
 * answers grouped and the one action that makes the fixes and closes the run.
 */
export default function RunThroughIssueReviewPanel({
  review,
  projectId,
  projectName,
  recording,
  onDiscuss,
  topInset,
  bottomInset,
}: RunThroughIssueReviewPanelProps) {
  const { theme } = useNativeTheme()
  const { view, isOpen, close, goTo, move, answer, finish, finishing } = review
  const [replying, setReplying] = useState(false)
  const current = view.current
  const currentKey = current?.row.key
  useEffect(() => setReplying(false), [currentKey])

  const give = (choice: RunThroughIssueChoice['id'], note?: string) => {
    if (!current) return
    setReplying(false)
    if (choice === 'reply') return answer(current.row.key, 'fix', note)
    answer(current.row.key, choice)
  }

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={close}
      hideHeader
      {...(topInset !== undefined ? { topInset } : {})}
      {...(bottomInset !== undefined ? { bottomInset } : {})}
    >
      <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
        <Bar top>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text
              accessibilityRole="header"
              style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text.primary }}
            >
              {view.heading}
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.text.secondary }}>
              {view.progress}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={RUN_THROUGH_REVIEW_COPY.close}
              onPress={close}
              style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
            >
              <IconClose size={16} color={theme.text.secondary} />
            </Pressable>
          </View>
          <Dots dots={view.dots} onPick={goTo} />
        </Bar>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {current ? (
            <IssueScreen
              current={current}
              projectId={projectId}
              recording={recording}
              replying={replying}
              onReplying={setReplying}
              onAnswer={give}
              onDiscuss={onDiscuss}
            />
          ) : (
            <SummaryScreen view={view} onPick={goTo} />
          )}
        </ScrollView>
        <Bar>
          {view.at === 'summary' ? (
            <>
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
                  {view.tally}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {view.allAnswered
                    ? RUN_THROUGH_REVIEW_COPY.createDoes(view.fixes, projectName)
                    : RUN_THROUGH_REVIEW_COPY.openFirst(view.open)}
                </Text>
              </View>
              <Button
                variant="outline"
                disabled={!view.allAnswered}
                loading={finishing}
                onPress={finish}
              >
                {RUN_THROUGH_REVIEW_COPY.create(view.fixes, projectName)}
              </Button>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={view.at === 0}
                onPress={() => move(-1)}
              >
                <IconArrowLeftMini size={14} color={theme.text.primary} />
                <Text style={{ color: theme.text.primary }}>{RUN_THROUGH_REVIEW_COPY.back}</Text>
              </Button>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 11.5,
                  color: theme.text.muted,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {current ? RUN_THROUGH_REVIEW_COPY.position(current.number, view.total) : ''}
              </Text>
              <Button size="sm" variant="secondary" onPress={() => move(1)}>
                <Text style={{ color: theme.text.primary }}>{RUN_THROUGH_REVIEW_COPY.next}</Text>
                <IconArrowRightMini size={14} color={theme.text.primary} />
              </Button>
            </View>
          )}
        </Bar>
      </View>
    </FullScreenOverlay>
  )
}
