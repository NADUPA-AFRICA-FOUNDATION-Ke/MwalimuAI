/** Downloads rows as a CSV file in the browser. Every cell is quoted, so commas and newlines are safe. */
export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
