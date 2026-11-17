import { Linking, Pressable, Text, View } from 'react-native'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import { reviewBoxOfferLine } from '../../../headless/utils/colleagueReviewSource'
import { REVIEW_OFFER_TEXT } from '../../../headless/utils/colleagueReviewSourceConstants'
import { reviewBoxProblem, withReviewFiles } from '../../../headless/utils/colleagueReviewStart'
import {
  COLLEAGUE_REVIEW_FILES_MAX,
  REVIEW_START_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewStartConstants'
import type {
  ReviewBoxOffer,
  ReviewDraft,
  ReviewPasteBox,
} from '../../../headless/utils/colleagueReviewStartTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconAttach, IconChat, IconClose, IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type ColleagueReviewPasteFormProps = {
  box: ReviewPasteBox
  onChange: (draft: ReviewDraft) => void
  onStart: () => void
  /** The app's file picker; without it only the text goes. */
  pickFiles?: () => Promise<ChatAttachmentFile[]>
  /** When the update from Slack was posted is told against this — for a fixed showcase state. */
  now?: number
}

/** Who sent the update from Slack and when, its message a press away. */
function FromSlack({ offer, now }: { offer: ReviewBoxOffer; now: number }) {
  const { theme } = useNativeTheme()
  const { permalink } = offer
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.accent.softBg,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 6,
      }}
    >
      <IconChat size={14} color={theme.accent.primary} />
      <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.primary }}>
        {reviewBoxOfferLine(offer, now)}
      </Text>
      {permalink ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={6}
          onPress={() => void Linking.openURL(permalink)}
          style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Text style={{ fontSize: 12, color: theme.accent.primary }}>
            {REVIEW_OFFER_TEXT.open}
          </Text>
          <IconExternalLink size={11} color={theme.accent.primary} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** The files the update came with in Slack: the backend fetches them itself. */
function SlackFiles({ files }: { files: readonly string[] }) {
  const { theme } = useNativeTheme()
  if (files.length === 0) return null
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{REVIEW_OFFER_TEXT.slackFiles}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {files.map((name, at) => (
          <Text
            key={`${name}-${at}`}
            numberOfLines={1}
            style={{
              maxWidth: 220,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.border.default,
              borderRadius: nativeRadii[2],
              paddingHorizontal: 8,
              paddingVertical: 2,
              fontSize: 12,
              color: theme.text.secondary,
            }}
          >
            {name}
          </Text>
        ))}
      </View>
    </View>
  )
}

/**
 * Native peer of web's `ColleagueReviewPasteForm`: the colleague's update as
 * they wrote it, and the files that came with it, picked through the app's
 * own picker. Opened on an update from Slack, it starts filled with it,
 * editable, its own files listed as coming from Slack. Start is held until
 * there is something to review.
 */
export function ColleagueReviewPasteForm({
  box,
  onChange,
  onStart,
  pickFiles,
  now = Date.now(),
}: ColleagueReviewPasteFormProps) {
  const { theme, status } = useNativeTheme()
  const { draft, offer } = box
  const reading = offer !== undefined && offer.text === undefined
  const problem = reviewBoxProblem(box)
  const full = draft.files.length >= COLLEAGUE_REVIEW_FILES_MAX
  const attach = async () => {
    if (!pickFiles) return
    const picked = await pickFiles().catch(() => [])
    if (picked.length > 0) onChange({ ...draft, files: withReviewFiles(draft.files, picked) })
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {offer ? <FromSlack offer={offer} now={now} /> : null}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {TEXT.update}
        </Text>
        <Textarea
          rows={8}
          autoFocus
          value={draft.text}
          disabled={reading}
          placeholder={reading ? REVIEW_OFFER_TEXT.reading : TEXT.placeholder}
          accessibilityLabel={TEXT.update}
          onChangeText={(text) => onChange({ ...draft, text })}
        />
      </View>
      {offer ? <SlackFiles files={offer.files} /> : null}
      {draft.files.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {draft.files.map(({ file }, at) => (
            <View
              key={`${file.name}-${at}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                maxWidth: 220,
                borderWidth: 1,
                borderColor: theme.border.default,
                borderRadius: nativeRadii[2],
                backgroundColor: theme.surface.raised,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 12, color: theme.text.primary }}
              >
                {file.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.remove(file.name)}
                hitSlop={8}
                onPress={() =>
                  onChange({ ...draft, files: draft.files.filter((_, i) => i !== at) })
                }
              >
                <IconClose size={12} color={theme.text.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {pickFiles ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Button size="sm" variant="secondary" disabled={full} onPress={() => void attach()}>
            <IconAttach size={14} color={theme.text.primary} />
            {TEXT.attach}
          </Button>
          <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}>
            {full ? TEXT.tooMany(COLLEAGUE_REVIEW_FILES_MAX) : TEXT.filesHint}
          </Text>
        </View>
      ) : null}
      {box.error ? <Alert variant="error">{box.error}</Alert> : null}
      {problem && !reading && draft.text.trim() !== '' ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{problem}</Text>
      ) : null}
      <Button variant="primary" disabled={problem !== undefined} onPress={onStart}>
        {box.nextRound ? TEXT.startNext : TEXT.start}
      </Button>
    </View>
  )
}

export type ColleagueReviewPasteBoxProps = ColleagueReviewPasteFormProps & {
  onClose: () => void
}

/** Native peer of web's `ColleagueReviewPasteBox`: the paste box as a bottom sheet. */
export default function ColleagueReviewPasteBox({
  onClose,
  ...form
}: ColleagueReviewPasteBoxProps) {
  const { box } = form
  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={box.nextRound ? TEXT.nextTitle(box.ticketKey) : TEXT.title(box.ticketKey)}
    >
      <ColleagueReviewPasteForm {...form} />
    </BottomSheet>
  )
}
