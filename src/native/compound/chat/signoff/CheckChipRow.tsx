import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  AGENT_UNREACHABLE,
  checkActionOffer,
  checkCallout,
  checkRowLayout,
  handoffRequest,
  type CheckActionHost,
  type CheckMethodId,
  type CheckMethodRow,
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
  onOpenProof: (tab: ReviewTabId) => void
  /** What this panel can do about a chip; absent on a read-only record, which offers only the proof. */
  actions?: CheckActionHost
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
  onOpenProof,
  actions,
}: CheckChipRowProps) {
  const { theme, status } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  // The sheet keeps showing its row through the close animation, so which row
  // it holds is tracked apart from whether it is open.
  const [sheetId, setSheetId] = useState<CheckMethodId | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)

  const layout = checkRowLayout(rows, expanded)
  const open = rows.find((r) => r.id === sheetId)
  const callout = open ? checkCallout(open) : undefined
  const fold = checkChipPalette('unchecked', theme, status)
  const close = () => setSheetOpen(false)

  const renderAction = (row: CheckMethodRow) => {
    const busy = busyId === row.id
    const offer = checkActionOffer(row.action, actions)
    if (offer.kind === 'open-proof') {
      return (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            close()
            onOpenProof(offer.tab)
          }}
        >
          Open the proof
        </Button>
      )
    }
    if (offer.kind === 'none' || !actions) return null
    if (offer.kind === 'run') {
      return (
        <RunActionButton
          busy={busy}
          onPress={() => {
            close()
            actions.onRun(row)
          }}
        >
          Run it now
        </RunActionButton>
      )
    }
    const request = handoffRequest(row, offer.purpose, { branch })
    return (
      <View style={{ gap: 6 }}>
        <HandoffButton
          disabled={offer.unreachable || busy}
          onPress={() => {
            close()
            actions.onRequest(row, offer.purpose)
          }}
        >
          {request.buttonLabel}
        </HandoffButton>
        {offer.unreachable ? (
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
            // A passed chip has one thing to offer — its proof — so it just opens
            // it. The sheet is for chips that ask a question (run it? set it up?
            // fix it?); a passed chip behind a sheet only added a tap to reach a
            // tab that is already right there.
            if (row.action.kind === 'open-proof') {
              onOpenProof(row.action.tab)
              return
            }
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
        {open && callout ? (
          <View style={{ gap: 8, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{callout.lead}</Text>
            {callout.detail ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{callout.detail}</Text>
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
