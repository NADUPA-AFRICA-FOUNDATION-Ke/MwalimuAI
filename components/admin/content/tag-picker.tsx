'use client'

import type { ReactNode } from 'react'

export type Tags = { cbcLevels: string[]; subjects: string[]; counties: string[] }

/** Checkbox groups for CBC level, subject and county (options come from the server taxonomy). */
export function TagPicker({ tags, tax, onChange }: { tags?: Tags; tax: Tags; onChange: (t: Tags) => void }) {
  const t = tags ?? { cbcLevels: [], subjects: [], counties: [] }
  const group = (label: string, key: 'cbcLevels' | 'subjects' | 'counties', options: string[]): ReactNode => (
    <details className="rounded-md border p-3" open={key !== 'counties'}>
      <summary className="cursor-pointer text-sm font-semibold">
        {label} <span className="font-normal text-muted-foreground">({t[key].length} selected)</span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={t[key].includes(o)}
              onChange={(e) =>
                onChange({ ...t, [key]: e.target.checked ? [...t[key], o] : t[key].filter((x) => x !== o) })
              }
            />
            {o}
          </label>
        ))}
      </div>
    </details>
  )
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Tags</h2>
      {group('CBC level', 'cbcLevels', tax.cbcLevels)}
      {group('Subject', 'subjects', tax.subjects)}
      {group('County (only where relevant)', 'counties', tax.counties)}
    </div>
  )
}
