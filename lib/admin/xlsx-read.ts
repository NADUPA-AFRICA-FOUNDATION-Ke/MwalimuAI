/**
 * Dependency-free .xlsx reader, the counterpart of xlsx.ts. Reads the sheets of a workbook saved by Excel,
 * Numbers, LibreOffice or Google Sheets (stored or deflated zip parts, shared or inline strings) into plain text
 * rows. Formulas are read as their last calculated value. Runs in the browser and in Node 18+.
 */
export interface ReadSheet {
  name: string
  rows: string[][] // row 0 is the first row of the sheet; empty cells are ''
}

const dec = new TextDecoder()

interface ZipEntry {
  method: number
  compressedSize: number
  localOffset: number
}

function readZipDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('This file is not an Excel workbook (.xlsx).')
  const count = view.getUint16(end + 10, true)
  let p = view.getUint32(end + 16, true)
  const entries = new Map<string, ZipEntry>()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('The workbook is damaged. Open it in Excel and save it again.')
    const method = view.getUint16(p + 10, true)
    const compressedSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const localOffset = view.getUint32(p + 42, true)
    entries.set(dec.decode(bytes.subarray(p + 46, p + 46 + nameLen)), { method, compressedSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readPart(bytes: Uint8Array, entries: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const e = entries.get(name)
  if (!e) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = e.localOffset + 30 + view.getUint16(e.localOffset + 26, true) + view.getUint16(e.localOffset + 28, true)
  const raw = bytes.subarray(start, start + e.compressedSize)
  if (e.method === 0) return dec.decode(raw)
  if (e.method === 8) return dec.decode(await inflateRaw(raw))
  throw new Error('The workbook uses a compression this tool cannot read. Save it again as .xlsx.')
}

const unescapeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

/** The text inside <t> elements of a string item (rich text is several runs; phonetic runs are skipped). */
function itemText(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  let out = ''
  for (const m of withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g)) out += m[1] ?? ''
  return unescapeXml(out)
}

function columnIndex(ref: string): number {
  let n = 0
  for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const attrs = rowMatch[1]
    const rIdx = /\br="(\d+)"/.exec(attrs)
    const rowIndex = rIdx ? Number(rIdx[1]) - 1 : rows.length
    const cells: string[] = []
    for (const c of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cAttrs = c[1]
      const ref = /\br="([A-Z]+\d+)"/.exec(cAttrs)
      const col = ref ? columnIndex(ref[1]) : cells.length
      const type = /\bt="([^"]*)"/.exec(cAttrs)?.[1]
      const body = c[2] ?? ''
      let value = ''
      if (type === 'inlineStr') value = itemText(body)
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
        if (v !== undefined) {
          if (type === 's') value = shared[Number(v)] ?? ''
          else if (type === 'b') value = v === '1' ? 'Yes' : 'No'
          else if (type === 'str' || type === 'e') value = unescapeXml(v)
          else value = String(Number(v)) === 'NaN' ? unescapeXml(v) : String(Number(v))
        }
      }
      while (cells.length < col) cells.push('')
      cells[col] = value
    }
    while (rows.length < rowIndex) rows.push([])
    rows[rowIndex] = cells
  }
  return rows
}

export async function readXlsx(input: ArrayBuffer | Uint8Array): Promise<ReadSheet[]> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const entries = readZipDirectory(bytes)
  const workbook = await readPart(bytes, entries, 'xl/workbook.xml')
  if (!workbook) throw new Error('This file is not an Excel workbook (.xlsx).')
  const rels = (await readPart(bytes, entries, 'xl/_rels/workbook.xml.rels')) ?? ''
  const targets = new Map<string, string>()
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = /\bId="([^"]*)"/.exec(m[1])?.[1]
    const target = /\bTarget="([^"]*)"/.exec(m[1])?.[1]
    if (id && target) targets.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`)
  }
  const sharedXml = await readPart(bytes, entries, 'xl/sharedStrings.xml')
  const shared = sharedXml ? [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g)].map((m) => itemText(m[1] ?? '')) : []
  const sheets: ReadSheet[] = []
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = /\bname="([^"]*)"/.exec(m[1])?.[1]
    const rid = /\br:id="([^"]*)"/.exec(m[1])?.[1]
    const path = rid ? targets.get(rid) : undefined
    if (!name || !path) continue
    const xml = await readPart(bytes, entries, path)
    if (xml) sheets.push({ name: unescapeXml(name), rows: parseSheet(xml, shared) })
  }
  if (sheets.length === 0) throw new Error('The workbook has no sheets.')
  return sheets
}
