/**
 * One CSV cell. Quoted so commas and newlines are safe; text starting with = + - @ (or a tab/carriage return) gets a
 * leading apostrophe so a spreadsheet shows it as text instead of running it as a formula.
 */
export function csvCell(cell: string | number | undefined | null) {
  const text = String(cell ?? '')
  const safe = typeof cell === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** Downloads rows as a CSV file in the browser. */
export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
