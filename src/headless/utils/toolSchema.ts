/**
 * JSON-Schema accessors + value coercion for the Tools screen's typed
 * argument form. Pure + renderer-agnostic so web and native both build the
 * same form from a `ToolDescriptor.parameters` blob, and coerce raw input
 * values back to schema-typed values before invoking the tool.
 */

/** Structural shape of a tool — only what category grouping needs. */
export interface ToolLike {
  name: string
  description: string
  category?: string
}

/** Reads the `properties` map off a JSON-Schema `parameters` object. */
export function getProperties(parameters: unknown): Record<string, unknown> {
  if (!parameters || typeof parameters !== 'object') return {}
  const props = (parameters as { properties?: unknown }).properties
  return props && typeof props === 'object' ? (props as Record<string, unknown>) : {}
}

/** Reads the `required` field name set off a JSON-Schema `parameters` object. */
export function getRequired(parameters: unknown): Set<string> {
  if (!parameters || typeof parameters !== 'object') return new Set()
  const r = (parameters as { required?: unknown }).required
  return Array.isArray(r) ? new Set(r.filter((x): x is string => typeof x === 'string')) : new Set()
}

/**
 * Coerces a raw input value (usually a string straight from a text field)
 * to the type the property schema declares. `boolean` → `Boolean`,
 * `integer`/`number` → finite `Number` or `undefined`, `array` → split on
 * commas (typed per `items.type`), `object` → `JSON.parse` (raw string kept
 * on failure so the user can fix it). Everything else passes through.
 */
export function coerceValue(schema: unknown, raw: unknown): unknown {
  const s = (schema && typeof schema === 'object' ? schema : {}) as Record<string, unknown>
  const t = s.type as string | undefined
  if (t === 'boolean') return Boolean(raw)
  if (t === 'integer' || t === 'number') {
    if (raw === '' || raw === null || raw === undefined) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  if (t === 'array') {
    if (typeof raw === 'string') {
      const parts = raw
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
      const items = (s.items && typeof s.items === 'object' ? s.items : {}) as Record<
        string,
        unknown
      >
      if (items.type === 'number' || items.type === 'integer') {
        return parts.map((p) => Number(p)).filter((n) => Number.isFinite(n))
      }
      if (items.type === 'boolean') {
        return parts.map((p) => p.toLowerCase() === 'true')
      }
      return parts
    }
    return Array.isArray(raw) ? raw : []
  }
  if (t === 'object') {
    if (typeof raw === 'string') {
      try {
        return raw.length > 0 ? JSON.parse(raw) : {}
      } catch {
        return raw
      }
    }
    return raw
  }
  return raw
}

/**
 * Filters tools by a free-text term (name / description / category) and
 * buckets the survivors by `category` (defaulting to `general`). Buckets and
 * the tools inside them are returned alphabetically sorted.
 */
export function groupByCategory<T extends ToolLike>(
  tools: ReadonlyArray<T>,
  filter: string,
): Array<{ category: string; items: T[] }> {
  const term = filter.trim().toLowerCase()
  const matched = term
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          (t.description ?? '').toLowerCase().includes(term) ||
          (t.category ?? 'general').toLowerCase().includes(term),
      )
    : tools
  const buckets = new Map<string, T[]>()
  for (const tool of matched) {
    const cat = tool.category ?? 'general'
    let arr = buckets.get(cat)
    if (!arr) {
      arr = []
      buckets.set(cat, arr)
    }
    arr.push(tool)
  }
  return Array.from(buckets.entries())
    .map(([category, items]) => ({
      category,
      items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}
