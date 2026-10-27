/** How a capture's build key reads as a variant name, per platform. */
export const DESIGN_BUILD_VARIANT_NAMES = {
  webApp: 'Web app',
  web: 'Web',
  android: 'Android',
  ios: 'iOS',
} as const

/** The package folder a build key gives for a project's root app. */
export const DESIGN_BUILD_ROOT_DIR = '.'
