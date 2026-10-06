import type { VerificationApproachId } from '../api/generated'
import type {
  CapabilityEcosystemTable,
  CapabilityKind,
  CapabilityMethodId,
} from './capabilityChatDraftTypes'

/** The label of the button that opens a chat with the set-up draft. */
export const CAPABILITY_SETUP_LABEL = 'Set it up with the agent'

export const CAPABILITY_KINDS: Record<CapabilityMethodId, CapabilityKind> = {
  tests: 'check',
  types: 'check',
  lint: 'check',
  format: 'check',
  build: 'check',
  uitests: 'ui-tests',
  screens: 'capture',
  walkthrough: 'capture',
}

/** What a draft names the capability as: "Set up lint for this project." */
export const CAPABILITY_NAMES: Record<CapabilityMethodId, string> = {
  tests: 'unit tests',
  uitests: 'UI tests',
  types: 'a type check',
  lint: 'lint',
  format: 'a format check',
  build: 'a build',
  screens: 'before/after screen capture',
  walkthrough: 'walkthrough recordings',
}

/** The approach whose availability decides whether the app can be captured for each capture method. */
export const CAPABILITY_CAPTURE_APPROACH: Partial<
  Record<CapabilityMethodId, VerificationApproachId>
> = {
  uitests: 'screenshot-diff',
  screens: 'screenshot-diff',
  walkthrough: 'screen-recording',
}

/**
 * Where the checks scan finds each kind, by ecosystem — the shape a new command
 * must take for the checks step to pick it up. Mirrors thefactory-tools'
 * `detectProjectChecks`; an ecosystem left out gets the generic sentence.
 */
export const CAPABILITY_DETECTED_FROM: CapabilityEcosystemTable = {
  node: {
    build: 'a package.json script named "build" or "compile"',
    types:
      'a package.json script named "compile-check", "typecheck", "type-check" or "tsc", or a tsconfig.json with typescript installed',
    lint: 'a package.json script named "lint" or "eslint", or an ESLint or Biome config with its package installed',
    format:
      'a package.json script named "format:check" (or "check:format", "format-check", "prettier:check", "fmt:check"), or a Prettier or Biome config with its package installed',
    tests: 'a package.json script named "test:unit", "test" or "tests"',
  },
  python: {
    lint: 'a ruff or flake8 configuration',
    types: 'a mypy or pyright configuration',
  },
  android: {
    lint: 'a ktlint, Kotlinter or detekt Gradle plugin, or a lint { } block in the app module’s build.gradle(.kts) (Android lint)',
    format: 'the Spotless Gradle plugin',
    tests: 'a module’s src/test directory, run by its Gradle unit-test task',
  },
  jvm: {
    lint: 'a ktlint, Kotlinter or detekt Gradle plugin',
    format: 'the Spotless Gradle plugin',
  },
}

/** Said when the table has no entry: the scan's own listing is the authority. */
export const CAPABILITY_DETECTED_FROM_GENERIC =
  'a command in a file the checks scan reads — `listProjectChecks` shows what it detects'

/** Common tools per ecosystem — suggestions for the agent, never a choice made for it. */
export const CAPABILITY_COMMON_OPTIONS: CapabilityEcosystemTable = {
  node: {
    lint: 'ESLint, Biome',
    format: 'Prettier, Biome',
    types: 'TypeScript (tsc --noEmit)',
    tests: 'Vitest, Jest',
    uitests: 'Playwright, Cypress',
  },
  python: {
    lint: 'ruff, flake8',
    format: 'ruff format, black',
    types: 'mypy, pyright',
    tests: 'pytest',
  },
  android: {
    lint: 'Android lint, ktlint, detekt',
    format: 'ktlint, Spotless',
    tests: 'JUnit with Robolectric',
    uitests: 'Espresso, Compose UI tests',
  },
  ios: {
    lint: 'SwiftLint',
    format: 'swift-format, SwiftFormat',
    tests: 'XCTest',
    uitests: 'XCUITest',
  },
  jvm: { lint: 'ktlint, detekt, Checkstyle', format: 'Spotless', tests: 'JUnit' },
  go: { lint: 'golangci-lint', format: 'gofmt', tests: 'go test' },
  rust: { lint: 'clippy', format: 'rustfmt', tests: 'cargo test' },
}

/** The checks scan has no UI-test kind, so the agent must say how the suite is run. */
export const CAPABILITY_UI_TESTS_NOT_SCANNED =
  'The checks scan has no UI-test kind: the checks step will not run a UI-test command on its own, so name the command and how to run it in the acceptance criteria.'

/** A capture is not a command: it needs the platform known and the host able to drive the app. */
export const CAPABILITY_CAPTURE_NOT_SCANNED =
  'A capture is not a check command: it needs the project’s platform known and a host that can drive the app.'

export const CAPABILITY_UNKNOWN_PLATFORM =
  'The project’s platform is unknown, so no capture applies until its language/framework or a web recipe says what the app is.'

/** Where the ask sends the work: into this run before its sign-off, or out to a story. */
export const CAPABILITY_ASK_IN_RUN =
  'Please propose this as a feature — added to this run before sign-off, or as its own story —'

export const CAPABILITY_ASK_OUTSIDE_RUN =
  'Please propose this as its own story — or as a feature of an open one —'

/** What the proposal must name beside its acceptance criteria and proof plan, by how the capability gets in. */
export const CAPABILITY_ASK_DELIVERABLE: Record<CapabilityKind, string> = {
  check: 'the command it should expose (one the checks scan will detect)',
  'ui-tests': 'the command that runs the suite',
  capture: 'what must be in place for the app to be captured here',
}
