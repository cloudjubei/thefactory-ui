/** The number of turns a chat's limit starts at when it is first switched on. */
export const CHAT_TURN_LIMIT_START = 20

/** The range the turn-limit slider offers. */
export const CHAT_TURN_LIMIT_MIN = 1
export const CHAT_TURN_LIMIT_MAX = 100

/** The line under the "Limit turns per run" switch — the same whichever model runs the chat. */
export const CHAT_TURN_LIMIT_HINT =
  'Off, the agent takes as many turns as it needs and stops on its own or when you stop it. On, it ends the run after the number of turns below.'
