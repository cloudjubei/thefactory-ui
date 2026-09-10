import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  AGENT_UNREACHABLE,
  checkRowLayout,
  handoffRequest,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type ReviewTabId,
} from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import BottomSheet from '../../../primitives/BottomSheet'
import { Button } from '../../../primitives/Button'
import CheckChip, { checkChipPalette, checkChipStyle } from '../../chips/CheckChip'
import HandoffButton from '../../chips/HandoffButton'
import RunActionButton from '../../chips/RunActionButton'

export type CheckChipRowProps = {
  rows: readonly CheckMethodRow[]
  branch: string | undefined
  /** Which method is currently being run or captured, if any. */
  busyId: CheckMethodId | undefined
  /** False when the panel has no way to send a message to the agent. */
  canRequest: boolean
  onOpenProof: (tab: ReviewTabId) => void
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}

const STATE_SENTENCE: Record<CheckMethodRow['state'], string> = {
  passed: 'Passed. The proof is filed on this run.',
  failed: 'Failed on this branch.',
  unchecked: 'Configured for this project, but never run on this branch.',
  unconfigured: '',
}

/**
 * The "what was checked" row — nine chips in a fixed order, and the only place
 * that can ask for evidence which has no tab yet (a walkthrough nobody recorded
 * has no Walkthrough tab to ask from). Tapping a chip opens a sheet with what
 * its state allows: open the proof, run it, or hand it to the agent.
 */
export default function CheckChipRow({
  rows,
  branch,
  busyId,
  canRequest,
  onOpenProof,
  onRun,
  onRequest,
}: CheckChipRowProps) {
  const { theme, status } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  // The sheet keeps showing its row through the close animation, so which row
  // it holds is tracked apart from whether it is open.
  const [sheetId, setSheetId] = useState<CheckMethodId | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)

  const layout = checkRowLayout(rows, expanded)
  const open = rows.find((r) => r.id === sheetId)
  const fold = checkChipPalette('unchecked', theme, status)
  const close = () => setSheetOpen(false)

  const renderAction = (row: CheckMethodRow) => {
    const busy = busyId === row.id
    const action = row.action
    if (action.kind === 'open-proof') {
      return (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            close()
            onOpenProof(action.tab)
          }}
        >
          Open the proof
        </Button>
      )
    }
    if (action.kind === 'run') {
      return (
        <RunActionButton
          busy={busy}
          onPress={() => {
            close()
            onRun(row)
          }}
        >
          Run it now
        </RunActionButton>
      )
    }
    const request = handoffRequest(row, action.purpose, { branch })
    // A capture is produced by a verifier the host spawns, so it needs no chat
    // to send to; a fix or a set-up is an instruction to the agent in this chat.
    const unreachable = action.purpose !== 'capture' && !canRequest
    return (
      <View style={{ gap: 6 }}>
        <HandoffButton
          disabled={unreachable || busy}
          onPress={() => {
            close()
            onRequest(row, action.purpose)
          }}
        >
          {request.buttonLabel}
        </HandoffButton>
        {unreachable ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{AGENT_UNREACHABLE}</Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {layout.visible.map((row) => (
        <CheckChip
          key={row.id}
          row={row}
          onPress={() => {
            setSheetId(row.id)
            setSheetOpen(true)
          }}
        />
      ))}
      {layout.collapsed.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          onPress={() => setExpanded(true)}
          style={({ pressed }) => [checkChipStyle(fold), { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: fold.fg }}>
            {`${layout.collapsed.length} not checked`}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: fold.fg }}>▾</Text>
        </Pressable>
      ) : null}

      <BottomSheet isOpen={sheetOpen && open !== undefined} onClose={close} title={open?.label}>
        {open ? (
          <View style={{ gap: 8, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {open.state === 'unconfigured'
                ? `There is no ${open.noun} in this project, so there is no tab for it. Ask for it here.`
                : STATE_SENTENCE[open.state]}
            </Text>
            {open.state !== 'passed' && open.detail ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{open.detail}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              {renderAction(open)}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  )
}
