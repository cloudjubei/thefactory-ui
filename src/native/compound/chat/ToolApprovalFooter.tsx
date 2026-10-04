import { Text, View } from 'react-native'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type ToolApprovalFooterProps = {
  /** How many calls in this batch await a decision. */
  total: number
  /** How many of them are toggled on — approved by Resume; the rest are declined. */
  selectedCount: number
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onResume: () => void
  /** The decisions are still landing. */
  resuming: boolean
}

/**
 * Native peer of [web's `ToolApprovalFooter`](../../../web/compound/chat/ToolApprovalFooter.tsx):
 * "Toggle all", then one Resume that approves the toggled calls and declines
 * the rest. Resuming with nothing toggled is refused.
 */
export default function ToolApprovalFooter({
  total,
  selectedCount,
  allSelected,
  onToggleAll,
  onResume,
  resuming,
}: ToolApprovalFooterProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: nativeSpace[2],
      }}
    >
      {total > 1 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>Toggle all</Text>
          <Switch checked={allSelected} onCheckedChange={(c) => onToggleAll(c)} />
        </View>
      ) : (
        <View />
      )}
      <Button
        variant="primary"
        size="sm"
        loading={resuming}
        disabled={selectedCount === 0 || resuming}
        onPress={onResume}
      >
        {`Resume ${selectedCount}/${total} Tools`}
      </Button>
    </View>
  )
}
