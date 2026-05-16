import { useMemo, type ReactNode } from 'react'

import {
  formatUncoveredLines,
  getDirname,
  getFilename,
  normalizeRel,
  pctBarClass,
  pctColorClass,
} from './format'
import type { CoverageFileStatsLike, CoverageResultLike } from './types'

export type CoverageTableProps = {
  data: CoverageResultLike
  /**
   * Optional per-row action slot. Receives the file's project-relative
   * path + its sorted uncovered line numbers. Renders inside the
   * hover-revealed Actions column. Web mounts the "Improve tests" CTA
   * here; desktop does the same.
   */
  renderActions?: (file: string, uncoveredLines: number[]) => ReactNode
}

type Row = {
  file: string
  rel: string
  pct_lines: number
  pct_statements: number
  pct_branch: number | null
  pct_functions: number | null
  uncovered_lines: number[]
  statements_total: number | null
  statements_covered: number | null
  branches_total: number | null
  branches_covered: number | null
  functions_total: number | null
  functions_covered: number | null
  lines_total: number | null
  lines_covered: number | null
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

function findTotal(obj: Record<string, unknown>, base: string): number | null {
  const keys = [
    `${base}_total`,
    `total_${base}`,
    `${base}Total`,
    `total${base[0].toUpperCase()}${base.slice(1)}`,
  ]
  for (const k of keys) {
    if (typeof obj?.[k] === 'number') return obj[k] as number
  }
  return null
}

function findCovered(obj: Record<string, unknown>, base: string): number | null {
  const keys = [
    `${base}_covered`,
    `covered_${base}`,
    `${base}Covered`,
    `covered${base[0].toUpperCase()}${base.slice(1)}`,
  ]
  for (const k of keys) {
    if (typeof obj?.[k] === 'number') return obj[k] as number
  }
  return null
}

function comparePathsDepthFirst(aRel: string, bRel: string): number {
  const aSeg = aRel.split('/')
  const bSeg = bRel.split('/')
  const len = Math.min(aSeg.length - 1, bSeg.length - 1)
  for (let i = 0; i < len; i++) {
    const cmp = aSeg[i].localeCompare(bSeg[i])
    if (cmp !== 0) return cmp
  }
  return aSeg.length - bSeg.length
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
      <div className={`h-full ${pctBarClass(clamped)}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function MetricCell({ label, pct }: { label: string; pct: number | null }) {
  if (typeof pct !== 'number') return <div className="mx-auto text-center" title={label} />
  return (
    <div className="mx-auto text-center" title={label}>
      <div className={`text-sm font-medium tabular-nums ${pctColorClass(pct)}`}>
        {`${pct.toFixed(1)}%`}
      </div>
      <div className="mt-1">
        <ProgressBar value={pct} />
      </div>
    </div>
  )
}

export function CoverageTable({ data, renderActions }: CoverageTableProps) {
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = []
    for (const [file, v] of Object.entries(data?.files ?? {}) as Array<
      [string, CoverageFileStatsLike]
    >) {
      const rel = normalizeRel(file)
      const obj = v as Record<string, unknown>

      const statements_total = findTotal(obj, 'statements')
      const statements_covered = findCovered(obj, 'statements')
      const branches_total = findTotal(obj, 'branches')
      const branches_covered = findCovered(obj, 'branches')
      const functions_total = findTotal(obj, 'functions')
      const functions_covered = findCovered(obj, 'functions')
      let lines_total = findTotal(obj, 'lines')
      let lines_covered = findCovered(obj, 'lines')

      if (lines_total !== null && lines_covered === null && Array.isArray(v.uncovered_lines)) {
        lines_covered = Math.max(0, lines_total - v.uncovered_lines.length)
      }

      list.push({
        file,
        rel,
        pct_lines: v.pct_lines,
        pct_statements: v.pct_statements,
        pct_branch: asNum(v.pct_branch),
        pct_functions: asNum(v.pct_functions),
        uncovered_lines: Array.isArray(v.uncovered_lines) ? v.uncovered_lines : [],
        statements_total,
        statements_covered,
        branches_total,
        branches_covered,
        functions_total,
        functions_covered,
        lines_total,
        lines_covered,
      })
    }
    list.sort((a, b) => comparePathsDepthFirst(a.rel, b.rel))
    return list
  }, [data])

  const summary = useMemo(() => {
    const count = rows.length
    const avg = (getter: (r: Row) => number | null) => {
      const vals = rows.map(getter).filter((n): n is number => typeof n === 'number')
      if (!vals.length) return 0
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }
    return {
      fileCount: count,
      avgLinesPct: avg((r) => r.pct_lines),
      avgStatementsPct: avg((r) => r.pct_statements),
      avgBranchesPct: avg((r) => r.pct_branch),
      avgFunctionsPct: avg((r) => r.pct_functions),
    }
  }, [rows])

  return (
    <div className="h-full min-w-0 rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="h-full w-full overflow-auto">
        <table className="w-full min-w-full text-sm">
          {/*
           * Column sizing strategy:
           *   - Every column has a `min-w-*` floor so it never collapses
           *     below its natural content. When the viewport is narrower
           *     than the sum of those floors, the parent's `overflow-auto`
           *     kicks in and the whole table scrolls horizontally.
           *   - The metric / actions columns also pin a fixed `w-*` so they
           *     don't grow when extra space is available.
           *   - The "Uncovered lines" column declares only a min-width, so
           *     under auto table-layout it absorbs every leftover pixel.
           */}
          <colgroup>
            <col className="min-w-[200px]" />
            <col className="w-28 min-w-28" />
            <col className="w-28 min-w-28" />
            <col className="w-28 min-w-28" />
            <col className="w-28 min-w-28" />
            <col className="min-w-[160px]" />
            <col className="w-24 min-w-24" />
          </colgroup>
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400">
            <tr>
              <th className="text-left px-3 py-2">File</th>
              <th className="text-center px-3 py-2">Statements</th>
              <th className="text-center px-3 py-2">Branches</th>
              <th className="text-center px-3 py-2">Functions</th>
              <th className="text-center px-3 py-2">Lines</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Uncovered lines</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
            <tr>
              <th className="text-left px-3 pt-2 pb-3 font-normal text-neutral-600 dark:text-neutral-400">
                {summary.fileCount} files
              </th>
              <th className="text-center px-3 pt-2 pb-3 font-normal">
                <MetricCell label="Statements" pct={summary.avgStatementsPct} />
              </th>
              <th className="text-center px-3 pt-2 pb-3 font-normal">
                <MetricCell label="Branches" pct={summary.avgBranchesPct} />
              </th>
              <th className="text-center px-3 pt-2 pb-3 font-normal">
                <MetricCell label="Functions" pct={summary.avgFunctionsPct} />
              </th>
              <th className="text-center px-3 pt-2 pb-3 font-normal">
                <MetricCell label="Lines" pct={summary.avgLinesPct} />
              </th>
              <th className="text-left px-3 pt-2 pb-3 font-normal text-neutral-400" />
              <th className="text-right px-3 pt-2 pb-3 font-normal text-neutral-400" />
            </tr>
            <tr>
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
              <th className="h-0.5 bg-neutral-700/50" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-neutral-500" colSpan={7}>
                  No coverage data found.
                </td>
              </tr>
            ) : (
              rows.map((f, i) => {
                const uncoveredText = formatUncoveredLines(f.uncovered_lines)
                // Only surface the per-row actions slot when there's
                // something to improve — same rule desktop's `CoverageReport`
                // used: lines coverage under 80% OR any uncovered line.
                // Files that already meet the bar render an empty cell.
                const showActions = (f.pct_lines ?? 0) < 80 || (f.uncovered_lines?.length ?? 0) > 0
                const actions =
                  showActions && renderActions
                    ? renderActions(f.file, f.uncovered_lines ?? [])
                    : null
                return (
                  <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800 group">
                    <td className="px-3 py-2">
                      <div className="truncate whitespace-nowrap" title={f.file}>
                        <div className="flex flex-col">
                          <span>{getFilename(f.file)}</span>
                          <span className="text-xs text-neutral-500 font-light">
                            {getDirname(f.file)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MetricCell label="Statements" pct={f.pct_statements} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MetricCell label="Branches" pct={f.pct_branch} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MetricCell label="Functions" pct={f.pct_functions} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MetricCell label="Lines" pct={f.pct_lines} />
                    </td>
                    <td className="px-3 py-2">
                      {uncoveredText && uncoveredText !== '—' ? (
                        <div
                          className="text-xs text-neutral-600 dark:text-neutral-400 truncate"
                          title={uncoveredText}
                        >
                          {uncoveredText}
                        </div>
                      ) : null}
                    </td>
                    <td className="min-w-24 px-3 py-2 text-center">
                      {actions ? (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex justify-center">
                          {actions}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CoverageTable
