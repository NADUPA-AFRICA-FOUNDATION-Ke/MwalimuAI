/**
 * Spreadsheet templates for content. Editors download a workbook (blank, or pre-filled with what is live), edit it in
 * Excel / Google Sheets, and upload it. `buildTemplate` writes the sheets; `parseWorkbook` reads them back into content
 * items plus readable, row-level problems. Nothing here touches the database: uploads are saved as drafts by
 * `admin.contentImport.apply`, which re-validates everything.
 *
 * Conventions in every sheet: row 1 is the header; rows starting with # are notes and ignored; empty rows are skipped;
 * "one per line" cells hold a list, one item on each line of the cell (Alt+Enter in Excel).
 */
import type { Sheet } from './xlsx'
import type { ReadSheet } from './xlsx-read'
import { validateContent, type ContentKind } from '@/convex/lib/contentValidation'
import { readinessProblem } from '@/convex/lib/contentWrite'

export type TemplateKind = 'path' | 'needs' | 'posts' | 'resources' | 'faq'

export interface ImportItem {
  kind: ContentKind
  key: string
  parent?: { kind: ContentKind; key: string }
  data: Record<string, any>
  label: string // shown to the editor, e.g. Lesson “Planning backwards”
  where: string // where it came from in the workbook, e.g. Lessons sheet, row 4
}
export interface Problem {
  level: 'error' | 'warning'
  where: string
  message: string
}
export interface Parsed {
  items: ImportItem[]
  problems: Problem[]
}

export const NEEDS_KEY = 'needs-assessment'
export const RESOURCES_KEY = 'resources'
export const FAQ_KEY = 'faq'
export const MAX_IMPORT_ITEMS = 300

export const TEMPLATES: Record<TemplateKind, { title: string; blurb: string; file: string; sheets: string }> = {
  path: {
    title: 'Learning path',
    blurb: 'A whole course: its details, modules, lessons, pre and post assessments, assignment and certificate, with optional Kiswahili.',
    file: 'mwalimu-learning-path',
    sheets: 'Path, Modules, Lessons, Quizzes',
  },
  needs: {
    title: 'Needs assessment',
    blurb: 'The questionnaire new learners take, and the rules that recommend learning paths from their answers.',
    file: 'mwalimu-needs-assessment',
    sheets: 'Details, Sections, Questions, Recommendations',
  },
  posts: {
    title: 'Blog posts',
    blurb: 'One row per article. New slugs are added, existing slugs are updated.',
    file: 'mwalimu-blog-posts',
    sheets: 'Posts',
  },
  resources: {
    title: 'Resource library',
    blurb: 'The downloadable guides, templates and links teachers see. Replaces the whole list.',
    file: 'mwalimu-resources',
    sheets: 'Resources',
  },
  faq: {
    title: 'FAQ',
    blurb: 'Questions and answers grouped by section. Replaces the whole FAQ.',
    file: 'mwalimu-faq',
    sheets: 'FAQ',
  },
}

const TRACKS = ['core', 'stem', 'languages', 'humanities', 'leadership', 'wellbeing']
const RESOURCE_TYPES = ['PDF', 'Video', 'Link', 'Template', 'Audio']
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,59}$/
const LETTERS = ['A', 'B', 'C', 'D']

// ---------- small helpers ----------

const norm = (s: string) => s.replace(/\([\s\S]*$/, '').replace(/[*:]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const clean = (s: string | undefined) => (s ?? '').replace(/\r\n?/g, '\n').trim()
const isNote = (cells: string[]) => clean(cells.find((c) => clean(c)) ?? '').startsWith('#')
const isBlank = (cells: string[]) => cells.every((c) => !clean(c))
const lines = (s: string | undefined) =>
  clean(s)
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
const commas = (s: string | undefined) =>
  clean(s)
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
const yes = (s: string | undefined, whenBlank: boolean) => {
  const v = clean(s).toLowerCase()
  return v === '' ? whenBlank : /^(y|yes|true|1|x)$/.test(v)
}
const slug = (s: string) =>
  clean(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
const join = (v: unknown) => (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '')
const yn = (b: unknown) => (b ? 'yes' : 'no')

function findSheet(sheets: ReadSheet[], name: string) {
  return sheets.find((s) => norm(s.name) === name.toLowerCase())
}

interface Table {
  sheet: string
  rows: { cells: string[]; row: number }[]
  col: (cells: string[], header: string) => string
  has: (header: string) => boolean
}

/** Finds the header row of a sheet and returns its data rows. Reports missing required columns once, plainly. */
function readTable(sheets: ReadSheet[], name: string, required: string[], problems: Problem[], optional = false): Table | null {
  const sheet = findSheet(sheets, name)
  if (!sheet) {
    if (!optional) problems.push({ level: 'error', where: name, message: `The “${name}” sheet is missing. Download a fresh template and copy your content into it.` })
    return null
  }
  const headerAt = sheet.rows.findIndex((r) => !isBlank(r))
  if (headerAt < 0) {
    if (!optional) problems.push({ level: 'error', where: name, message: `The “${name}” sheet is empty.` })
    return null
  }
  const index = new Map<string, number>()
  sheet.rows[headerAt].forEach((h, i) => {
    const n = norm(h ?? '')
    if (n && !index.has(n)) index.set(n, i)
  })
  const missing = required.filter((h) => !index.has(h.toLowerCase()))
  if (missing.length) {
    problems.push({ level: 'error', where: name, message: `The “${name}” sheet is missing the column${missing.length > 1 ? 's' : ''}: ${missing.map((m) => `“${m}”`).join(', ')}. Keep the header row from the template.` })
    return null
  }
  const rows = sheet.rows
    .map((cells, i) => ({ cells, row: i + 1 }))
    .slice(headerAt + 1)
    .filter((r) => !isBlank(r.cells) && !isNote(r.cells))
  return {
    sheet: name,
    rows,
    has: (h) => index.has(h.toLowerCase()),
    col: (cells, h) => {
      const i = index.get(h.toLowerCase())
      return i === undefined ? '' : clean(cells[i])
    },
  }
}

const at = (t: Table, row: number) => `${t.sheet} sheet, row ${row}`
const error = (problems: Problem[], where: string, message: string) => problems.push({ level: 'error', where, message })

function makeKey(raw: string, taken: Set<string>, prefix: string, where: string, problems: Problem[]) {
  let key = clean(raw)
  if (key) {
    key = key.toLowerCase().replace(/\s+/g, '-')
    if (!KEY_RE.test(key)) {
      error(problems, where, `“${raw}” is not a valid ID. Use lowercase letters, numbers and dashes only (for example ${prefix}1).`)
      return null
    }
    if (taken.has(key)) {
      error(problems, where, `The ID “${key}” is used twice. Every ID must be different.`)
      return null
    }
  } else {
    let n = taken.size + 1
    while (taken.has(`${prefix}${n}`)) n++
    key = `${prefix}${n}`
  }
  taken.add(key)
  return key
}

const excelDate = (s: string) => {
  if (!/^\d{5}(\.\d+)?$/.test(s)) return s
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86_400_000)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// ---------- shared start-here sheet ----------

const startHere = (title: string, steps: string[]): Sheet => ({
  name: 'Start here',
  wrap: true,
  widths: [110],
  rows: [
    [title],
    [''],
    ['HOW TO USE THIS FILE'],
    ['1. Fill in the sheets that follow. Replace the grey example rows (they start with #), or just delete them. Rows starting with # are ignored.'],
    ['2. Save the file as Excel (.xlsx). Do not rename the sheets or the header row (the first row).'],
    ['3. In the admin console go to Content → Upload & templates, choose this file, check the preview and press Save as drafts.'],
    ['4. Nothing goes live yet. Your upload becomes drafts: send them for review, a second person approves, then publish.'],
    [''],
    ['WHAT TO KNOW'],
    ...steps.map((s) => [s]),
    [''],
    ['TIPS'],
    ['• A cell that says “one per line” holds a list: press Alt+Enter (Option+Enter on Mac) to start a new line inside the cell.'],
    ['• You can format text in lessons and articles with: ## Heading, ### Smaller heading, **bold**, *italic*, “- ” at the start of a line for bullets, and “1. ” for numbered lists.'],
    ['• Leave an ID blank for something new; the system picks one. When you edit existing content, keep its ID so it is updated instead of duplicated.'],
    ['• Anything wrong is listed with its sheet and row in the preview before anything is saved, so you cannot break the live site by uploading.'],
  ],
})

// ---------- learning path ----------

type Row = Record<string, any>

const PATH_FIELDS: { field: string; note: string }[] = [
  { field: 'Path ID', note: 'Short code in lowercase letters, numbers and dashes, e.g. cbc-foundations. Keep it unchanged when editing an existing path.' },
  { field: 'Title', note: 'The name learners see.' },
  { field: 'Short title', note: 'A shorter name for cards and certificates (up to 100 characters). Leave blank to use the title.' },
  { field: 'Tagline', note: 'One line under the title.' },
  { field: 'Description', note: 'A paragraph about who the path is for and what they will gain.' },
  { field: 'Track', note: `One of: ${TRACKS.join(', ')}.` },
  { field: 'Hours', note: 'Total learning time as a number, e.g. 6.' },
  { field: 'KICD alignment', note: 'Optional. Which KICD / CBC outcomes this supports.' },
  { field: 'Available to learners', note: 'yes = open to learners once published. Use no to prepare a path without opening it.' },
  { field: 'Coming soon', note: 'yes shows a “launching soon” card with no lessons yet.' },
  { field: 'Short course', note: 'yes for a short course without an assignment or certificate.' },
  { field: 'CBC levels', note: 'Optional, separated by commas, e.g. Grade 4, Grade 5. Used for filtering.' },
  { field: 'Subjects', note: 'Optional, separated by commas.' },
  { field: 'Counties', note: 'Optional, separated by commas. Leave blank for all of Kenya.' },
  { field: 'Assignment title', note: 'Required for an available path that is not a short course.' },
  { field: 'Assignment background', note: 'Context for the assignment.' },
  { field: 'Assignment task', note: 'What the learner must do and submit.' },
  { field: 'Assignment hints', note: 'One per line.' },
  { field: 'Assignment rubric', note: 'One criterion per line.' },
  { field: 'Certificate subtitle', note: 'Text under the learner’s name on the certificate. Required for an available path that is not a short course.' },
  { field: 'Certificate skills', note: 'One skill per line (up to 12).' },
]
const PATH_SW = new Set(['title', 'short title', 'tagline', 'description', 'assignment title', 'assignment background', 'assignment task', 'assignment hints', 'assignment rubric', 'certificate subtitle', 'certificate skills'])

const LESSON_HEAD = ['Module ID (or title)', 'Lesson ID', 'Title', 'Duration', 'Video title', 'Key points (one per line)', 'Reading', 'Reflection question', 'Reflection hint', 'Kiswahili title', 'Kiswahili video title', 'Kiswahili key points (one per line)', 'Kiswahili reading', 'Kiswahili reflection question', 'Kiswahili reflection hint']
const QUIZ_HEAD = ['Quiz', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct answer (A, B, C or D)', 'Why it is correct', 'Question ID', 'Kiswahili question', 'Kiswahili option A', 'Kiswahili option B', 'Kiswahili option C', 'Kiswahili option D', 'Kiswahili why it is correct']

function pathSheets(items: ImportItem[] | null): Sheet[] {
  const byKind = (k: ContentKind) => (items ?? []).filter((i) => i.kind === k)
  const program = byKind('program')[0]
  const p = program?.data ?? {}
  const sw = p.sw ?? {}
  const val: Record<string, [string, string]> = program
    ? {
        'path id': [program.key, ''],
        title: [p.title ?? '', sw.title ?? ''],
        'short title': [p.shortTitle ?? '', sw.shortTitle ?? ''],
        tagline: [p.tagline ?? '', sw.tagline ?? ''],
        description: [p.description ?? '', sw.description ?? ''],
        track: [p.track ?? 'core', ''],
        hours: [String(p.hours ?? ''), ''],
        'kicd alignment': [p.kicdAlignment ?? '', ''],
        'available to learners': [yn(p.available !== false), ''],
        'coming soon': [yn(p.launchingSoon), ''],
        'short course': [yn(p.shortCourse), ''],
        'cbc levels': [(p.tags?.cbcLevels ?? []).join(', '), ''],
        subjects: [(p.tags?.subjects ?? []).join(', '), ''],
        counties: [(p.tags?.counties ?? []).join(', '), ''],
        'assignment title': [p.assignment?.title ?? '', sw.assignment?.title ?? ''],
        'assignment background': [p.assignment?.context ?? '', sw.assignment?.context ?? ''],
        'assignment task': [p.assignment?.task ?? '', sw.assignment?.task ?? ''],
        'assignment hints': [join(p.assignment?.hints), join(sw.assignment?.hints)],
        'assignment rubric': [join(p.assignment?.rubric), join(sw.assignment?.rubric)],
        'certificate subtitle': [p.certificate?.subtitle ?? '', sw.certificate?.subtitle ?? ''],
        'certificate skills': [join(p.certificate?.skills), join(sw.certificate?.skills)],
      }
    : {}
  const example: Record<string, string> = { track: 'core', 'available to learners': 'yes', 'coming soon': 'no', 'short course': 'no' }
  const pathRows: (string | number)[][] = [['Field', 'English', 'Kiswahili (optional)', 'Notes']]
  for (const f of PATH_FIELDS) {
    const k = norm(f.field)
    const [en, swv] = val[k] ?? [program ? '' : (example[k] ?? ''), '']
    pathRows.push([f.field, en, PATH_SW.has(k) ? swv : '', f.note])
  }

  const modules = byKind('module').sort((a, b) => a.data.orderIndex - b.data.orderIndex)
  const moduleRows: (string | number)[][] = [['Module ID', 'Title', 'Description', 'Kiswahili title', 'Kiswahili description']]
  for (const m of modules) moduleRows.push([m.key, m.data.title ?? '', m.data.description ?? '', m.data.sw?.title ?? '', m.data.sw?.description ?? ''])
  if (!modules.length) moduleRows.push(['# m1', 'Planning with the CBC', 'What this module covers', '', ''])

  const lessons = byKind('lesson')
  const lessonRows: (string | number)[][] = [LESSON_HEAD]
  for (const m of modules)
    for (const l of lessons.filter((x) => x.parent?.key === m.key).sort((a, b) => a.data.orderIndex - b.data.orderIndex)) {
      const d = l.data
      const s = d.sw ?? {}
      lessonRows.push([m.key, l.key, d.title ?? '', d.duration ?? '', d.videoTitle ?? '', join(d.videoPoints), d.reading ?? '', d.reflectionPrompt ?? '', d.reflectionPlaceholder ?? '', s.title ?? '', s.videoTitle ?? '', join(s.videoPoints), s.reading ?? '', s.reflectionPrompt ?? '', s.reflectionPlaceholder ?? ''])
    }
  if (lessonRows.length === 1) lessonRows.push(['# m1', 'l1', 'Backwards design', '15 min', 'Optional video title', 'First key point\nSecond key point', '## Start here\n\nWrite the lesson text. Use ## for headings and - for bullets.', 'What will you change in your next lesson?', 'Write a sentence or two…', '', '', '', '', '', ''])

  const quizzes = byKind('quiz').sort((a, b) => a.data.orderIndex - b.data.orderIndex)
  const quizRows: (string | number)[][] = [QUIZ_HEAD]
  for (const q of quizzes)
    q.data.questions?.forEach((qq: any, i: number) => {
      const s = q.data.sw?.questions?.[i] ?? {}
      const o = s.options ?? []
      quizRows.push([q.data.kind, qq.question, ...qq.options, LETTERS[qq.correct] ?? 'A', qq.explanation ?? '', qq.id, s.question ?? '', o[0] ?? '', o[1] ?? '', o[2] ?? '', o[3] ?? '', s.explanation ?? ''])
    })
  if (quizRows.length === 1) quizRows.push(['# pre', 'Which of these is a formative assessment?', 'A unit exam', 'An end-of-year test', 'A quick check during the lesson', 'A national exam', 'C', 'Formative assessment happens during learning.', '', '', '', '', '', '', ''])

  return [
    startHere(program ? `Learning path: ${p.title ?? program.key}` : 'Learning path template', [
      '• Path sheet: one row per detail. Fill the English column. (Kiswahili columns, if your file has them, are optional.)',
      '• Modules sheet: one row per module, in the order learners see them.',
      '• Lessons sheet: one row per lesson. Say which module it belongs to by typing that module’s ID or title from the Modules sheet. Lessons appear in row order.',
      '• Quizzes sheet: one row per question. Quiz is pre (taken before the path) or post (taken at the end). Correct answer is A, B, C or D. Leave Question ID blank for new questions.',
      '• Uploading never deletes. To remove a lesson or module, archive it in the content studio.',
      '• Uploading to an existing path updates it. Download the path from the upload page to start from what is already there.',
    ]),
    { name: 'Path', wrap: true, widths: [24, 50, 50, 60], rows: pathRows },
    { name: 'Modules', wrap: true, widths: [14, 36, 50, 36, 50], rows: moduleRows },
    { name: 'Lessons', wrap: true, widths: [12, 12, 30, 12, 26, 34, 70, 34, 30, 30, 26, 34, 70, 34, 30], rows: lessonRows },
    { name: 'Quizzes', wrap: true, widths: [8, 44, 26, 26, 26, 26, 14, 40, 12, 44, 24, 24, 24, 24, 40], rows: quizRows },
  ]
}

function parsePath(sheets: ReadSheet[], problems: Problem[]): ImportItem[] {
  const out: ImportItem[] = []
  const pathT = readTable(sheets, 'Path', ['field', 'english'], problems)
  const modT = readTable(sheets, 'Modules', ['module id', 'title'], problems)
  const lesT = readTable(sheets, 'Lessons', ['module id', 'title', 'reading'], problems)
  const quizT = readTable(sheets, 'Quizzes', ['quiz', 'question', 'option a', 'option b', 'option c', 'option d', 'correct answer'], problems, true)
  if (!pathT || !modT || !lesT) return out

  const fields = new Map<string, { en: string; sw: string; row: number }>()
  for (const r of pathT.rows) fields.set(norm(pathT.col(r.cells, 'field')), { en: pathT.col(r.cells, 'english'), sw: pathT.col(r.cells, 'kiswahili'), row: r.row })
  const f = (name: string) => fields.get(name)?.en ?? ''
  const w = (name: string) => `Path sheet, row ${fields.get(name)?.row ?? 1}`

  const programKey = f('path id').toLowerCase().replace(/\s+/g, '-')
  if (!programKey) error(problems, w('path id'), 'Enter a Path ID, for example cbc-foundations.')
  else if (!KEY_RE.test(programKey)) error(problems, w('path id'), `“${f('path id')}” is not a valid Path ID. Use lowercase letters, numbers and dashes only.`)
  const track = f('track').toLowerCase()
  if (!TRACKS.includes(track)) error(problems, w('track'), `Choose a track: ${TRACKS.join(', ')}.`)
  const hoursText = f('hours')
  const hours = hoursText === '' ? NaN : Number(hoursText)
  if (!Number.isFinite(hours) || hours < 0 || hours > 500) error(problems, w('hours'), 'Hours must be a number, for example 6.')

  const swVal = (name: string) => fields.get(name)?.sw ?? ''
  const swAny = [...PATH_SW].some((k) => clean(swVal(k)))
  // Without a Kiswahili column the upload says nothing about translations, so existing ones are kept.
  const swProgram = swAny
    ? {
        title: swVal('title'),
        shortTitle: swVal('short title'),
        tagline: swVal('tagline'),
        description: swVal('description'),
        assignment: { title: swVal('assignment title'), context: swVal('assignment background'), task: swVal('assignment task'), hints: lines(swVal('assignment hints')), rubric: lines(swVal('assignment rubric')) },
        certificate: { subtitle: swVal('certificate subtitle'), skills: lines(swVal('certificate skills')) },
      }
    : null
  const title = f('title')
  const program: Row = {
    title,
    shortTitle: f('short title') || title.slice(0, 100),
    tagline: f('tagline'),
    description: f('description'),
    track,
    hours,
    kicdAlignment: f('kicd alignment'),
    available: yes(f('available to learners'), true),
    launchingSoon: yes(f('coming soon'), false),
    shortCourse: yes(f('short course'), false),
    assignment: { title: f('assignment title'), context: f('assignment background'), task: f('assignment task'), hints: lines(f('assignment hints')), rubric: lines(f('assignment rubric')) },
    certificate: { subtitle: f('certificate subtitle'), skills: lines(f('certificate skills')) },
    tags: { cbcLevels: commas(f('cbc levels')), subjects: commas(f('subjects')), counties: commas(f('counties')) },
    ...(pathT.has('kiswahili') ? { sw: swProgram } : {}),
  }
  if (!title) error(problems, w('title'), 'Enter the path title.')
  out.push({ kind: 'program', key: programKey, data: program, label: `Learning path “${title || programKey}”`, where: 'Path sheet' })
  const parent = { kind: 'program' as const, key: programKey }

  // Modules
  const moduleKeys = new Set<string>()
  modT.rows.forEach((r, n) => {
    const where = at(modT, r.row)
    const key = makeKey(modT.col(r.cells, 'module id'), moduleKeys, 'm', where, problems)
    const mTitle = modT.col(r.cells, 'title')
    if (!mTitle) error(problems, where, 'This module needs a title.')
    if (!key) return
    const swT = modT.col(r.cells, 'kiswahili title'), swD = modT.col(r.cells, 'kiswahili description')
    out.push({
      kind: 'module',
      key,
      parent,
      data: { title: mTitle, description: modT.col(r.cells, 'description'), orderIndex: n, ...(modT.has('kiswahili title') ? { sw: swT || swD ? { title: swT, description: swD } : null } : {}) },
      label: `Module “${mTitle || key}”`,
      where,
    })
  })
  if (!modT.rows.length) error(problems, 'Modules sheet', 'Add at least one module.')

  // Lessons
  const lessonKeys = new Map<string, Set<string>>()
  const lessonCount = new Map<string, number>()
  lesT.rows.forEach((r) => {
    const where = at(lesT, r.row)
    // Editors may type the module's ID or just its title.
    const rawModule = lesT.col(r.cells, 'module id')
    const typed = rawModule.toLowerCase().replace(/\s+/g, '-')
    const moduleKey = moduleKeys.has(typed) ? typed : (out.find((i) => i.kind === 'module' && clean(i.data.title).toLowerCase() === rawModule.toLowerCase())?.key ?? typed)
    if (!moduleKeys.has(moduleKey)) {
      error(problems, where, rawModule ? `The module “${rawModule}” is not on the Modules sheet. Use a module ID or title from that sheet: ${out.filter((i) => i.kind === 'module').map((m) => `${m.key} (${m.data.title})`).join(', ') || '(none yet)'}.` : 'Say which module this lesson belongs to (its ID or title from the Modules sheet).')
      return
    }
    if (!lessonKeys.has(moduleKey)) lessonKeys.set(moduleKey, new Set())
    const key = makeKey(lesT.col(r.cells, 'lesson id'), lessonKeys.get(moduleKey)!, 'l', where, problems)
    const lTitle = lesT.col(r.cells, 'title')
    const reading = lesT.col(r.cells, 'reading')
    if (!lTitle) error(problems, where, 'This lesson needs a title.')
    if (!reading) error(problems, where, 'This lesson needs its Reading text.')
    if (!key) return
    const order = lessonCount.get(moduleKey) ?? 0
    lessonCount.set(moduleKey, order + 1)
    const s = {
      title: lesT.col(r.cells, 'kiswahili title'),
      videoTitle: lesT.col(r.cells, 'kiswahili video title'),
      videoPoints: lines(lesT.col(r.cells, 'kiswahili key points')),
      reading: lesT.col(r.cells, 'kiswahili reading'),
      reflectionPrompt: lesT.col(r.cells, 'kiswahili reflection question'),
      reflectionPlaceholder: lesT.col(r.cells, 'kiswahili reflection hint'),
    }
    const hasSw = Boolean(s.title || s.videoTitle || s.videoPoints.length || s.reading || s.reflectionPrompt || s.reflectionPlaceholder)
    out.push({
      kind: 'lesson',
      key,
      parent: { kind: 'module', key: moduleKey },
      data: {
        title: lTitle,
        duration: lesT.col(r.cells, 'duration') || '10 min',
        videoTitle: lesT.col(r.cells, 'video title'),
        videoPoints: lines(lesT.col(r.cells, 'key points')),
        reading,
        reflectionPrompt: lesT.col(r.cells, 'reflection question'),
        reflectionPlaceholder: lesT.col(r.cells, 'reflection hint'),
        orderIndex: order,
        ...(lesT.has('kiswahili reading') ? { sw: hasSw ? s : null } : {}),
      },
      label: `Lesson “${lTitle || key}”`,
      where,
    })
  })
  if (!lesT.rows.length) error(problems, 'Lessons sheet', 'Add at least one lesson.')

  // Quizzes
  const quizzes = new Map<'pre' | 'post', { q: any; row: number }[]>()
  for (const r of quizT?.rows ?? []) {
    const where = at(quizT!, r.row)
    const which = quizT!.col(r.cells, 'quiz').toLowerCase()
    const kind = /^(pre|before|start)/.test(which) ? 'pre' : /^(post|after|end|final)/.test(which) ? 'post' : null
    if (!kind) {
      error(problems, where, 'Write pre (before the path) or post (at the end) in the Quiz column.')
      continue
    }
    const question = quizT!.col(r.cells, 'question')
    const options = ['a', 'b', 'c', 'd'].map((l) => quizT!.col(r.cells, `option ${l}`))
    const ans = /^(?:option\s*)?([a-d1-4])\b/i.exec(quizT!.col(r.cells, 'correct answer'))
    if (!question) error(problems, where, 'This question has no text.')
    else if (options.some((o) => !o)) error(problems, where, 'Fill in all four options (A, B, C and D).')
    else if (!ans) error(problems, where, 'Correct answer must be A, B, C or D.')
    if (!question || options.some((o) => !o) || !ans) continue
    const correct = /\d/.test(ans[1]) ? Number(ans[1]) - 1 : ans[1].toLowerCase().charCodeAt(0) - 97
    const list = quizzes.get(kind) ?? []
    list.push({
      row: r.row,
      q: {
        id: quizT!.col(r.cells, 'question id'),
        question,
        options,
        correct,
        explanation: quizT!.col(r.cells, 'why it is correct'),
        sw: { question: quizT!.col(r.cells, 'kiswahili question'), options: ['a', 'b', 'c', 'd'].map((l) => quizT!.col(r.cells, `kiswahili option ${l}`)), explanation: quizT!.col(r.cells, 'kiswahili why it is correct') },
      },
    })
    quizzes.set(kind, list)
  }
  for (const kind of ['pre', 'post'] as const) {
    const list = quizzes.get(kind)
    if (!list) continue
    const ids = new Set<string>()
    let next = 1
    const questions = list.map(({ q, row }) => {
      let id = q.id.trim()
      if (id) {
        if (ids.has(id)) error(problems, `Quizzes sheet, row ${row}`, `The Question ID “${id}” is used twice in the ${kind} quiz.`)
      } else {
        while (ids.has(`q${next}`) || list.some((x) => x.q.id.trim() === `q${next}`)) next++
        id = `q${next}`
      }
      ids.add(id)
      return { ...q, id }
    })
    const hasSw = questions.some((q) => q.sw.question || q.sw.explanation || q.sw.options.some(Boolean))
    out.push({
      kind: 'quiz',
      key: kind,
      parent,
      data: {
        kind,
        orderIndex: kind === 'pre' ? 0 : 1,
        questions: questions.map(({ sw: _s, ...q }) => q),
        ...(quizT?.has('kiswahili question') ? { sw: hasSw ? { questions: questions.map((q) => q.sw) } : null } : {}),
      },
      label: `${kind === 'pre' ? 'Pre' : 'Post'}-assessment quiz (${questions.length} questions)`,
      where: `Quizzes sheet (${kind})`,
    })
  }
  return out
}

// ---------- needs assessment ----------

const NEEDS_TYPES: Record<string, string> = { scale: 'scale', single: 'radio', radio: 'radio', 'single choice': 'radio', multiple: 'multiple', 'multiple choice': 'multiple', knowledge: 'knowledge', quiz: 'knowledge' }
const typeLabel = (t: string) => (t === 'radio' ? 'single' : t)

function needsSheets(items: ImportItem[] | null): Sheet[] {
  const a = items?.find((i) => i.kind === 'assessment')?.data
  const detail: string[][] = [['Field', 'Value', 'Notes']]
  detail.push(['Title', a?.title ?? 'Teacher needs assessment', 'Name of the questionnaire.'])
  detail.push(['Introduction', a?.intro ?? '', 'A sentence or two shown before the first question.'])
  detail.push(['Fallback paths', join(a?.fallbackProgramIds), 'Path IDs, one per line, recommended when no rule matches.'])
  const sections: string[][] = [['Section title', 'Description']]
  for (const s of a?.sections ?? []) sections.push([s.title ?? '', s.description ?? ''])
  if (!a) sections.push(['# Your teaching today', 'Short description shown above the questions'])
  const questions: (string | number)[][] = [['Question ID', 'Section', 'Type', 'Question', 'Help text', 'Options (one per line)', 'Correct option (knowledge only)', 'Why (knowledge only)', 'Low label (scale only)', 'High label (scale only)', 'Max choices (multiple only)']]
  for (const q of a?.questions ?? [])
    questions.push([q.id, (q.section ?? 0) + 1, typeLabel(q.type), q.question ?? '', q.subtext ?? '', join(q.options), q.type === 'knowledge' ? (LETTERS.concat(['E', 'F', 'G', 'H'])[q.correctIndex] ?? '') : '', q.explanation ?? '', q.minLabel ?? '', q.maxLabel ?? '', q.type === 'multiple' && q.maxSelect ? q.maxSelect : ''])
  if (!a) questions.push(['# confidence', 1, 'scale', 'How confident are you planning CBC lessons?', 'Choose a number', '', '', '', 'Not confident', 'Very confident', ''])
  const rules: string[][] = [['Rule', 'Recommend path ID', 'Question ID', 'Answers (one per line)']]
  ;(a?.rules ?? []).forEach((r: any, i: number) => {
    const when = r.when?.length ? r.when : [{ questionId: '', answers: [] }]
    when.forEach((w: any, n: number) => rules.push([String(i + 1), n === 0 ? r.programId : '', w.questionId, join(w.answers)]))
  })
  if (!a) rules.push(['# 1', 'cbc-foundations', 'confidence', 'Answer text exactly as written in the options'])
  return [
    startHere(a ? 'Needs assessment' : 'Needs assessment template', [
      '• Details sheet: the title, introduction and the paths recommended when nothing else matches.',
      '• Sections sheet: one row per section, in order. Questions point to a section by number (1 = first row).',
      '• Questions sheet: Type is scale (a 1–5 rating), single (pick one), multiple (pick several) or knowledge (a marked quiz question; give the correct option as a letter A, B, C…). Options go one per line.',
      '• Recommendations sheet: a rule recommends a path when the learner gave the listed answers. Rows with the same Rule number belong to one rule: put the path ID on the first row and one condition (Question ID + answers) on each row. Answers must be written exactly as in the options.',
      '• This replaces the whole questionnaire. Download the live one first and edit it.',
    ]),
    { name: 'Details', wrap: true, widths: [20, 60, 60], rows: detail },
    { name: 'Sections', wrap: true, widths: [40, 70], rows: sections },
    { name: 'Questions', wrap: true, widths: [20, 10, 12, 50, 36, 50, 14, 40, 18, 18, 14], rows: questions },
    { name: 'Recommendations', wrap: true, widths: [8, 28, 26, 70], rows: rules },
  ]
}

function parseNeeds(sheets: ReadSheet[], problems: Problem[]): ImportItem[] {
  const det = readTable(sheets, 'Details', ['field', 'value'], problems)
  const secT = readTable(sheets, 'Sections', ['section title'], problems)
  const qT = readTable(sheets, 'Questions', ['question id', 'section', 'type', 'question'], problems)
  const ruleT = readTable(sheets, 'Recommendations', ['rule', 'recommend path id', 'question id', 'answers'], problems, true)
  if (!det || !secT || !qT) return []
  const d = new Map(det.rows.map((r) => [norm(det.col(r.cells, 'field')), det.col(r.cells, 'value')]))
  if (!d.get('title')) error(problems, 'Details sheet', 'Enter the questionnaire title.')
  const sections = secT.rows.map((r) => ({ title: secT.col(r.cells, 'section title'), description: secT.col(r.cells, 'description'), row: r.row }))
  if (!sections.length) error(problems, 'Sections sheet', 'Add at least one section.')
  sections.forEach((s) => !s.title && error(problems, `Sections sheet, row ${s.row}`, 'This section needs a title.'))

  const ids = new Set<string>()
  const questions: Row[] = []
  for (const r of qT.rows) {
    const where = at(qT, r.row)
    const id = qT.col(r.cells, 'question id').toLowerCase().replace(/\s+/g, '_')
    if (!id) error(problems, where, 'Every question needs a Question ID (for example confidence).')
    else if (ids.has(id)) error(problems, where, `The Question ID “${id}” is used twice.`)
    ids.add(id)
    const type = NEEDS_TYPES[qT.col(r.cells, 'type').toLowerCase()]
    if (!type) error(problems, where, 'Type must be scale, single, multiple or knowledge.')
    const secRaw = qT.col(r.cells, 'section')
    let section = /^\d+$/.test(secRaw) ? Number(secRaw) - 1 : sections.findIndex((s) => s.title.toLowerCase() === secRaw.toLowerCase())
    if (!(section >= 0 && section < sections.length)) {
      error(problems, where, `Section must be a number from 1 to ${sections.length}.`)
      section = 0
    }
    const question = qT.col(r.cells, 'question')
    if (!question) error(problems, where, 'This question has no text.')
    const options = type === 'scale' ? [] : lines(qT.col(r.cells, 'options'))
    if (type && type !== 'scale' && options.length < 2) error(problems, where, 'Give at least two options, one per line.')
    let correctIndex = 0
    if (type === 'knowledge') {
      const c = qT.col(r.cells, 'correct option')
      const idx = /^[a-h]$/i.test(c) ? c.toUpperCase().charCodeAt(0) - 65 : /^\d$/.test(c) ? Number(c) - 1 : options.findIndex((o) => o.toLowerCase() === c.toLowerCase())
      if (!(idx >= 0 && idx < options.length)) error(problems, where, 'Give the correct option as a letter (A, B, C…).')
      else correctIndex = idx
    }
    const maxSel = Number(qT.col(r.cells, 'max choices'))
    questions.push({
      id,
      section,
      type: type ?? 'radio',
      question,
      subtext: qT.col(r.cells, 'help text'),
      options,
      correctIndex,
      explanation: type === 'knowledge' ? qT.col(r.cells, 'why') : '',
      minLabel: type === 'scale' ? qT.col(r.cells, 'low label') : '',
      maxLabel: type === 'scale' ? qT.col(r.cells, 'high label') : '',
      maxSelect: type === 'multiple' && Number.isInteger(maxSel) && maxSel > 0 ? maxSel : 0,
    })
  }
  if (!questions.length) error(problems, 'Questions sheet', 'Add at least one question.')

  const rules: { programId: string; when: { questionId: string; answers: string[] }[] }[] = []
  const byRule = new Map<string, (typeof rules)[number]>()
  for (const r of ruleT?.rows ?? []) {
    const where = at(ruleT!, r.row)
    const ruleId = ruleT!.col(r.cells, 'rule') || String(rules.length + 1)
    let rule = byRule.get(ruleId)
    const programId = ruleT!.col(r.cells, 'recommend path id').toLowerCase()
    if (!rule) {
      if (!programId) error(problems, where, 'Enter the path ID to recommend on the first row of each rule.')
      rule = { programId, when: [] }
      byRule.set(ruleId, rule)
      rules.push(rule)
    } else if (programId && !rule.programId) rule.programId = programId
    const questionId = ruleT!.col(r.cells, 'question id').toLowerCase().replace(/\s+/g, '_')
    const answers = lines(ruleT!.col(r.cells, 'answers'))
    if (!questionId) continue
    const q = questions.find((x) => x.id === questionId)
    if (!q) {
      error(problems, where, `Question ID “${questionId}” is not on the Questions sheet.`)
      continue
    }
    if (!answers.length) error(problems, where, 'List at least one answer for this condition.')
    for (const a of answers)
      if (q.options.length && !q.options.some((o: string) => o === a)) problems.push({ level: 'warning', where, message: `“${a}” is not one of the options of ${questionId}, so this condition will never match. Copy the option text exactly.` })
    rule.when.push({ questionId, answers })
  }
  return [
    {
      kind: 'assessment',
      key: NEEDS_KEY,
      data: {
        title: d.get('title') ?? '',
        intro: d.get('introduction') ?? '',
        sections: sections.map(({ title, description }) => ({ title, description })),
        questions,
        rules,
        fallbackProgramIds: lines(d.get('fallback paths')),
      },
      label: `Needs assessment “${d.get('title') ?? ''}” (${questions.length} questions)`,
      where: 'Details sheet',
    },
  ]
}

// ---------- blog posts ----------

const POST_HEAD = ['Slug', 'Title', 'Summary', 'Article', 'Author', 'Author role', 'Category', 'Read time', 'Date', 'Image']

function postSheets(items: ImportItem[] | null): Sheet[] {
  const rows: (string | number)[][] = [POST_HEAD]
  for (const p of items ?? []) {
    const d = p.data
    rows.push([p.key, d.title ?? '', d.excerpt ?? '', d.content ?? '', d.author ?? '', d.authorRole ?? '', d.category ?? '', d.readTime ?? '', d.date ?? '', d.image ?? ''])
  }
  if (!items?.length)
    rows.push(['# five-ways-to-assess', 'Five ways to check understanding', 'One or two sentences shown on the blog list.', '## Why it matters\n\nWrite the article here. Use ## for headings and - for bullets.', 'Jane Wanjiru', 'Teacher, Nairobi', 'Assessment', '5 min read', 'October 6, 2026', ''])
  return [
    startHere(items?.length ? 'Blog posts' : 'Blog post template', [
      '• One row per article. Slug is the web address ending (lowercase, dashes). Leave it blank and it is made from the title.',
      '• A slug that already exists is updated. A new slug adds a new post. Posts missing from the sheet are left untouched.',
      '• Summary and Article are required before publishing (the article needs at least 200 characters). Author and Category are required too.',
      '• Image is optional: a site picture path such as /images/blog/example.jpg, or an images.unsplash.com address.',
      '• Date can be typed as text (October 6, 2026) or as an Excel date.',
    ]),
    { name: 'Posts', wrap: true, widths: [26, 36, 44, 80, 20, 22, 16, 12, 18, 36], rows },
  ]
}

function parsePosts(sheets: ReadSheet[], problems: Problem[]): ImportItem[] {
  const t = readTable(sheets, 'Posts', ['title', 'article'], problems)
  if (!t) return []
  const out: ImportItem[] = []
  const slugs = new Set<string>()
  for (const r of t.rows) {
    const where = at(t, r.row)
    const title = t.col(r.cells, 'title')
    if (!title) error(problems, where, 'This post needs a title.')
    const rawSlug = t.col(r.cells, 'slug')
    const key = slug(rawSlug || title)
    if (!KEY_RE.test(key)) {
      if (title || rawSlug) error(problems, where, 'Could not make a web address from this slug. Use letters, numbers and dashes.')
      continue
    }
    if (slugs.has(key)) {
      error(problems, where, `The slug “${key}” is used twice.`)
      continue
    }
    slugs.add(key)
    const rt = t.col(r.cells, 'read time')
    out.push({
      kind: 'post',
      key,
      data: {
        title,
        excerpt: t.col(r.cells, 'summary'),
        content: t.col(r.cells, 'article'),
        author: t.col(r.cells, 'author'),
        authorRole: t.col(r.cells, 'author role'),
        category: t.col(r.cells, 'category'),
        readTime: /^\d+$/.test(rt) ? `${rt} min read` : rt,
        date: excelDate(t.col(r.cells, 'date')),
        image: t.col(r.cells, 'image'),
      },
      label: `Post “${title || key}”`,
      where,
    })
  }
  if (!out.length) error(problems, 'Posts sheet', 'Add at least one post.')
  return out
}

// ---------- resources ----------

const RESOURCE_HEAD = ['Resource ID', 'Title', 'Description', 'Type', 'Link (https://)', 'Size', 'Tags (comma separated)', 'Free (yes/no)']

function resourceSheets(items: ImportItem[] | null): Sheet[] {
  const rows: (string | number)[][] = [RESOURCE_HEAD]
  for (const r of items?.find((i) => i.kind === 'resources')?.data.items ?? []) rows.push([r.id, r.title, r.description ?? '', r.type, r.url ?? '', r.size ?? '', (r.tags ?? []).join(', '), yn(r.free)])
  if (rows.length === 1) rows.push(['# r1', 'Lesson planning template', 'A one-page planner for CBC lessons.', 'Template', 'https://example.org/planner.pdf', '120 KB', 'planning, templates', 'yes'])
  return [
    startHere(items?.length ? 'Resource library' : 'Resource library template', [
      '• One row per resource. Type is one of: PDF, Video, Link, Template, Audio.',
      '• Link must start with https://. A free resource needs a link (or a file already attached in the studio).',
      '• Files attached in the studio stay attached when a resource keeps the same Resource ID.',
      '• This replaces the whole library. Download the current library first so you do not lose entries.',
    ]),
    { name: 'Resources', wrap: true, widths: [12, 36, 50, 12, 44, 12, 26, 12], rows },
  ]
}

function parseResources(sheets: ReadSheet[], problems: Problem[]): ImportItem[] {
  const t = readTable(sheets, 'Resources', ['title', 'type'], problems)
  if (!t) return []
  const ids = new Set<string>()
  const items: Row[] = []
  for (const r of t.rows) {
    const where = at(t, r.row)
    const title = t.col(r.cells, 'title')
    if (!title) error(problems, where, 'This resource needs a title.')
    const type = RESOURCE_TYPES.find((x) => x.toLowerCase() === t.col(r.cells, 'type').toLowerCase())
    if (!type) error(problems, where, `Type must be one of: ${RESOURCE_TYPES.join(', ')}.`)
    const id = makeKey(t.col(r.cells, 'resource id'), ids, 'r', where, problems)
    const url = t.col(r.cells, 'link')
    if (url && !/^https:\/\/\S+$/i.test(url)) error(problems, where, 'The link must start with https://')
    if (!id || !type) continue
    items.push({ id, title, description: t.col(r.cells, 'description'), type, url, size: t.col(r.cells, 'size'), tags: commas(t.col(r.cells, 'tags')), free: yes(t.col(r.cells, 'free'), true) })
  }
  if (!items.length) error(problems, 'Resources sheet', 'Add at least one resource.')
  return [{ kind: 'resources', key: RESOURCES_KEY, data: { title: 'Resource library', items }, label: `Resource library (${items.length} resources)`, where: 'Resources sheet' }]
}

// ---------- FAQ ----------

function faqSheets(items: ImportItem[] | null): Sheet[] {
  const rows: (string | number)[][] = [['Section', 'Question', 'Answer']]
  for (const s of items?.find((i) => i.kind === 'faq')?.data.sections ?? []) for (const x of s.items) rows.push([s.title, x.q, x.a])
  if (rows.length === 1) rows.push(['# Getting started', 'How do I create an account?', 'Click Sign up and use your email address.'])
  return [
    startHere(items?.length ? 'FAQ' : 'FAQ template', [
      '• One row per question. Leave Section blank to keep the section of the row above.',
      '• Sections appear in the order they first appear in the sheet.',
      '• This replaces the whole FAQ. Download the current FAQ first so you do not lose entries.',
    ]),
    { name: 'FAQ', wrap: true, widths: [28, 50, 90], rows },
  ]
}

function parseFaq(sheets: ReadSheet[], problems: Problem[]): ImportItem[] {
  const t = readTable(sheets, 'FAQ', ['section', 'question', 'answer'], problems)
  if (!t) return []
  const sections: { title: string; items: { q: string; a: string }[] }[] = []
  let current: (typeof sections)[number] | null = null
  for (const r of t.rows) {
    const where = at(t, r.row)
    const name = t.col(r.cells, 'section')
    if (name) current = sections.find((s) => s.title === name) ?? (sections.push({ title: name, items: [] }), sections[sections.length - 1])
    if (!current) {
      error(problems, where, 'Enter a Section name on the first row.')
      continue
    }
    const q = t.col(r.cells, 'question'), a = t.col(r.cells, 'answer')
    if (!q || !a) error(problems, where, 'A row needs both a Question and an Answer.')
    else current.items.push({ q, a })
  }
  const count = sections.reduce((n, s) => n + s.items.length, 0)
  if (!count) error(problems, 'FAQ sheet', 'Add at least one question.')
  return [{ kind: 'faq', key: FAQ_KEY, data: { title: 'FAQ', sections }, label: `FAQ (${count} questions)`, where: 'FAQ sheet' }]
}

// ---------- public API ----------

/** Removes the optional Kiswahili columns, leaving shorter sheets that are easier to fill in. */
function withoutKiswahili(sheet: Sheet): Sheet {
  if (sheet.name === 'Start here') return sheet
  const header = sheet.rows[0] ?? []
  const keep = header.map((h, i) => (norm(String(h ?? '')).startsWith('kiswahili') ? -1 : i)).filter((i) => i >= 0)
  if (keep.length === header.length) return sheet
  return { ...sheet, rows: sheet.rows.map((r) => keep.map((i) => r[i])), widths: sheet.widths ? keep.map((i) => sheet.widths![i]) : undefined }
}

export interface TemplateOptions {
  /** Include the Kiswahili columns. Default: only when the content being downloaded already has translations. */
  kiswahili?: boolean
}

export function buildTemplate(kind: TemplateKind, existing: ImportItem[] | null = null, options: TemplateOptions = {}): { filename: string; sheets: Sheet[] } {
  const base = TEMPLATES[kind].file
  const prefilled = existing && existing.length > 0
  let sheets = kind === 'path' ? pathSheets(existing) : kind === 'needs' ? needsSheets(existing) : kind === 'posts' ? postSheets(existing) : kind === 'resources' ? resourceSheets(existing) : faqSheets(existing)
  const withSw = options.kiswahili ?? Boolean(existing?.some((i) => i.data.sw))
  if (!withSw) sheets = sheets.map(withoutKiswahili)
  const key = kind === 'path' ? existing?.find((i) => i.kind === 'program')?.key : undefined
  return { filename: `${base}${prefilled ? `${key ? `-${key}` : ''}-current` : '-template'}${withSw ? '-with-kiswahili' : ''}.xlsx`, sheets }
}

// A small, complete example per kind: opens to show what a good finished file looks like.
const sample = (kind: ContentKind, key: string, data: Record<string, any>, parent?: { kind: ContentKind; key: string }): ImportItem => ({ kind, key, parent, data, label: '', where: '' })
const noTags = { cbcLevels: [], subjects: [], counties: [] }
function exampleItems(kind: TemplateKind): ImportItem[] {
  if (kind === 'path') {
    const prog = { kind: 'program' as const, key: 'checking-understanding' }
    return [
      sample('program', 'checking-understanding', { title: 'Checking for understanding', shortTitle: 'Checking understanding', tagline: 'Quick, practical checks during every lesson', description: 'For teachers who want to know, while teaching, whether learners are following.', track: 'core', hours: 2, kicdAlignment: 'CBC assessment guidelines', available: true, launchingSoon: false, shortCourse: false, assignment: { title: 'Plan three checks', context: 'Choose a lesson you will teach next week.', task: 'Describe three quick checks you will use and what you will do with the answers.', hints: ['Keep each check under two minutes', 'Decide your next step in advance'], rubric: ['Checks are quick and practical', 'Each check leads to a clear next step'] }, certificate: { subtitle: 'Completed Checking for understanding', skills: ['Formative assessment', 'Adapting teaching'] }, tags: { cbcLevels: ['Grade 4', 'Grade 5'], subjects: [], counties: [] } }),
      sample('module', 'm1', { title: 'Why check understanding', description: 'The idea and the habit', orderIndex: 0, tags: noTags }, prog),
      sample('module', 'm2', { title: 'Quick checks you can use', description: 'Techniques for any subject', orderIndex: 1, tags: noTags }, prog),
      sample('lesson', 'l1', { title: 'What learners show you', duration: '10 min', videoTitle: '', videoPoints: ['Learners rarely say when they are lost', 'Checks are for you, not for marks'], reading: '## What learners show you\n\nIn every class, some learners are following and some are not.\n\n- You cannot tell by looking\n- A quick check tells you in a minute\n\n>> KEY: Check understanding while you can still do something about it.', reflectionPrompt: 'When did a check last surprise you?', reflectionPlaceholder: 'Write a sentence or two…', orderIndex: 0, tags: noTags }, { kind: 'module', key: 'm1' }),
      sample('lesson', 'l1', { title: 'Thumbs, cards and mini-boards', duration: '12 min', videoTitle: '', videoPoints: [], reading: '## Three cheap checks\n\n1. Thumbs up, sideways or down\n2. Colour cards for A, B, C or D\n3. Mini-boards held up together', reflectionPrompt: 'Which will you try first?', reflectionPlaceholder: '', orderIndex: 0, tags: noTags }, { kind: 'module', key: 'm2' }),
      sample('quiz', 'pre', { kind: 'pre', orderIndex: 0, questions: [{ id: 'q1', question: 'When is a check for understanding most useful?', options: ['At the end of term', 'During the lesson', 'In the national exam', 'Never'], correct: 1, explanation: 'During the lesson you can still adjust.' }] }, prog),
      sample('quiz', 'post', { kind: 'post', orderIndex: 1, questions: [{ id: 'q1', question: 'What should you do after a check shows confusion?', options: ['Move on', 'Re-teach differently', 'Give a test', 'Ignore it'], correct: 1, explanation: 'Adjust while learners are still with you.' }] }, prog),
    ]
  }
  if (kind === 'posts') return [sample('post', 'three-quick-checks', { title: 'Three quick checks for any lesson', excerpt: 'Simple ways to see who is following, in under two minutes.', content: '## Why check at all\n\nA quick check tells you who is following before you move on.\n\n## Three ways\n\n- Thumbs up, sideways or down\n- Colour cards\n- Mini-boards\n\nTry one tomorrow and notice what you learn about your class. The point is not marks; it is knowing what to do next, while learners are still in front of you and the lesson can still change.', author: 'Jane Wanjiru', authorRole: 'Teacher, Nairobi', category: 'Assessment', readTime: '3 min read', date: 'October 6, 2026', image: '' })]
  if (kind === 'faq') return [sample('faq', 'faq', { title: 'FAQ', sections: [{ title: 'Getting started', items: [{ q: 'How do I create an account?', a: 'Choose Sign up and use your email address.' }, { q: 'Is it free?', a: 'Yes, the free plan includes the core learning paths.' }] }, { title: 'Certificates', items: [{ q: 'How do I get a certificate?', a: 'Finish every lesson, pass the final assessment and submit the assignment.' }] }] })]
  if (kind === 'resources') return [sample('resources', 'resources', { title: 'Resource library', items: [{ id: 'r1', title: 'Lesson planning template', description: 'A one-page planner for CBC lessons.', type: 'Template', url: 'https://example.org/planner.pdf', size: '120 KB', tags: ['planning'], free: true }, { id: 'r2', title: 'Formative assessment video', description: 'Ten minutes of classroom examples.', type: 'Video', url: 'https://example.org/video', size: '', tags: ['assessment', 'video'], free: true }] })]
  return [sample('assessment', 'needs-assessment', { title: 'Where should you start?', intro: 'A few questions so we can recommend a first learning path.', sections: [{ title: 'Your teaching', description: 'About your classroom today' }], questions: [{ id: 'level', section: 0, type: 'radio', question: 'Which level do you teach?', subtext: '', options: ['Lower primary', 'Upper primary', 'Junior secondary'], correctIndex: 0, explanation: '', minLabel: '', maxLabel: '', maxSelect: 0 }, { id: 'confidence', section: 0, type: 'scale', question: 'How confident are you assessing learners?', subtext: 'Choose a number', options: [], correctIndex: 0, explanation: '', minLabel: 'Not confident', maxLabel: 'Very confident', maxSelect: 0 }], rules: [{ programId: 'checking-understanding', when: [{ questionId: 'level', answers: ['Upper primary'] }] }], fallbackProgramIds: ['checking-understanding'] })]
}

/** A finished, realistic file to look at before filling in the real one. */
export function buildExample(kind: TemplateKind): { filename: string; sheets: Sheet[] } {
  const { sheets } = buildTemplate(kind, exampleItems(kind), { kiswahili: false })
  return { filename: `${TEMPLATES[kind].file}-example.xlsx`, sheets }
}

/** Reads a workbook into content items and problems. Also runs every item through the server's own validation. */
export function parseWorkbook(kind: TemplateKind, sheets: ReadSheet[]): Parsed {
  const problems: Problem[] = []
  const items = kind === 'path' ? parsePath(sheets, problems) : kind === 'needs' ? parseNeeds(sheets, problems) : kind === 'posts' ? parsePosts(sheets, problems) : kind === 'resources' ? parseResources(sheets, problems) : parseFaq(sheets, problems)
  if (items.length > MAX_IMPORT_ITEMS) error(problems, 'Workbook', `This file creates ${items.length} items; the limit is ${MAX_IMPORT_ITEMS} per upload. Split it into smaller files.`)
  // Only run the shared validators on items that parsed cleanly, so each mistake is reported once, in plain words.
  if (!problems.some((p) => p.level === 'error'))
    for (const item of items) {
      const probe = { orderIndex: 0, ...item.data, ...(item.data.sw === null ? { sw: undefined } : {}) }
      try {
        validateContent(item.kind, probe, true)
      } catch (e) {
        error(problems, item.where, `${item.label}: ${(e as { data?: { message?: string } }).data?.message ?? 'not valid'}`)
        continue
      }
      const notReady = readinessProblem(item.kind, probe)
      if (notReady) problems.push({ level: 'warning', where: item.where, message: `${item.label}: ${notReady}. You can save it as a draft, but it cannot be published until this is fixed.` })
    }
  return { items, problems }
}
