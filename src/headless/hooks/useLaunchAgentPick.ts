import { useMemo, useState } from 'react'

import {
  pickLaunchApi,
  pickLaunchCli,
  pickLaunchEffort,
  pickLaunchModel,
} from '../utils/launchAgentPick'
import { NO_LAUNCH_AGENT_PICK } from '../utils/launchAgentPickConstants'
import type { LaunchAgentPick, LaunchModelChipSlot } from '../utils/launchAgentPickTypes'

/**
 * The agent a launch card picks for its run, and the slot it hands the host's
 * model chip. Every launch card — a story's, a group's, on every client —
 * keeps its pick this way, so the chat's own agent is never touched.
 */
export function useLaunchAgentPick(): { pick: LaunchAgentPick; slot: LaunchModelChipSlot } {
  const [pick, setPick] = useState<LaunchAgentPick>(NO_LAUNCH_AGENT_PICK)
  const slot = useMemo<LaunchModelChipSlot>(
    () => ({
      model: pick.model,
      onPick: (model) => setPick((p) => pickLaunchModel(p, model)),
      cli: pick.cli,
      onPickCli: (cli, credentialId, model) => setPick(pickLaunchCli(cli, credentialId, model)),
      api: pick.api,
      onPickApi: () => setPick(pickLaunchApi()),
      effort: pick.effort,
      onPickEffort: (effort) => setPick((p) => pickLaunchEffort(p, effort)),
    }),
    [pick],
  )
  return { pick, slot }
}
