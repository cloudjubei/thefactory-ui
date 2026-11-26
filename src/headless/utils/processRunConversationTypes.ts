/** Where the conversation of a run that works in its own chat stands: an ask waits in it, its step works, or nothing goes on in it now. */
export type RunConversationState = 'asks' | 'working' | 'idle'

/** The conversation of a run that works in its own chat, as the run's page says it. */
export interface RunConversationView {
  /** The step whose conversation the run's chat is. */
  stepId: string
  /** The step's name: "Review". */
  title: string
  state: RunConversationState
  /** "Working", "Waiting for your answer". */
  line: string
  /** How many asks wait on the person in the chat. */
  asks: number
  /** It is shown without the person asking: its step works, or an ask waits. */
  due: boolean
}
