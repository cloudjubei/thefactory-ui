import { useCosts } from '../../../headless'
import { getPrice } from '../../../headless/api'
import type { UsageModalMessage } from '../../../headless/utils/usageBreakdownTypes'
import UsageModal from './UsageModal'

export type UsageModalConnectedProps = {
  isOpen: boolean
  onClose: () => void
  /** The messages on screen — their usage fills the CURRENT section. */
  messages?: readonly UsageModalMessage[]
  /** The durable ledger's scope (a chat, a story, a project). */
  chatKey?: string
  title?: string
}

const NO_MESSAGES: readonly UsageModalMessage[] = []

/**
 * The native usage modal wired to the app's pricing and cost ledger — the peer
 * of the web `UsageModalConnected`, so a host passes a scope and its messages
 * and nothing about how usage is read.
 */
export default function UsageModalConnected({
  isOpen,
  onClose,
  messages = NO_MESSAGES,
  chatKey,
  title,
}: UsageModalConnectedProps) {
  const { getCost } = useCosts()
  return (
    <UsageModal
      isOpen={isOpen}
      onClose={onClose}
      messages={messages}
      chatKey={chatKey}
      getPrice={getPrice}
      getCost={getCost}
      title={title}
    />
  )
}
