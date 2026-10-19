import {
  CLI_IMAGE_BUILD_STARTING,
  CLI_IMAGE_BUILD_STEPS,
  CLI_IMAGE_LOG_VISIBLE_LINES,
  CLI_IMAGE_STALE_MS,
} from './cliImageViewConstants'
import type {
  CliImageBuild,
  CliImageBuildAction,
  CliImageBuildPhase,
  CliImageBuildStepView,
  CliImageChip,
  CliImageRow,
} from './cliImageViewTypes'

/**
 * What a CLI image's version chip says — loading, the installed version, an
 * available update, a running build, a missing image, or an unknown state
 * (never shown as up to date). Pure.
 */
export function cliImageChip(version: CliImageRow | undefined, loading: boolean): CliImageChip {
  if (!version) return { label: loading ? 'Version…' : 'Version unknown', tone: 'muted' }
  const withHint = (chip: CliImageChip, hint: string | undefined): CliImageChip =>
    hint ? { ...chip, hint } : chip
  switch (version.state) {
    case 'updating':
      return { label: `Building ${version.update?.targetVersion ?? ''}…`, tone: 'muted' }
    case 'not-built':
      return withHint({ label: 'Not built', tone: 'error' }, version.detail)
    case 'update-available':
      return {
        label: `${version.installed ?? ''} → ${version.latest ?? ''}`,
        tone: 'warning',
        hint: `Newest published: ${version.latest ?? ''}`,
      }
    case 'up-to-date':
      return {
        label: version.installed ?? '',
        tone: 'muted',
        hint: `Up to date — checked ${version.latestCheckedAt ?? 'never'}`,
      }
    default:
      return withHint(
        {
          label: version.installed
            ? `${version.installed} · update status unknown`
            : 'Version unknown',
          tone: 'muted',
        },
        version.detail,
      )
  }
}

/**
 * The build button beside a CLI image's chip — Build image, Update to <v>,
 * Rebuild, or the busy Updating… / Starting… — or `undefined` when Docker is
 * missing, the image is unknown to the list, or it is up to date and idle. Pure.
 */
export function cliImageBuildAction(
  version: CliImageRow | undefined,
  opts: { docker: 'ok' | 'missing'; starting: boolean; cliName: string },
): CliImageBuildAction | undefined {
  if (opts.docker !== 'ok' || !version) return undefined
  const updating = version.state === 'updating'
  if (version.state === 'up-to-date') return undefined
  const behind = version.state === 'update-available' || version.state === 'not-built'
  const label = updating
    ? 'Updating…'
    : opts.starting
      ? 'Starting…'
      : version.state === 'not-built'
        ? 'Build image'
        : version.state === 'update-available'
          ? `Update to ${version.latest ?? ''}`
          : 'Rebuild'
  return {
    label,
    tone: behind ? 'success' : 'outline',
    hint:
      version.state === 'unknown'
        ? (version.detail ?? 'Rebuild this image')
        : `Build ${opts.cliName} ${version.latest ?? ''}`,
    busy: updating || opts.starting,
  }
}

/**
 * Whether any CLI image's upstream version was never checked or was checked
 * longer than {@link CLI_IMAGE_STALE_MS} before `now`. Pure.
 */
export function cliImagesNeedCheck(versions: readonly CliImageRow[], now: number): boolean {
  return versions.some(
    (row) => !row.latestCheckedAt || now - Date.parse(row.latestCheckedAt) > CLI_IMAGE_STALE_MS,
  )
}

/**
 * Ids of builds running now that are not in `watched` — the builds a view
 * saw in progress, so it confirms their success and not an old record's. Pure.
 */
export function newlyBuildingImageIds(
  versions: readonly CliImageRow[],
  watched: ReadonlySet<string>,
): string[] {
  return versions
    .filter((row) => row.state === 'updating' && row.update)
    .map((row) => row.update!.updateId)
    .filter((id) => !watched.has(id))
}

/** The label of a build stage, or `undefined` for none. Pure. */
export function cliImageBuildStepLabel(phase: CliImageBuildPhase | undefined): string | undefined {
  return CLI_IMAGE_BUILD_STEPS.find((step) => step.phase === phase)?.label
}

/**
 * Every build stage marked done, active or pending against the build's
 * current `phase`; before any stage is reported the first is active and says
 * "Starting…". Pure.
 */
export function cliImageBuildSteps(phase: CliImageBuildPhase | undefined): CliImageBuildStepView[] {
  const activeIndex = Math.max(
    0,
    CLI_IMAGE_BUILD_STEPS.findIndex((step) => step.phase === phase),
  )
  return CLI_IMAGE_BUILD_STEPS.map((step, index) => {
    const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
    return {
      ...step,
      state,
      text: state === 'active' && !phase ? CLI_IMAGE_BUILD_STARTING : step.label,
    }
  })
}

/** Says a build failed, at which stage when known, and that the old image stays. Pure. */
export function cliImageBuildFailure(update: CliImageBuild): string {
  const step = cliImageBuildStepLabel(update.phase)
  return `Update to ${update.targetVersion} failed${step ? ` at “${step}”` : ''} — the previous image is still in use.`
}

/** Says a build finished, naming the version it installed. Pure. */
export function cliImageBuildSuccess(update: CliImageBuild): string {
  return `Updated to ${update.installedAfter ?? update.targetVersion}`
}

/** A build's running time as m:ss. Pure. */
export function formatBuildElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * The build log a view shows — streamed `output` when there is any, else the
 * stored `logTail` — without its trailing newline, kept to the newest
 * {@link CLI_IMAGE_LOG_VISIBLE_LINES} lines. Pure.
 */
export function cliImageBuildLog(output: string | undefined, logTail: string): string {
  const text = (output ?? logTail).replace(/\n$/, '')
  const lines = text.split('\n')
  return lines.length > CLI_IMAGE_LOG_VISIBLE_LINES
    ? lines.slice(-CLI_IMAGE_LOG_VISIBLE_LINES).join('\n')
    : text
}
