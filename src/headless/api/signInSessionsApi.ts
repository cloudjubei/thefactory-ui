import {
  answerSignInSession,
  closeSignInSession,
  listSignInSessions,
  resizeSignInSession,
  sendSignInSessionInput,
} from './generated'
import type { SignInSessionsApi } from '../utils/signInSessionTypes'

/** The person's sign-in sessions, through the backend's `sign-in-sessions` routes. */
export const SIGN_IN_SESSION_ROUTES: SignInSessionsApi = {
  list: async () => (await listSignInSessions({ throwOnError: true })).data.sessions,
  close: async (sessionId) => {
    await closeSignInSession({ path: { sessionId }, throwOnError: true })
  },
  input: async (sessionId, input) =>
    (await sendSignInSessionInput({ path: { sessionId }, body: input, throwOnError: true })).data,
  resize: async (sessionId, viewport) =>
    (await resizeSignInSession({ path: { sessionId }, body: viewport, throwOnError: true })).data,
  answer: async (sessionId, text) => {
    await answerSignInSession({ path: { sessionId }, body: { text }, throwOnError: true })
  },
}
