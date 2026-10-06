/**
 * Mwalimu AI — PDF Generator
 * Draws the document directly with jsPDF's vector/text API.
 *
 * Why not html2canvas: it crashes on Tailwind v4's oklch() colors (so the
 * download never fired), its injected <style> leaked global CSS into the
 * live app while capturing, and its canvas slicing cut text lines in half
 * at page boundaries. Direct drawing gives selectable text, small files,
 * clean page breaks, and a guaranteed automatic download.
 */

import { brandDocument, eatDate, siteHost, toSafeText } from './pdf/brand'

export type PDFType = 'lesson-plan' | 'feedback' | 'policy' | 'research' | 'default'

export interface PrintOptions {
  title:     string
  subtitle?: string
  meta?:     string
  content:   string
  type?:     PDFType
}

interface TypeCfg {
  bg: string; bgDeep: string; bgLight: string; bgMid: string
  ink: string; amber: string; label: string
}

const BRAND_TEAL  = '#0c9a7b'
const BRAND_DEEP  = '#0a7d64'
const BRAND_LIGHT = '#edfaf6'
const BRAND_MID   = '#b6eed8'
const BRAND_AMBER = '#c98900'

const TYPE_CFG: Record<PDFType, TypeCfg> = {
  'lesson-plan': { bg: BRAND_TEAL, bgDeep: BRAND_DEEP, bgLight: BRAND_LIGHT, bgMid: BRAND_MID, ink: BRAND_DEEP, amber: BRAND_AMBER, label: 'Lesson Plan' },
  'feedback':    { bg: '#059669',  bgDeep: '#047857',  bgLight: '#f0fdf4',  bgMid: '#bbf7d0', ink: '#047857', amber: '#d97706',  label: 'CBC Feedback' },
  'policy':      { bg: '#d97706',  bgDeep: '#b45309',  bgLight: '#fffbeb',  bgMid: '#fde68a', ink: '#b45309', amber: BRAND_TEAL, label: 'Policy Brief' },
  'research':    { bg: '#6d28d9',  bgDeep: '#5b21b6',  bgLight: '#f5f3ff',  bgMid: '#ddd6fe', ink: '#5b21b6', amber: BRAND_AMBER, label: 'Action Research' },
  'default':     { bg: BRAND_TEAL, bgDeep: BRAND_DEEP, bgLight: BRAND_LIGHT, bgMid: BRAND_MID, ink: BRAND_DEEP, amber: BRAND_AMBER, label: 'Document' },
}

// ── Geometry (mm, A4 portrait) ──────────────────────────────────────────────
const PAGE_W = 210
const PAGE_H = 297
const ML     = 18
const MR     = 18
const CW     = PAGE_W - ML - MR     // 174
const FOOT_H = 13
const BOTTOM = PAGE_H - FOOT_H - 7  // last usable content baseline
const TOP_NEXT = 18                 // content top on pages 2+

// ── Color helpers (no GState needed: blend against the known backdrop) ─────
type RGB = [number, number, number]

function rgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mix(base: RGB, over: RGB, alpha: number): RGB {
  return [
    Math.round(base[0] + (over[0] - base[0]) * alpha),
    Math.round(base[1] + (over[1] - base[1]) * alpha),
    Math.round(base[2] + (over[2] - base[2]) * alpha),
  ]
}

const WHITE: RGB = [255, 255, 255]

// ── Markdown → structured blocks (same grammar the old renderer used) ──────
type Block =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'li'; text: string; ordered: boolean; index: number; sub: boolean }
  | { kind: 'activity'; num: string; title: string; time?: string }
  | { kind: 'kv'; pairs: Array<[string, string]> }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'code'; lines: string[] }

const ACT_RE = /^Activity\s+(\d+)\s*[–\-]\s*(.+?)(?:\s*\((\d+)\s*min(?:utes?)?\))?$/i

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = []
  const listStack: Array<{ type: 'ul' | 'ol'; indent: number; count: number }> = []
  let kvBuffer: string[] = []
  let inFence = false
  let fenceLines: string[] = []
  let tableRows: string[][] | null = null

  const flushTable = () => {
    if (tableRows && tableRows.length > 0) blocks.push({ kind: 'table', rows: tableRows })
    tableRows = null
  }

  const closeAllLists = () => { listStack.length = 0 }

  const flushKV = () => {
    if (kvBuffer.length === 0) return
    if (kvBuffer.length >= 2) {
      const pairs: Array<[string, string]> = kvBuffer.map(line => {
        const ci = line.indexOf(':')
        return [line.slice(0, ci).trim(), line.slice(ci + 1).trim()]
      })
      blocks.push({ kind: 'kv', pairs })
    } else {
      blocks.push({ kind: 'p', text: kvBuffer[0] })
    }
    kvBuffer = []
  }

  for (const raw of md.split('\n')) {
    const line    = raw.trimEnd()
    const trimmed = line.trim()

    // Code fences: ``` toggles; inner lines are captured verbatim
    if (trimmed.startsWith('```')) {
      if (inFence) {
        blocks.push({ kind: 'code', lines: fenceLines })
        fenceLines = []
        inFence = false
      } else {
        closeAllLists(); flushKV(); flushTable()
        inFence = true
      }
      continue
    }
    if (inFence) { fenceLines.push(line); continue }

    // Tables: consecutive |...| lines; |---| separator rows are dropped
    if (trimmed.startsWith('|')) {
      closeAllLists(); flushKV()
      if (!/^\|[\s:|-]+\|?$/.test(trimmed)) {
        const cells = trimmed.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (!tableRows) tableRows = []
        tableRows.push(cells)
      }
      continue
    }
    if (tableRows) flushTable()

    if (trimmed.startsWith('### ')) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'h2', text: trimmed.slice(4) })
      continue
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'h1', text: trimmed.startsWith('## ') ? trimmed.slice(3) : trimmed.slice(2) })
      continue
    }
    if (trimmed.startsWith('> ')) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'quote', text: trimmed.slice(2) })
      continue
    }
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'hr' })
      continue
    }

    const ulM = line.match(/^(\s*)[-*+] (.*)$/)
    if (ulM) {
      flushKV()
      const indent = ulM[1].length
      while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) listStack.pop()
      let top = listStack[listStack.length - 1]
      if (!top || top.type !== 'ul' || top.indent !== indent) {
        if (top && top.indent === indent) listStack.pop()
        listStack.push({ type: 'ul', indent, count: 0 })
        top = listStack[listStack.length - 1]
      }
      blocks.push({ kind: 'li', text: ulM[2], ordered: false, index: 0, sub: indent > 0 })
      continue
    }

    const olM = line.match(/^(\s*)\d+[.)]\s+(.*)$/)
    if (olM) {
      flushKV()
      const indent = olM[1].length
      while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) listStack.pop()
      let top = listStack[listStack.length - 1]
      if (!top || top.type !== 'ol' || top.indent !== indent) {
        if (top && top.indent === indent) listStack.pop()
        listStack.push({ type: 'ol', indent, count: 0 })
        top = listStack[listStack.length - 1]
      }
      top.count += 1
      blocks.push({ kind: 'li', text: olM[2], ordered: true, index: top.count, sub: indent > 0 })
      continue
    }

    if (trimmed === '') { closeAllLists(); flushKV(); continue }

    const am = trimmed.replace(/^\*\*(.*)\*\*$/, '$1').match(ACT_RE)
    if (am) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'activity', num: am[1], title: am[2].trim(), time: am[3] })
      continue
    }

    // A standalone bold line is a section heading in disguise (common in AI output)
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      closeAllLists(); flushKV()
      blocks.push({ kind: 'h2', text: trimmed.replace(/^\*\*|\*\*:?$/g, '') })
      continue
    }

    if (listStack.length === 0) {
      const kvM = trimmed.match(/^([A-Z][A-Za-z &/]{1,24})\s*:\s*(.{0,55})$/)
      if (kvM) { kvBuffer.push(trimmed); continue }
    }

    closeAllLists(); flushKV()
    blocks.push({ kind: 'p', text: trimmed })
  }

  if (inFence && fenceLines.length > 0) blocks.push({ kind: 'code', lines: fenceLines })
  closeAllLists()
  flushKV()
  flushTable()
  return blocks
}

// ── Inline markdown → styled runs ───────────────────────────────────────────
interface Run { text: string; bold: boolean; italic: boolean; code: boolean }

function parseRuns(s: string): Run[] {
  const runs: Run[] = []
  let bold = false, italic = false, code = false
  let buf = ''
  const push = () => { if (buf) { runs.push({ text: buf, bold, italic, code }); buf = '' } }
  let i = 0
  while (i < s.length) {
    if (s.startsWith('***', i) || s.startsWith('___', i)) { push(); bold = !bold; italic = !italic; i += 3; continue }
    if (s.startsWith('**', i)  || s.startsWith('__', i))  { push(); bold = !bold; i += 2; continue }
    if (s[i] === '*') { push(); italic = !italic; i += 1; continue }
    if (s[i] === '`') { push(); code = !code; i += 1; continue }
    if (s[i] === '_' && (italic || i === 0 || /[\s(]/.test(s[i - 1]))) { push(); italic = !italic; i += 1; continue }
    buf += s[i]; i += 1
  }
  push()
  return runs
}

function plain(s: string): string {
  return parseRuns(s).map(r => r.text).join('')
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function printPDF({ title, subtitle, meta, content, type = 'default' }: PrintOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const cfg  = TYPE_CFG[type]
  const date = eatDate()

  const BG    = rgb(cfg.bg)
  const DEEP  = rgb(cfg.bgDeep)
  const LIGHT = rgb(cfg.bgLight)
  const MID   = rgb(cfg.bgMid)
  const INK   = rgb(cfg.ink)
  const AMBER = rgb(cfg.amber)
  const BODY: RGB  = [42, 58, 74]
  const TITLE_INK: RGB = [17, 30, 41]

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  // Brand fonts with full Unicode (Kiswahili accents, arrows, ≥, ✓); safe lookalikes if they cannot load.
  await brandDocument(doc)
  let y = 0

  // ── low-level helpers ──────────────────────────────────────────
  const setFill   = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const setStroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const setText   = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])

  const setRunFont = (run: Partial<Run>, size: number, serif: boolean) => {
    // One typeface family throughout; inline code keeps its colour but not a font without Unicode coverage.
    void serif
    const family = 'times'
    const style  = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal'
    doc.setFont(family, style)
    doc.setFontSize(size)
  }

  const ensureSpace = (h: number) => {
    if (y + h > BOTTOM) { doc.addPage(); y = TOP_NEXT }
  }

  // Wrap styled runs into lines of segments that fit maxW.
  interface Seg { text: string; run: Run }
  const wrapRuns = (runs: Run[], maxW: number, size: number, serif: boolean): Seg[][] => {
    const lines: Seg[][] = []
    let line: Seg[] = []
    let lineW = 0
    const pushLine = () => { if (line.length) { lines.push(line); line = []; lineW = 0 } }

    for (const run of runs) {
      setRunFont(run, size, serif)
      for (const token of run.text.split(/(\s+)/)) {
        if (!token) continue
        const w = doc.getTextWidth(token)
        if (lineW + w > maxW && lineW > 0) {
          pushLine()
          if (/^\s+$/.test(token)) continue // no leading whitespace on new line
        }
        const last = line[line.length - 1]
        if (last && last.run === run) last.text += token
        else line.push({ text: token, run })
        lineW += w
      }
    }
    pushLine()
    return lines.length ? lines : [[]]
  }

  const drawLine = (segs: Seg[], x: number, baseline: number, size: number, serif: boolean, color: RGB) => {
    let cx = x
    for (const seg of segs) {
      setRunFont(seg.run, size, serif)
      setText(seg.run.code ? INK : color)
      doc.text(seg.text, cx, baseline)
      cx += doc.getTextWidth(seg.text)
    }
  }

  // Paragraph that can break across pages line by line.
  const renderRuns = (
    text: string, x: number, maxW: number,
    opts: { size: number; lh: number; serif: boolean; color: RGB; forceItalic?: boolean },
  ) => {
    let runs = parseRuns(text)
    if (opts.forceItalic) runs = runs.map(r => ({ ...r, italic: true }))
    const lines = wrapRuns(runs, maxW, opts.size, opts.serif)
    for (const segs of lines) {
      ensureSpace(opts.lh)
      y += opts.lh
      drawLine(segs, x, y, opts.size, opts.serif, opts.color)
    }
  }

  // ── First-page header band ─────────────────────────────────────
  const HEADER_H = 46
  setFill(BG)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')
  // decorative circles, blended (no alpha state needed)
  setFill(mix(BG, WHITE, 0.07))
  doc.circle(168, -8, 32, 'F')
  setFill(mix(BG, WHITE, 0.05))
  doc.circle(34, 52, 24, 'F')
  // re-clip: repaint everything below the band white so circles cannot bleed into content
  setFill(WHITE)
  doc.rect(0, HEADER_H, PAGE_W, PAGE_H - HEADER_H, 'F')
  // vertical type column
  setFill(DEEP)
  doc.rect(PAGE_W - 22, 0, 22, HEADER_H, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setCharSpace(0.8)
  setText(mix(DEEP, WHITE, 0.88))
  // angle-90 text runs upward from its anchor; anchor at band centre + half the
  // text width keeps the label vertically centred inside the band
  const labelText = cfg.label.toUpperCase()
  const labelW = doc.getTextWidth(labelText)
  doc.text(labelText, PAGE_W - 10.5, Math.min(HEADER_H - 4, HEADER_H / 2 + labelW / 2), { angle: 90 })
  doc.setCharSpace(0)
  // brand block
  setFill(mix(BG, WHITE, 0.18))
  doc.roundedRect(ML, 8, 9.5, 9.5, 2, 2, 'F')
  setStroke(mix(BG, WHITE, 0.35))
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, 8, 9.5, 9.5, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  setText(WHITE)
  doc.text('M', ML + 4.75, 14.6, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Mwalimu AI', ML + 13, 12.4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  setText(mix(BG, WHITE, 0.65))
  doc.text('CBC Professional Development Platform', ML + 13, 16.4)
  // separator
  setFill(mix(BG, WHITE, 0.28))
  doc.rect(ML, 22.5, 12, 0.7, 'F')
  // title (max 2 lines, shrink when long)
  const titleMaxW = CW - 24
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16.5)
  let titleLines: string[] = doc.splitTextToSize(title, titleMaxW)
  if (titleLines.length > 1) {
    doc.setFontSize(13)
    titleLines = doc.splitTextToSize(title, titleMaxW).slice(0, 2)
  }
  setText(WHITE)
  const titleY = titleLines.length > 1 ? 30 : 32.5
  titleLines.forEach((tl, i) => doc.text(tl, ML, titleY + i * 6))
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setText(mix(BG, WHITE, 0.72))
    doc.text(doc.splitTextToSize(subtitle, titleMaxW)[0] ?? '', ML, titleLines.length > 1 ? 41 : 38.5)
  }

  // ── Meta ribbon ────────────────────────────────────────────────
  const RIB_Y = HEADER_H
  const RIB_H = 11
  setFill(LIGHT)
  doc.rect(0, RIB_Y, PAGE_W, RIB_H, 'F')
  setFill(MID)
  doc.rect(0, RIB_Y + RIB_H - 0.6, PAGE_W, 0.6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  const chipText = 'MWALIMU AI'
  const chipW = doc.getTextWidth(chipText) + 6
  setFill(BG)
  doc.roundedRect(ML, RIB_Y + 3.1, chipW, 4.8, 1.2, 1.2, 'F')
  setText(WHITE)
  doc.text(chipText, ML + chipW / 2, RIB_Y + 6.4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(INK)
  const ribbonParts = [date, ...(meta ? [meta] : []), 'CBC-Aligned, Kenya']
  doc.text(ribbonParts.join('   ·   '), ML + chipW + 4, RIB_Y + 6.6)

  y = RIB_Y + RIB_H + 9

  // ── Content blocks ─────────────────────────────────────────────
  const blocks = parseBlocks(content)

  for (const block of blocks) {
    switch (block.kind) {

      case 'h1': {
        ensureSpace(14)
        y += 6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setCharSpace(0.5)
        setText(BG)
        doc.text(plain(block.text).toUpperCase(), ML, y)
        doc.setCharSpace(0)
        y += 2.2
        setFill(BG)
        doc.rect(ML, y, CW, 0.7, 'F')
        y += 5
        break
      }

      case 'h2': {
        ensureSpace(11)
        y += 4.5
        setFill(BG)
        doc.rect(ML, y - 3, 1.1, 4.4, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.8)
        doc.setCharSpace(0.3)
        setText(INK)
        doc.text(plain(block.text).toUpperCase(), ML + 4, y)
        doc.setCharSpace(0)
        y += 3.5
        break
      }

      case 'p': {
        renderRuns(block.text, ML, CW, { size: 10, lh: 5, serif: true, color: BODY })
        y += 1.6
        break
      }

      case 'li': {
        const markerX = ML + (block.sub ? 7 : 1)
        const textX   = ML + (block.sub ? 13 : 6.5)
        const maxW    = CW - (textX - ML)
        const runs    = parseRuns(block.text)
        const lines   = wrapRuns(runs, maxW, 10, true)
        lines.forEach((segs, i) => {
          ensureSpace(4.9)
          y += 4.9
          if (i === 0) {
            if (block.ordered) {
              doc.setFont('helvetica', 'bold')
              doc.setFontSize(8.5)
              setText(block.sub ? [122, 143, 160] as RGB : BG)
              doc.text(`${block.index}.`, markerX, y)
            } else {
              doc.setFont('times', 'normal')
              doc.setFontSize(11)
              setText(block.sub ? [122, 143, 160] as RGB : BG)
              doc.text(block.sub ? '–' : '•', markerX, y)
            }
          }
          drawLine(segs, textX, y, 10, true, BODY)
        })
        y += 0.8
        break
      }

      case 'activity': {
        const hasTime = !!block.time
        const titleW  = CW - 24 - (hasTime ? 24 : 0)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.8)
        const tLines: string[] = doc.splitTextToSize(block.title, titleW)
        const cardH = Math.max(12, 7 + tLines.length * 4.6)
        ensureSpace(cardH + 5)
        y += 2.5
        setFill(LIGHT)
        setStroke(MID)
        doc.setLineWidth(0.25)
        doc.roundedRect(ML, y, CW, cardH, 1.8, 1.8, 'FD')
        setFill(BG)
        doc.rect(ML, y, 1.6, cardH, 'F')
        // number badge
        doc.circle(ML + 9, y + cardH / 2, 3.6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        setText(WHITE)
        doc.text(block.num, ML + 9, y + cardH / 2 + 1.05, { align: 'center' })
        // title
        doc.setFontSize(9.8)
        setText(TITLE_INK)
        const tStartY = y + cardH / 2 - ((tLines.length - 1) * 4.6) / 2 + 1.2
        tLines.forEach((tl, i) => doc.text(tl, ML + 15.5, tStartY + i * 4.6))
        // time chip
        if (hasTime) {
          doc.setFontSize(7.5)
          const timeText = `${block.time} min`
          const tw = doc.getTextWidth(timeText) + 6
          setFill(AMBER)
          doc.roundedRect(ML + CW - tw - 4, y + cardH / 2 - 2.8, tw, 5.6, 1.2, 1.2, 'F')
          setText(WHITE)
          doc.text(timeText, ML + CW - 4 - tw / 2, y + cardH / 2 + 1, { align: 'center' })
        }
        y += cardH + 3
        break
      }

      case 'kv': {
        const colW = CW / 2
        const cellPadX = 4
        const valueW = colW - cellPadX * 2
        y += 1.5
        for (let i = 0; i < block.pairs.length; i += 2) {
          const row = [block.pairs[i], block.pairs[i + 1]].filter(Boolean) as Array<[string, string]>
          // measure row height from the taller cell
          const cellLines = row.map(([, v]) => {
            doc.setFont('times', 'normal')
            doc.setFontSize(9.5)
            return doc.splitTextToSize(plain(v) || '-', valueW) as string[]
          })
          const rowH = Math.max(...cellLines.map(l => 8.5 + l.length * 4.3))
          ensureSpace(rowH)
          row.forEach(([k], col) => {
            const x = ML + col * colW
            setStroke(MID)
            doc.setLineWidth(0.25)
            doc.rect(x, y, colW, rowH, 'S')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(6.6)
            doc.setCharSpace(0.2)
            setText(INK)
            doc.text(k.toUpperCase(), x + cellPadX, y + 4.6)
            doc.setCharSpace(0)
            doc.setFont('times', 'normal')
            doc.setFontSize(9.5)
            setText(TITLE_INK)
            cellLines[col].forEach((vl, li) => doc.text(vl, x + cellPadX, y + 9 + li * 4.3))
          })
          y += rowH
        }
        y += 3
        break
      }

      case 'table': {
        const rows = block.rows
        if (rows.length === 0) break
        const n     = Math.max(...rows.map(r => r.length))
        const padX  = 2.5
        const lineH = 3.9
        // Column widths follow their content (a short "Score" column stays narrow), each between 12% and 60%.
        const weight = Array.from({ length: n }, (_, c) => Math.max(...rows.map(r => Math.min(plain(r[c] ?? '').length, 80)), 4))
        const totalW = weight.reduce((a, b) => a + b, 0)
        let widths = weight.map(w => Math.min(0.6, Math.max(0.12, w / totalW)))
        const norm = widths.reduce((a, b) => a + b, 0)
        widths = widths.map(w => (w / norm) * CW)
        const colX = widths.map((_, c) => ML + widths.slice(0, c).reduce((a, b) => a + b, 0))

        const measureCells = (cells: string[], bold: boolean, size: number): string[][] => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal')
          doc.setFontSize(size)
          return Array.from({ length: n }, (_, c) => doc.splitTextToSize(plain(cells[c] ?? ''), widths[c] - padX * 2) as string[])
        }
        const rowHeight = (cellTexts: string[][]) =>
          Math.max(1, ...cellTexts.map(l => l.length)) * lineH + 3.2

        y += 1.5
        const headLines = measureCells(rows[0], true, 8)
        const headH     = rowHeight(headLines)
        const drawHead = () => {
          setFill(BG)
          doc.rect(ML, y, CW, headH, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          setText(WHITE)
          headLines.forEach((cell, c) =>
            cell.forEach((tl, li) => doc.text(tl, colX[c] + padX, y + 4.5 + li * lineH)))
          y += headH
        }
        ensureSpace(headH + 9)
        drawHead()

        rows.slice(1).forEach((row, r) => {
          const bodyLines = measureCells(row, false, 8.5)
          const bodyH     = rowHeight(bodyLines)
          // A row never splits across pages, and the header is repeated at the top of the next page.
          if (y + bodyH > BOTTOM) { doc.addPage(); y = TOP_NEXT; drawHead() }
          if (r % 2 === 1) {
            setFill([246, 248, 250])
            doc.rect(ML, y, CW, bodyH, 'F')
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          setText(BODY)
          bodyLines.forEach((cell, c) =>
            cell.forEach((tl, li) => doc.text(tl, colX[c] + padX, y + 4.5 + li * lineH)))
          setStroke(MID)
          doc.setLineWidth(0.2)
          doc.line(ML, y + bodyH, ML + CW, y + bodyH)
          y += bodyH
        })
        y += 3
        break
      }

      case 'code': {
        const lineH = 3.8
        doc.setFont('courier', 'normal')
        doc.setFontSize(8)
        // Courier has no Unicode coverage: code lines are reduced to safe characters.
        const wrapped = block.lines.map(toSafeText).flatMap(l =>
          l.trim() === '' ? [''] : (doc.splitTextToSize(l, CW - 12) as string[]))
        let idx = 0
        while (idx < wrapped.length) {
          // fit what we can on this page, then continue on the next
          const room  = Math.max(1, Math.floor((BOTTOM - y - 6) / lineH))
          const chunk = wrapped.slice(idx, idx + room)
          const h     = chunk.length * lineH + 5
          ensureSpace(h)
          setFill([246, 248, 250])
          doc.rect(ML, y, CW, h, 'F')
          setFill(BG)
          doc.rect(ML, y, 1.2, h, 'F')
          doc.setFont('courier', 'normal')
          doc.setFontSize(8)
          setText(INK)
          chunk.forEach((tl, li) => doc.text(tl, ML + 5, y + 4.6 + li * lineH))
          y += h + 1
          idx += chunk.length
        }
        y += 2
        break
      }

      case 'quote': {
        doc.setFont('times', 'italic')
        doc.setFontSize(10)
        const qLines: string[] = doc.splitTextToSize(plain(block.text), CW - 14)
        const qH = qLines.length * 5 + 6
        ensureSpace(Math.min(qH + 4, BOTTOM - TOP_NEXT))
        y += 2
        setFill(LIGHT)
        doc.roundedRect(ML, y, CW, qH, 1.5, 1.5, 'F')
        setFill(BG)
        doc.rect(ML, y, 1.2, qH, 'F')
        setText([68, 85, 102])
        qLines.forEach((ql, i) => doc.text(ql, ML + 7, y + 6.2 + i * 5))
        y += qH + 3
        break
      }

      case 'hr': {
        ensureSpace(7)
        y += 3.5
        setFill(MID)
        doc.rect(ML, y, CW, 0.3, 'F')
        y += 3.5
        break
      }
    }
  }

  // ── Footer band + page numbers on every page ───────────────────
  const host = siteHost()
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    setFill(DEEP)
    doc.rect(0, PAGE_H - FOOT_H, PAGE_W, FOOT_H, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setText(WHITE)
    doc.text('Mwalimu AI', ML, PAGE_H - FOOT_H / 2 + 1.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.4)
    setText(mix(DEEP, WHITE, 0.8))
    doc.text(`CBC professional development  ·  ${host}`, PAGE_W / 2, PAGE_H - FOOT_H / 2 + 1.2, { align: 'center' })
    setText(mix(DEEP, WHITE, 0.7))
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MR, PAGE_H - FOOT_H / 2 + 1.2, { align: 'right' })
  }

  // ── Download ───────────────────────────────────────────────────
  const filename = title
    .replace(/[^a-z0-9 \-]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)
  doc.save(`${filename || 'Mwalimu_AI'}.pdf`)
}
