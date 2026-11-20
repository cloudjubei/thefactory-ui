/** The project setting's label. */
export const PROJECT_GENERATORS_LABEL = 'Generators'

/** What the setting is for. */
export const PROJECT_GENERATORS_HINT =
  'Commands that write the project’s generated sources. A run changes what a generator reads and runs it, never edits what it writes by hand, and its checks fail a change that leaves them out of step.'

/** Shown when the project declares none. */
export const PROJECT_GENERATORS_EMPTY = 'No generators.'

/** Each generator's fields: labels and what an empty field shows. */
export const PROJECT_GENERATOR_NAME_LABEL = 'Name'
export const PROJECT_GENERATOR_NAME_PLACEHOLDER = 'API client'
export const PROJECT_GENERATOR_COMMAND_LABEL = 'Command'
export const PROJECT_GENERATOR_COMMAND_PLACEHOLDER = 'npm run generate:api'
export const PROJECT_GENERATOR_INPUTS_LABEL = 'Reads'
export const PROJECT_GENERATOR_OUTPUTS_LABEL = 'Writes'
export const PROJECT_GENERATOR_PATH_PLACEHOLDER = 'openapi.yaml'
export const PROJECT_GENERATOR_OUTPUT_PLACEHOLDER = 'src/generated/api'
export const PROJECT_GENERATOR_FROM_PROJECT_LABEL = 'Another project’s file'
export const PROJECT_GENERATOR_FROM_PROJECT_PLACEHOLDER = 'Pick a project'
export const PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER = 'swagger/swagger.json'
export const PROJECT_GENERATOR_READ_AT_PLACEHOLDER = '../api/swagger/swagger.json'

/** The actions. */
export const PROJECT_GENERATOR_ADD = 'Add generator'
export const PROJECT_GENERATOR_ADD_INPUT = 'Add input'
export const PROJECT_GENERATOR_ADD_OUTPUT = 'Add output'
export const PROJECT_GENERATOR_REMOVE = 'Remove'

/** How a generator is named in a reason it cannot be saved. */
export const PROJECT_GENERATOR_ERROR_LEAD = (index: number, name: string): string =>
  name.trim() ? `${name.trim()}:` : `Generator ${index + 1}:`

/** How a generator's other-project input reads in the checks listing. */
export const PROJECT_GENERATOR_FROM_LINE = (projectId: string, path: string): string =>
  `${path} of ${projectId}`

/** The checks listing's heading over the project's generators. */
export const PROJECT_GENERATORS_HEADING = 'Generators'
