import type { ProcessLedgerEntry, ProcessRun, ProcessRunModel } from 'thefactory-tools/types'
import { processRunModel, sameProcessRunModel } from 'thefactory-tools/utils'

import type { CliRun } from '../api/generated'
import {
  CLAUDE_FAMILY_FIRST_ID,
  CLAUDE_MODEL_FAMILIES,
  CLAUDE_VERSION_FIRST_ID,
  MODEL_CONTEXT_SUFFIX,
} from './runModelConstants'

/**
 * Which agent, on which model, actually carried out a run.
 *
 * A read-only FACT about work already done — deliberately not the composer's
 * `ModelChip`, which exists to CHANGE the model of a chat. Sign-off shows what
 * ran; nothing here is pickable.
 */
export type RunModel = {
  /** `claude-code`, `codex`, … for a CLI run; `undefined` for an API run. */
  tool: string | undefined
  /** The TRANSPORT the chip leads with — `CLI` or `API`, never the tool's name. */
  tag: 'CLI' | 'API'
  /**
   * The model the run was carried out on: what the CLI reported running, else
   * what it was asked for. Cursor asked for `auto` reports `Composer 2.5`.
   */
  model: string | undefined
  /** What the run asked for, when the CLI reported running something else. */
  requested?: string
  /** Reasoning effort, when the runner reported one. */
  effort: string | undefined
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const text = value?.trim()
  return text ? text : undefined
}

/**
 * Read the run's executor off its record.
 *
 * `cli` is absent for an API-transport run, which is the only thing that tells
 * the two apart — so its absence IS the "API" reading, not missing data. The
 * model is the one the CLI REPORTED: `modelId` is only the request, and a run
 * asked for `auto` — or for nothing — says which model actually ran.
 */
export function runModelOf(
  run: Pick<CliRun, 'cli' | 'modelId' | 'effort'> & { reportedModel?: string },
): RunModel {
  const tool = trimmedOrUndefined(run.cli?.tool)
  const reported = trimmedOrUndefined(run.reportedModel)
  const requested = trimmedOrUndefined(run.modelId)
  return {
    tool,
    // The tag slot carries the transport, matching the composer's model chip;
    // the tool's own name belongs in the model slot, not shouted in the tag.
    tag: tool ? 'CLI' : 'API',
    model: reported ?? requested,
    ...(reported && requested && requested !== reported ? { requested } : {}),
    effort: trimmedOrUndefined(run.effort),
  }
}

function familyName(family: string): string | undefined {
  return Object.hasOwn(CLAUDE_MODEL_FAMILIES, family) ? CLAUDE_MODEL_FAMILIES[family] : undefined
}

function claudeName(family: string, major: string, minor: string | undefined): string | undefined {
  const name = familyName(family)
  return name ? `${name} ${major}${minor ? `.${minor}` : ''}` : undefined
}

/**
 * A model id as a person reads it: `claude-opus-5-5` → `Opus 5.5`,
 * `anthropic/claude-sonnet-4-6-20260101` → `Sonnet 4.6`, the alias `opus` →
 * `Opus`, a `[1m]` context suffix → ` (1M)`. Any other name — `gpt-5.3-codex`,
 * Cursor's `Composer 2.5` — is already what its tool calls it, and stays. Pure.
 */
export function modelDisplayName(id: string): string {
  const raw = id.trim()
  const context = MODEL_CONTEXT_SUFFIX.exec(raw)
  const bare = (context ? raw.slice(0, context.index) : raw).split('/').pop()!.toLowerCase()
  const familyFirst = CLAUDE_FAMILY_FIRST_ID.exec(bare)
  const versionFirst = CLAUDE_VERSION_FIRST_ID.exec(bare)
  const name =
    (familyFirst && claudeName(familyFirst[1], familyFirst[2], familyFirst[3])) ??
    (versionFirst && claudeName(versionFirst[3], versionFirst[1], versionFirst[2])) ??
    familyName(bare) ??
    (context ? raw.slice(0, context.index) : raw)
  return context ? `${name} (${context[1]}${context[2].toUpperCase()})` : name
}

/** The model line, as a person reads it — the executor when no model was recorded. */
export function runModelLabel(model: RunModel | undefined): string | undefined {
  if (!model) return undefined
  return model.model ? modelDisplayName(model.model) : (model.tool ?? undefined)
}

/**
 * What a process step's agent ran on, for the read-only model chip: its
 * transport and tool, and the model — the one its spend names when it names
 * one (`claude-opus-5-5` for an asked-for `opus`), else the one asked for. Pure.
 */
export function processRunModelChip(model: ProcessRunModel, reported?: string): RunModel {
  const cli = model.runner === 'cli'
  const asked = trimmedOrUndefined(model.model)
  const ran = trimmedOrUndefined(reported)
  return {
    tool: cli ? model.cli : undefined,
    tag: cli ? 'CLI' : 'API',
    model: ran ?? asked,
    ...(ran && asked && asked !== ran ? { requested: asked } : {}),
    effort: trimmedOrUndefined(model.effort),
  }
}

/** The one model an attempt's spend names, when it names exactly one. */
export function entryReportedModel(entry: Pick<ProcessLedgerEntry, 'cost'>): string | undefined {
  const names = new Set((entry.cost?.byModel ?? []).map((m) => m.label ?? m.model))
  return names.size === 1 ? [...names][0] : undefined
}

/**
 * The model the run's work runs on now, for the chip in its header: the
 * person's latest choice, else the launch's — named by the model its latest
 * attempt on that choice reported, when one has. Pure.
 */
export function processRunHeaderModel(
  run: Pick<ProcessRun, 'input' | 'modelOverride'>,
  entries: readonly Pick<ProcessLedgerEntry, 'model' | 'cost'>[] = [],
): RunModel | undefined {
  const current = processRunModel(run)
  if (!current) return undefined
  const reported = [...entries]
    .reverse()
    .filter((e) => sameProcessRunModel(e.model, current))
    .map(entryReportedModel)
    .find((name) => name !== undefined)
  return processRunModelChip(current, reported)
}

/**
 * The model an attempt ran on, only when it is not the run's model now — a
 * step launched before the person switched the run keeps its own chip. Pure.
 */
export function processStepModelChip(
  entry: Pick<ProcessLedgerEntry, 'model' | 'cost'> | undefined,
  run: Pick<ProcessRun, 'input' | 'modelOverride'>,
): RunModel | undefined {
  if (!entry?.model || sameProcessRunModel(entry.model, processRunModel(run))) return undefined
  return processRunModelChip(entry.model, entryReportedModel(entry))
}

/** A key that tells two chips apart: transport, tool and the model line. Pure. */
export function runModelKey(model: RunModel): string {
  return [model.tag, model.tool ?? '', runModelLabel(model) ?? ''].join('|')
}

/** Chips without repeats, in first-seen order. Pure. */
export function uniqueRunModels(models: readonly RunModel[]): RunModel[] {
  const seen = new Set<string>()
  return models.filter((m) => {
    const key = runModelKey(m)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
