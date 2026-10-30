import { BLOCKER_ACTION_KIND, QUESTION_ACTION_KIND } from './agentQuestionConstants'
import { REMEDY_ACTION_KIND } from './agentRemedyConstants'
import { START_GROUP_WORK_TOOL_NAME } from './processGroupLaunchConstants'
import { ACCEPT_REQUEST_TOOL } from './toolAskCardConstants'

/**
 * The tool that launches an isolated feature-work run. Kept as a named constant
 * so the approval surface can recognise it and present a launch affordance
 * rather than a generic "the agent wants to run a tool" prompt.
 */
export const START_FEATURE_WORK_TOOL_NAME = 'startFeatureWork'

/**
 * The launches, whose approval keeps the composer's place instead of the
 * call's row: a feature-work or group launch, and accepting a feature request.
 * Their card is where the way the work starts is chosen.
 */
export const COMPOSER_LAUNCH_TOOL_NAMES: readonly string[] = [
  START_FEATURE_WORK_TOOL_NAME,
  START_GROUP_WORK_TOOL_NAME,
  ACCEPT_REQUEST_TOOL,
]

/**
 * The tools whose ask is the person's answer — a question, a blocker, a
 * credential or sign-in form — which take the composer's place through the
 * questions pager. The forms raise no approval; they are named so that one
 * ever gated still keeps its form rather than a row's toggle.
 */
export const USER_INPUT_TOOL_NAMES: readonly string[] = [
  'askUser',
  'reportBlocked',
  'requestGitCredentials',
  'requestTicketConnection',
  'requestSecretNote',
  'requestCliSignIn',
  'requestLlmApiKey',
  'requestWebSearchKey',
]

/** The action kinds answered rather than approved: a question, a blocker, a remedy. */
export const USER_INPUT_ACTION_KINDS: readonly string[] = [
  QUESTION_ACTION_KIND,
  BLOCKER_ACTION_KIND,
  REMEDY_ACTION_KIND,
]

/** The asks about a website — what "Trust this site" may answer. */
export const SITE_ASK_KINDS: readonly string[] = ['network-unlock', 'external-fetch']
