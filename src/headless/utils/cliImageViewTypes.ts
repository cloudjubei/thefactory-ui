import type { ListCliImageVersionsResponse } from '../api/generated'

/** One CLI's sandbox image as the image list reports it. */
export type CliImageRow = ListCliImageVersionsResponse['images'][number]

/** A CLI image's build record, live or finished. */
export type CliImageBuild = NonNullable<CliImageRow['update']>

/** A stage of an image build. */
export type CliImageBuildPhase = NonNullable<CliImageBuild['phase']>

/** How a CLI image's version chip is coloured. */
export type CliImageChipTone = 'muted' | 'warning' | 'error'

/** What a CLI image's version chip says. */
export interface CliImageChip {
  label: string
  tone: CliImageChipTone
  /** Longer note shown on hover or read out, when there is one. */
  hint?: string
}

/** The build button beside a CLI image's chip. */
export interface CliImageBuildAction {
  label: string
  /** `success` when the image is missing or behind; `outline` for a rebuild. */
  tone: 'success' | 'outline'
  hint: string
  /** A build is running or being started — the button shows a spinner and is off. */
  busy: boolean
}

/** One fixed stage of an image build. */
export interface CliImageBuildStep {
  phase: CliImageBuildPhase
  label: string
  hint: string
}

/** Where a build stands against one of its stages. */
export type CliImageBuildStepState = 'done' | 'active' | 'pending'

/** One stage of an image build as its progress list shows it. */
export interface CliImageBuildStepView extends CliImageBuildStep {
  state: CliImageBuildStepState
  /** The stage's label, or "Starting…" for the first stage before any stage starts. */
  text: string
}
