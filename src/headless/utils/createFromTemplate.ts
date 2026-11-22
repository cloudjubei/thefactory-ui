import type { Template, TemplateForkProgress } from '../api/generated'
import { TEMPLATE_DIFFICULTY_LABEL, TEMPLATE_FORK_PHASE_LABEL } from './createFromTemplateConstants'

/**
 * Coerce free text into a project-id slug: lowercase, `[a-z0-9-]`, no leading
 * or trailing hyphens, capped at 64 chars (folder-name friendly).
 */
export function sanitizeProjectId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/** Suggest a project id from a display name (or template id as fallback). */
export function suggestProjectIdFromName(name: string, fallbackId?: string): string {
  const fromName = sanitizeProjectId(name)
  if (fromName) return fromName
  return sanitizeProjectId(fallbackId ?? '')
}

export type ProjectIdAvailability = 'empty' | 'available' | 'taken'

export function projectIdAvailability(
  id: string,
  existingIds: ReadonlyArray<string>,
): ProjectIdAvailability {
  const trimmed = id.trim()
  if (!trimmed) return 'empty'
  return existingIds.includes(trimmed) ? 'taken' : 'available'
}

export function templateDifficultyLabel(
  difficulty: Template['difficulty'] | undefined,
): string | undefined {
  if (!difficulty) return undefined
  return TEMPLATE_DIFFICULTY_LABEL[difficulty]
}

export function forkProgressLabel(progress: TemplateForkProgress | null | undefined): string {
  if (!progress) return ''
  if (progress.phase === 'error') {
    return progress.error?.trim() || TEMPLATE_FORK_PHASE_LABEL.error
  }
  const message = progress.message?.trim()
  if (message) return message
  return TEMPLATE_FORK_PHASE_LABEL[progress.phase] ?? progress.phase
}

export function isForkProgressTerminal(progress: TemplateForkProgress | null | undefined): boolean {
  return progress?.phase === 'done' || progress?.phase === 'error'
}

export function parseTemplateForkProgress(data: unknown): TemplateForkProgress | undefined {
  if (!data || typeof data !== 'object') return undefined
  const row = data as Record<string, unknown>
  const jobId = typeof row.jobId === 'string' ? row.jobId : ''
  const templateId = typeof row.templateId === 'string' ? row.templateId : ''
  const projectId = typeof row.projectId === 'string' ? row.projectId : ''
  const phase = row.phase
  const phases = new Set([
    'cloning',
    'installing',
    'initializing',
    'creating-repo',
    'done',
    'error',
  ])
  if (!jobId || !templateId || !projectId || typeof phase !== 'string' || !phases.has(phase)) {
    return undefined
  }
  return {
    jobId,
    templateId,
    projectId,
    phase: phase as TemplateForkProgress['phase'],
    ...(typeof row.message === 'string' ? { message: row.message } : {}),
    ...(typeof row.error === 'string' ? { error: row.error } : {}),
  }
}
