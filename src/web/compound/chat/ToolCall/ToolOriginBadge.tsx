import Tooltip from '../../../primitives/Tooltip'
import { IconPuzzle, IconTerminal, IconWrench } from '../../../icons'
import type { ToolOrigin } from '../../../../headless/utils/chatTypes'

const ORIGIN_META: Record<ToolOrigin, { Icon: typeof IconWrench; label: string }> = {
  internal: { Icon: IconWrench, label: 'Factory tool' },
  native: { Icon: IconTerminal, label: 'Agent-native tool' },
  'external-mcp': { Icon: IconPuzzle, label: 'External MCP tool' },
}

/**
 * Small icon shown to the right of a tool name marking the tool's provenance —
 * one of our (factory) tools, the agent's own native tool, or a third-party MCP
 * tool. Defaults to `internal` since every API-agent tool is one of ours.
 */
export default function ToolOriginBadge({ origin = 'internal' }: { origin?: ToolOrigin }) {
  const { Icon, label } = ORIGIN_META[origin] ?? ORIGIN_META.internal
  return (
    <Tooltip content={label} placement="top" delayMs={150}>
      <span
        className="inline-flex items-center justify-center shrink-0 opacity-80"
        aria-label={label}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  )
}
