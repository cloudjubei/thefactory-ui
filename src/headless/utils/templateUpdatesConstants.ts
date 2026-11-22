/**
 * Copy for the template-update check on a forked project
 * (`GET /projects/:projectId/template-updates`).
 */

/** Shown when the catalog tip has moved past the project's recorded provenance. */
export const TEMPLATE_UPDATES_AVAILABLE_LABEL = 'Template updates available'

export const TEMPLATE_UPDATES_STATUS_LABEL = {
  'up-to-date': 'Up to date with template',
  'updates-available': TEMPLATE_UPDATES_AVAILABLE_LABEL,
  'not-from-template': 'Not from a template',
  'unknown-template': 'Template no longer in catalog',
  'upstream-unreachable': 'Could not reach template upstream',
} as const
