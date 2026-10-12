import { Text, View } from 'react-native'

import {
  PROCESS_GROUP_MARK_LANDED_LABEL,
  processGroupLandedNextView,
  processGroupLandingPlanLegIds,
  useProcessGroupLegLanding,
  useProcessGroupRebuildPlans,
  type ProcessGroupLeg,
  type ProcessGroupRun,
  type UseProcessGroupRun,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'

export type ProcessGroupLegLandingDialogProps = {
  group: ProcessGroupRun
  leg: ProcessGroupLeg
  planRebuild: UseProcessGroupRun['planRebuild']
  checkLanding: UseProcessGroupRun['checkLanding']
  markLanded: UseProcessGroupRun['markLanded']
  onClose: () => void
}

/**
 * Native peer of
 * [web's `ProcessGroupLegLandingDialog`](../../../web/compound/process/ProcessGroupLegLandingDialog.tsx).
 * Mark one leg's work as landed on its base branch outside its run: the
 * server checks its story is done and finds — or takes the person's — commit
 * on the base branch; only a check that proved it lets the person record it,
 * and the dialog then says what happens to the legs that need it — how it is
 * rebuilt first, as its plan says.
 */
export default function ProcessGroupLegLandingDialog({
  group,
  leg,
  planRebuild,
  checkLanding,
  markLanded,
  onClose,
}: ProcessGroupLegLandingDialogProps) {
  const { theme, status } = useNativeTheme()
  const landing = useProcessGroupLegLanding(leg.id, checkLanding, markLanded)
  const plans = useProcessGroupRebuildPlans(
    processGroupLandingPlanLegIds(group, leg.id),
    planRebuild,
  )
  const view = landing.checkView
  const next = view?.landed ? processGroupLandedNextView(group, leg.id, plans[leg.id]) : undefined
  const tone = view?.landed ? status.done : status.stuck
  return (
    <Modal isOpen onClose={onClose} title={`Mark ${leg.projectId} as landed?`}>
      <View style={{ gap: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {`Use this when ${leg.projectId}’s work reached its base branch another way. It counts as merged only once every feature of “${leg.title}” is done and the commit that brought it in is on the base branch.`}
        </Text>
        <Field label="Commit" hint="Leave empty to have it found from its runs and their chats.">
          <Input
            size="sm"
            value={landing.commit}
            placeholder="e.g. e9b3c02"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={landing.setCommit}
          />
        </Field>
        <Field label="Note">
          <Textarea rows={2} value={landing.note} onChangeText={landing.setNote} />
        </Field>
        {view ? (
          <View
            style={{
              gap: nativeSpace[1],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: tone.softBorder,
              backgroundColor: tone.softBg,
              padding: nativeSpace[3],
            }}
          >
            {view.lines.map((line) => (
              <Text key={line} style={{ fontSize: 12, color: tone.softFg }}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {next ? <Text style={{ fontSize: 12, color: theme.text.secondary }}>{next}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button size="sm" variant="ghost" onPress={onClose} disabled={landing.marking}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => void landing.runCheck()}
            disabled={landing.checking}
          >
            {landing.checking ? 'Checking…' : 'Check'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={() => void landing.mark().then((ok) => ok && onClose())}
            disabled={!landing.canMark}
          >
            {landing.marking ? 'Marking…' : PROCESS_GROUP_MARK_LANDED_LABEL}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
