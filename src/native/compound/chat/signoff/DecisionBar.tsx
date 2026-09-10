import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  REJECT_EXPLAINER,
  REQUEST_CHANGES_EXPLAINER,
  type ApproveActionDescriptor,
  type EarnedApproveActions,
} from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronDown } from '../../../icons'
import { Button } from '../../../primitives/Button'
import Tooltip from '../../../primitives/Tooltip'
import ActionMenu from '../../ActionMenu'

export type DecisionBarProps = {
  earned: EarnedApproveActions | undefined
  /** Why every approve is disabled right now, or `undefined` when they are live. */
  approveDisabledReason: string | undefined
  busy: boolean
  isMerged: boolean
  requestingChanges: boolean
  rejecting: boolean
  onApprove: (action: ApproveActionDescriptor) => void
  onRequestChanges: () => void
  onReject: () => void
}

/**
 * The pinned decision. One earned primary approve with the rest behind a caret
 * (a sheet of the other ways to approve, each with its one-line hint), then
 * Request changes and Reject. Every approve confirms with the same sentences
 * its hint made.
 */
export default function DecisionBar({
  earned,
  approveDisabledReason,
  busy,
  isMerged,
  requestingChanges,
  rejecting,
  onApprove,
  onRequestChanges,
  onReject,
}: DecisionBarProps) {
  const { theme } = useNativeTheme()
  const tipText = { fontSize: 12, color: theme.text.primary, maxWidth: 280 }
  const [menuOpen, setMenuOpen] = useState(false)
  const approveLocked = busy || isMerged || approveDisabledReason !== undefined

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {earned ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="primary"
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            disabled={approveLocked || earned.primary.disabledReason !== undefined}
            onPress={() => onApprove(earned.primary)}
          >
            {isMerged && earned.primary.action === 'merge' ? 'Merged ✓' : earned.primary.label}
          </Button>
          <Button
            size="sm"
            variant="primary"
            accessibilityLabel="More ways to approve"
            style={{
              marginLeft: 1,
              paddingHorizontal: 8,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
            disabled={approveLocked || earned.rest.length === 0}
            onPress={() => setMenuOpen(true)}
          >
            <IconChevronDown size={14} color={theme.text.inverted} />
          </Button>
          <ActionMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            title="More ways to approve"
            actions={earned.rest.map((option) => ({
              key: option.action,
              label: option.label,
              description: option.disabledReason ?? option.hint,
              disabled: option.disabledReason !== undefined,
              onPress: () => {
                setMenuOpen(false)
                onApprove(option)
              },
            }))}
          />
        </View>
      ) : null}

      <Tooltip content={<Text style={tipText}>{REQUEST_CHANGES_EXPLAINER}</Text>}>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || isMerged}
          onPress={onRequestChanges}
        >
          {requestingChanges ? 'Sending…' : 'Request changes'}
        </Button>
      </Tooltip>
      <Tooltip content={<Text style={tipText}>{REJECT_EXPLAINER}</Text>}>
        <Button size="sm" variant="ghost" disabled={busy || isMerged} onPress={onReject}>
          {rejecting ? 'Rejecting…' : 'Reject'}
        </Button>
      </Tooltip>
      {approveDisabledReason ? (
        <Text style={{ flexBasis: '100%', fontSize: 11, color: theme.text.muted }}>
          {approveDisabledReason}
        </Text>
      ) : null}
    </View>
  )
}
