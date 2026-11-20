/** Why each check command cannot be saved, by field; a field with none is absent. */
export type ProjectCheckCommandsErrors = Partial<Record<'relatedTests' | 'formatFix', string>>
