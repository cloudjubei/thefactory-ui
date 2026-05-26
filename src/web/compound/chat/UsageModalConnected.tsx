import { getPrice } from "../../../headless/api"
import type { ChatMessage } from "../../../headless/api"
import { UsageModal as UsageModalBase } from "../.."
import { useCosts } from "../../../headless"

export type UsageModalProps = {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  chatKey?: string
}

export default function UsageModal({ isOpen, onClose, messages, chatKey }: UsageModalProps) {
  const { getCost } = useCosts()
  return (
    <UsageModalBase
      isOpen={isOpen}
      onClose={onClose}
      messages={messages}
      chatKey={chatKey}
      getPrice={getPrice}
      getCost={getCost}
    />
  )
}
