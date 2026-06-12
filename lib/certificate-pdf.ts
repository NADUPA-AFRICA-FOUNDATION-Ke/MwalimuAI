/**
 * Mwalimu AI — Certificate PDF
 * Draws the certificate directly with jsPDF (A4 landscape, vector text).
 * Replaces the html2canvas pipeline, which crashed on Tailwind v4 oklch()
 * colors and produced raster output.
 */

export interface CertificateOptions {
  teacherName:  string
  programTitle: string
  subtitle:     string
  kicdAlignment: string
  skills:       string[]
  hours:        number
  score?:       string | null
  serial:       string
  verifyUrl:    string
}

type RGB = [number, number, number]

const TEAL:  RGB = [12, 154, 123]
const MID:   RGB = [182, 238, 216]
const LIGHT: RGB = [237, 250, 246]
const INK:   RGB = [17, 24, 39]
const GRAY:  RGB = [107, 114, 128]
const FAINT: RGB = [156, 163, 175]

// The logo mark as a data URL, fetched once and cached. Returns null if it
// cannot be loaded (e.g. offline) so the caller can fall back to a drawn badge.
let _markCache: string | null | undefined
async function loadMark(): Promise<string | null> {
  if (_markCache !== undefined) return _markCache
  try {
    const res = await fetch('/mwalimu-mark.png')
    if (!res.ok) throw new Error('mark fetch failed')
    const blob = await res.blob()
    _markCache = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('mark read failed'))
      r.readAsDataURL(blob)
    })
  } catch {
    _markCache = null
  }
  return _markCache
}

export async function downloadCertificatePDF(opts: CertificateOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const W = 297
  const H = 210
  const CX = W / 2

  const fill   = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const text   = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])

  // ── Background and frame ──────────────────────────────────────
  fill([255, 255, 255])
  doc.rect(0, 0, W, H, 'F')
  // top + bottom bands
  fill(TEAL)
  doc.rect(0, 0, W, 3.5, 'F')
  doc.rect(0, H - 3, W, 3, 'F')
  // double border rings
  stroke(MID)
  doc.setLineWidth(0.7)
  doc.roundedRect(8, 9.5, W - 16, H - 18.5, 4, 4, 'S')
  stroke(LIGHT)
  doc.setLineWidth(0.4)
  doc.roundedRect(10.5, 12, W - 21, H - 23.5, 3, 3, 'S')

  // ── Header: brand ─────────────────────────────────────────────
  let y = 26
  const logoSize = 13
  const mark = await loadMark()
  if (mark) {
    doc.addImage(mark, 'PNG', CX - 32, y - 9.5, logoSize, logoSize)
  } else {
    // Fallback: drawn badge if the mark image is unavailable.
    fill(TEAL)
    doc.roundedRect(CX - 32, y - 9, logoSize, logoSize, 3.2, 3.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    text([255, 255, 255])
    doc.text('M', CX - 32 + logoSize / 2, y - 0.6, { align: 'center' })
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  text(INK)
  doc.text('Mwalimu AI', CX - 15, y - 3.2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  text(GRAY)
  doc.text('Professional Development Platform', CX - 15, y + 1.6)

  // ── Badge pill ────────────────────────────────────────────────
  y = 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setCharSpace(0.4)
  const badge = 'CERTIFICATE OF COMPLETION'
  const badgeW = doc.getTextWidth(badge) + 14
  fill(LIGHT)
  doc.roundedRect(CX - badgeW / 2, y - 4.6, badgeW, 7.6, 3.8, 3.8, 'F')
  text(TEAL)
  doc.text(badge, CX, y, { align: 'center' })
  doc.setCharSpace(0)

  // ── Recipient ─────────────────────────────────────────────────
  y = 56
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  text(FAINT)
  doc.text('This is to certify that', CX, y, { align: 'center' })

  y += 13
  doc.setFont('times', 'bold')
  let nameSize = 28
  doc.setFontSize(nameSize)
  while (doc.getTextWidth(opts.teacherName) > 200 && nameSize > 16) {
    nameSize -= 2
    doc.setFontSize(nameSize)
  }
  text(INK)
  doc.text(opts.teacherName, CX, y, { align: 'center' })

  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  text(FAINT)
  doc.text('has successfully completed the', CX, y, { align: 'center' })

  // ── Program block ─────────────────────────────────────────────
  y += 8
  const ruleW = 190
  stroke(MID)
  doc.setLineWidth(0.4)
  doc.line(CX - ruleW / 2, y, CX + ruleW / 2, y)
  y += 9.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  text(INK)
  doc.text(opts.programTitle, CX, y, { align: 'center' })
  y += 6.5
  doc.setFontSize(9.5)
  text(TEAL)
  doc.text(opts.subtitle, CX, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  text(FAINT)
  doc.text(opts.kicdAlignment, CX, y, { align: 'center' })
  y += 6
  stroke(MID)
  doc.line(CX - ruleW / 2, y, CX + ruleW / 2, y)

  // ── Skill chips, centred rows ─────────────────────────────────
  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setCharSpace(0.5)
  text(FAINT)
  doc.text('COMPETENCIES DEMONSTRATED', CX, y, { align: 'center' })
  doc.setCharSpace(0)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  const chipH = 7
  const chipGap = 3
  const maxRowW = 230
  const chips = opts.skills.map(s => ({ label: s, w: doc.getTextWidth(s) + 10 }))
  const rows: Array<typeof chips> = []
  let row: typeof chips = []
  let rowW = 0
  for (const chip of chips) {
    if (rowW + chip.w + (row.length ? chipGap : 0) > maxRowW && row.length) {
      rows.push(row); row = []; rowW = 0
    }
    row.push(chip)
    rowW += chip.w + (row.length > 1 ? chipGap : 0)
  }
  if (row.length) rows.push(row)

  for (const r of rows) {
    const totalW = r.reduce((s, c) => s + c.w, 0) + chipGap * (r.length - 1)
    let x = CX - totalW / 2
    for (const chip of r) {
      fill(LIGHT)
      doc.roundedRect(x, y - 4.6, chip.w, chipH, 3.5, 3.5, 'F')
      text(TEAL)
      doc.text(chip.label, x + chip.w / 2, y, { align: 'center' })
      x += chip.w + chipGap
    }
    y += chipH + 2.5
  }

  // ── Score (optional) ──────────────────────────────────────────
  if (opts.score) {
    y += 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    text(GRAY)
    doc.text('Post-Assessment Score: ', CX - 2, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    text(TEAL)
    doc.text(opts.score, CX - 1, y)
  }

  // ── Footer row: serial, signature, duration ───────────────────
  const footY = 176
  stroke([243, 244, 246])
  doc.setLineWidth(0.3)
  doc.line(30, footY - 10, W - 30, footY - 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setCharSpace(0.4)
  text(FAINT)
  doc.text('CERTIFICATE NO.', 32, footY - 4)
  doc.text('DURATION', W - 32, footY - 4, { align: 'right' })
  doc.setCharSpace(0)

  doc.setFont('courier', 'bold')
  doc.setFontSize(11)
  text(INK)
  doc.text(opts.serial, 32, footY + 1.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`${opts.hours} hours`, W - 32, footY + 1.5, { align: 'right' })

  doc.setFont('times', 'bolditalic')
  doc.setFontSize(15)
  text(TEAL)
  doc.text('Mwalimu AI', CX, footY - 1.5, { align: 'center' })
  stroke([209, 213, 219])
  doc.setLineWidth(0.3)
  doc.line(CX - 21, footY + 1.5, CX + 21, footY + 1.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  text(FAINT)
  doc.text('Authorised Signature', CX, footY + 5.5, { align: 'center' })

  // ── Verification line ─────────────────────────────────────────
  doc.setFontSize(7)
  text(FAINT)
  doc.text(`Verify this certificate at ${opts.verifyUrl} using the certificate number above`, CX, 196, { align: 'center' })

  const safeName = opts.programTitle.replace(/[^a-z0-9 ]/gi, '_').slice(0, 60)
  doc.save(`${safeName}_Certificate.pdf`)
}
