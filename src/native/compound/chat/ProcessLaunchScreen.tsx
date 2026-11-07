import { useMemo, type ReactNode } from 'react'
import { ScrollView } from 'react-native'

import {
  PROCESS_LAUNCH_COPY,
  processLaunchVariants,
  processRunLaunchGrant,
  removeProcessLaunchVariant,
  useProcessRunLaunch,
  useProjectNotes,
} from '../../../headless'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { nativeSpace } from '../../../tokens/native'
import { Button } from '../../primitives/Button'
import { ProcessLaunchVariantForm } from './ProcessLaunchFields'
import ProcessRunLaunchPanel from './ProcessRunLaunchPanel'

/** Where a process's form is kept while it is filled on a phone. */
export const processLaunchKey = (projectId: string, processId: string): string =>
  `screen:${projectId}:${processId}`

export type ProcessLaunchScreenProps = {
  projectId: string
  processId: string
  /** The agent the person's chats run on: what the run uses unless picked on the card. */
  chatRunner: 'api' | 'cli'
  agent?: Record<string, unknown>
  /** Launch with the card's picks. The host owns the call and opens the run. */
  onLaunch: (metadata: Record<string, unknown>) => Promise<void>
  onClose: () => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Push a variant's screen over this one. */
  onOpenVariant: (inputName: string, variantKey: string) => void
}

/**
 * The launch of a process from a page, as a screen of its own: the same card an
 * agent's `startProcessRun` raises, each variant pushing a screen of its own.
 */
export default function ProcessLaunchScreen({
  projectId,
  processId,
  chatRunner,
  agent,
  onLaunch,
  onClose,
  renderModelChip,
  onOpenVariant,
}: ProcessLaunchScreenProps) {
  const agentKey = agent ? JSON.stringify(agent) : ''
  const grant = useMemo(
    () =>
      processRunLaunchGrant({
        processId,
        chatRunner,
        ...(agentKey ? { agent: JSON.parse(agentKey) as Record<string, unknown> } : {}),
        onLaunch,
        onCancel: onClose,
      }),
    [processId, chatRunner, agentKey, onLaunch, onClose],
  )
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <ProcessRunLaunchPanel
        grant={grant}
        projectId={projectId}
        launchKey={processLaunchKey(projectId, processId)}
        onOpenVariant={onOpenVariant}
        {...(renderModelChip ? { renderModelChip } : {})}
      />
    </ScrollView>
  )
}

export type ProcessLaunchVariantScreenProps = {
  projectId: string
  processId: string
  inputName: string
  variantKey: string
  /** Back to the form. */
  onDone: () => void
}

/** One variant of a launch, pushed over the form: the same draft, edited on its own screen. */
export function ProcessLaunchVariantScreen({
  projectId,
  processId,
  inputName,
  variantKey,
  onDone,
}: ProcessLaunchVariantScreenProps) {
  const key = processLaunchKey(projectId, processId)
  const { form, repos, draft, setDraft, problem } = useProcessRunLaunch({
    key,
    projectId,
    processId,
  })
  const { notes, revealNote } = useProjectNotes(projectId)
  const input = form?.inputs.find((one) => one.name === inputName)
  const variant = draft
    ? processLaunchVariants(draft, inputName).find((one) => one.key === variantKey)
    : undefined
  if (!form || !draft || !input || !variant) return null
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: nativeSpace[4], padding: nativeSpace[4] }}
    >
      <ProcessLaunchVariantForm
        input={input}
        variant={variant}
        props={{
          inputs: form.inputs,
          draft,
          repos,
          problem,
          marked: true,
          notes,
          loadNote: revealNote,
          busy: false,
          onChange: setDraft,
        }}
      />
      <Button
        variant="ghost"
        onPress={() => {
          setDraft(removeProcessLaunchVariant(draft, inputName, variantKey))
          onDone()
        }}
      >
        {PROCESS_LAUNCH_COPY.removeThisVariant}
      </Button>
    </ScrollView>
  )
}
