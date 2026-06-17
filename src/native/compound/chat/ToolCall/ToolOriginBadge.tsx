import { View } from 'react-native'
import { IconPuzzle, IconTerminal, IconWrench } from '../../../icons'
import type { ToolOrigin } from '../../../../headless/utils/chatTypes'

const ORIGIN_ICON: Record<ToolOrigin, typeof IconWrench> = {
  internal: IconWrench,
  native: IconTerminal,
  'external-mcp': IconPuzzle,
}

const ORIGIN_LABEL: Record<ToolOrigin, string> = {
  internal: 'Factory tool',
  native: 'Agent-native tool',
  'external-mcp': 'External MCP tool',
}

/**
 * Native peer of web's `ToolOriginBadge`: a small icon to the right of the tool
 * name marking the tool's provenance (factory / agent-native / external MCP).
 * Defaults to `internal` since every API-agent tool is one of ours.
 */
export default function ToolOriginBadge({ origin = 'internal' }: { origin?: ToolOrigin }) {
  const Icon = ORIGIN_ICON[origin] ?? ORIGIN_ICON.internal
  const label = ORIGIN_LABEL[origin] ?? ORIGIN_LABEL.internal
  return (
    <View accessibilityLabel={label} style={{ opacity: 0.85 }}>
      <Icon size={14} />
    </View>
  )
}
