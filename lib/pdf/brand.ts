/**
 * Shared PDF foundation for every document Mwalimu AI produces (tool exports, certificates, reports).
 *
 * jsPDF's built-in fonts only cover Windows-1252, so characters teachers really use (ũ, ĩ, →, ≥, ✓, curly quotes)
 * printed as spaced-out garbage that ran off the page. `brandDocument` embeds the app's own fonts (Source Sans 3 for
 * text, Lexend for headings, subset to Latin + Kiswahili accents, punctuation, arrows and maths) and maps every
 * `setFont` call onto them, so existing drawing code needs no changes. If the fonts cannot be loaded (offline, first
 * visit), text is transliterated to safe lookalikes instead, so a PDF is never garbled.
 */
import type { jsPDF } from 'jspdf'

const FILES = {
  body: { normal: 'SourceSans3-Regular.ttf', bold: 'SourceSans3-Bold.ttf', italic: 'SourceSans3-It.ttf', bolditalic: 'SourceSans3-BoldIt.ttf' },
  display: { normal: 'Lexend-SemiBold.ttf', bold: 'Lexend-Bold.ttf' },
} as const

type Style = 'normal' | 'bold' | 'italic' | 'bolditalic'
const cache = new Map<string, string | null>()

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function loadFont(file: string): Promise<string | null> {
  if (cache.has(file)) return cache.get(file)!
  let data: string | null = null
  try {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function' && window.location?.origin) {
      const res = await fetch(`/fonts/${file}`)
      if (res.ok) data = toBase64(await res.arrayBuffer())
    } else {
      // Node (tests and sample generation): read the same file from public/.
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      data = (await fs.readFile(path.join(process.cwd(), 'public', 'fonts', file))).toString('base64')
    }
  } catch {
    data = null
  }
  cache.set(file, data)
  return data
}

/** Replacements used only when the brand fonts could not be embedded. */
const FALLBACK: Record<string, string> = {
  '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~', '×': 'x', '÷': '/',
  '✓': 'v', '✔': 'v', '✗': 'x', '✘': 'x', '•': '-', '…': '...', '−': '-',
}
export function toSafeText(s: string): string {
  return s
    .replace(/[→←↔⇒≥≤≠≈×÷✓✔✗✘•…−]/g, (c) => FALLBACK[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ũ -> u, é -> e
    .replace(/[^\x00-\xFF‘’“”–—€]/g, '?')
}

export interface Branded {
  /** True when the brand fonts are embedded (full Unicode). */
  fonts: boolean
}

/**
 * Embeds the brand fonts into `doc` and maps the classic families onto them:
 * helvetica/times → Source Sans 3 (headings in bold use Lexend), courier stays monospace only for plain ASCII.
 */
export async function brandDocument(doc: jsPDF): Promise<Branded> {
  const entries: [string, 'body' | 'display', Style][] = [
    [FILES.body.normal, 'body', 'normal'],
    [FILES.body.bold, 'body', 'bold'],
    [FILES.body.italic, 'body', 'italic'],
    [FILES.body.bolditalic, 'body', 'bolditalic'],
    [FILES.display.normal, 'display', 'normal'],
    [FILES.display.bold, 'display', 'bold'],
  ]
  const loaded = await Promise.all(entries.map(([f]) => loadFont(f)))
  const fonts = loaded.every(Boolean)
  if (fonts) {
    entries.forEach(([file, family, style], i) => {
      doc.addFileToVFS(file, loaded[i]!)
      doc.addFont(file, family === 'body' ? 'Body' : 'Display', style)
    })
  }

  const setFont = doc.setFont.bind(doc)
  doc.setFont = ((family: string, style?: string, weight?: string | number) => {
    const s = (style ?? 'normal') as Style
    if (!fonts) return setFont(family, style, weight)
    if (family === 'helvetica') return setFont(s === 'bold' ? 'Display' : 'Body', s === 'bold' ? 'bold' : s)
    if (family === 'times') return setFont('Body', s)
    if (family === 'courier') return setFont('courier', style, weight)
    return setFont(family, style, weight)
  }) as typeof doc.setFont

  if (!fonts) {
    const text = doc.text.bind(doc)
    doc.text = ((t: string | string[], ...rest: unknown[]) =>
      (text as (...a: unknown[]) => jsPDF)(Array.isArray(t) ? t.map(toSafeText) : toSafeText(t), ...rest)) as typeof doc.text
    const split = doc.splitTextToSize.bind(doc)
    doc.splitTextToSize = ((t: string, ...rest: unknown[]) => (split as (...a: unknown[]) => string[])(toSafeText(t), ...rest)) as typeof doc.splitTextToSize
    const width = doc.getTextWidth.bind(doc)
    doc.getTextWidth = ((t: string) => width(toSafeText(t))) as typeof doc.getTextWidth
  }
  return { fonts }
}

/** "7 October 2026" in Kenya time, whatever the device's time zone. */
export function eatDate(d = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })
}

/** "7 October 2026, 14:05 EAT". */
export function eatDateTime(d = new Date()): string {
  return `${d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' })} EAT`
}

/** The site's own address for footers: the one the document was made on, never a made-up domain. */
export function siteHost(): string {
  if (typeof window !== 'undefined' && window.location?.host) return window.location.host
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://mwalimu-ai-nu.vercel.app').replace(/^https?:\/\//, '').replace(/\/$/, '')
}
