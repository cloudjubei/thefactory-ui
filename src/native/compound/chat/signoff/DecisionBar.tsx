import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  MORE_APPROVE_OPTIONS_LABEL,
  REJECT_EXPLAINER,
  REQUEST_CHANGES_EXPLAINER,
  type ApproveActionDescriptor,
  type DecisionExplainer,
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
 * The pinned decision. The lead action is EARNED: a proven run merges from the
 * front, a partly proven one leads with the option that changes nothing shared,
 * and a failed run leads with Request changes — every approve then sits behind
 * the caret, under a line saying which option the evidence actually supports.
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
  const [menuOpen, setMenuOpen] = useState(false)
  const approveLocked = busy || isMerged || approveDisabledReason !== undefined
  const approveLeads = earned?.approveLeads !== false
  const menuOptions = earned ? (approveLeads ? earned.rest : [earned.primary, ...earned.rest]) : []

  // Every explainer has the same three parts, so a reader learns the shape once:
  // what the act is, what it does, and — last — what it does NOT do.
  const tip = (text: DecisionExplainer) => (
    <View style={{ maxWidth: 280, gap: 3 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
        {text.headline}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.primary }}>{text.body}</Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{text.not}</Text>
    </View>
  )

  const requestChanges = (
    <Tooltip content={tip(REQUEST_CHANGES_EXPLAINER)}>
      <Button
        size="sm"
        variant={approveLeads ? 'secondary' : 'primary'}
        disabled={busy || isMerged}
        onPress={onRequestChanges}
      >
        {requestingChanges ? 'Sending…' : 'Request changes'}
      </Button>
    </Tooltip>
  )

  const approveMenu = earned ? (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {approveLeads ? (
        <Tooltip
          content={
            <View style={{ maxWidth: 280, gap: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
                {earned.primary.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.primary }}>{earned.primary.hint}</Text>
            </View>
          }
        >
          <Button
            size="sm"
            variant="primary"
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            disabled={approveLocked || earned.primary.disabledReason !== undefined}
            onPress={() => onApprove(earned.primary)}
          >
            {isMerged && earned.primary.action === 'merge' ? 'Merged ✓' : earned.primary.label}
          </Button>
        </Tooltip>
      ) : null}
      <Button
        size="sm"
        variant={approveLeads ? 'primary' : 'secondary'}
        accessibilityLabel={MORE_APPROVE_OPTIONS_LABEL}
        style={
          approveLeads
            ? {
                marginLeft: 1,
                paddingHorizontal: 8,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }
            : { paddingHorizontal: 10 }
        }
        disabled={approveLocked || menuOptions.length === 0}
        onPress={() => setMenuOpen(true)}
      >
        {approveLeads ? (
          <IconChevronDown size={14} color={theme.text.inverted} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: theme.text.primary }}>Approve</Text>
            <IconChevronDown size={14} color={theme.text.primary} />
          </View>
        )}
      </Button>
      <ActionMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={earned.menuHead}
        actions={menuOptions.map((option) => ({
          key: option.action,
          label: `${option.label}${option.warnUnlessProven && !approveLeads ? ' — not proven' : ''}${
            option.safest ? ' · safest' : ''
          }`,
          description: option.disabledReason ?? option.hint,
          disabled: option.disabledReason !== undefined,
          onPress: () => {
            setMenuOpen(false)
            onApprove(option)
          },
        }))}
      />
    </View>
  ) : null

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {approveLeads ? approveMenu : requestChanges}
      {approveLeads ? requestChanges : approveMenu}
      <Tooltip content={tip(REJECT_EXPLAINER)}>
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
