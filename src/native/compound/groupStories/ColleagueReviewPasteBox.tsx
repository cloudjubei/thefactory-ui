import { Pressable, Text, View } from 'react-native'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import { reviewDraftProblem, withReviewFiles } from '../../../headless/utils/colleagueReviewStart'
import {
  COLLEAGUE_REVIEW_FILES_MAX,
  REVIEW_START_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewStartConstants'
import type { ReviewDraft, ReviewPasteBox } from '../../../headless/utils/colleagueReviewStartTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconAttach, IconClose } from '../../icons'
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
}

/**
 * Native peer of web's `ColleagueReviewPasteForm`: the colleague's update as
 * they wrote it, and the files that came with it, picked through the app's
 * own picker. Start is held until there is something to review.
 */
export function ColleagueReviewPasteForm({
  box,
  onChange,
  onStart,
  pickFiles,
}: ColleagueReviewPasteFormProps) {
  const { theme, status } = useNativeTheme()
  const { draft } = box
  const problem = reviewDraftProblem(draft)
  const full = draft.files.length >= COLLEAGUE_REVIEW_FILES_MAX
  const attach = async () => {
    if (!pickFiles) return
    const picked = await pickFiles().catch(() => [])
    if (picked.length > 0) onChange({ ...draft, files: withReviewFiles(draft.files, picked) })
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {TEXT.update}
        </Text>
        <Textarea
          rows={8}
          autoFocus
          value={draft.text}
          placeholder={TEXT.placeholder}
          accessibilityLabel={TEXT.update}
          onChangeText={(text) => onChange({ ...draft, text })}
        />
      </View>
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
      {problem && draft.text.trim() !== '' ? (
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
