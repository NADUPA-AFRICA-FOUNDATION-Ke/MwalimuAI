# Content spreadsheets (upload & templates)

Editors can add or change content without touching the studio forms: **Admin → Content → Upload & templates**.

1. Pick what you are adding: learning path, needs assessment, blog posts, resource library or FAQ.
2. Download the blank template, or download what is there now and edit it. The first sheet, "Start here", explains every column.
3. Fill it in with Excel or Google Sheets (File → Download → Microsoft Excel) and save as `.xlsx`.
4. Upload it. You see what would be created, updated or left unchanged, and every mistake with its sheet and row. Nothing is saved until you press **Save as drafts**.
5. The upload becomes drafts. Send for review, a second person approves, then publish: the usual four-eyes flow. Live content is never changed by an upload.

## Rules

- Rows starting with `#` are notes and are ignored. Empty rows are ignored.
- Lists ("one per line") use a new line inside the cell (Alt+Enter).
- IDs identify items. A known ID updates that item, a new ID creates one, a blank ID gets one generated. Keep IDs when editing.
- Uploads never delete or archive. Paths, modules, lessons, quizzes and blog posts are matched individually, so a partial file only touches what it lists. The resource library, FAQ and needs assessment are single items and are **replaced as a whole**; the preview says how many entries are removed.
- Files attached to a resource in the studio stay attached while its Resource ID is unchanged.
- An item being reviewed or already approved cannot be overwritten (withdraw or publish it first); archived items must be unarchived first. If anything in a file is invalid, nothing is saved.
- Kiswahili columns are left out by default (tick "Include Kiswahili columns" when downloading). A file without them never touches existing translations.

## How it works

- `lib/admin/content-sheets.ts` writes the templates and parses uploads into content items with readable problems.
- `lib/admin/xlsx.ts` / `lib/admin/xlsx-read.ts` write and read the workbook (no dependencies; reads Excel, Numbers, LibreOffice and Google Sheets files).
- `convex/admin/contentImport.ts`: `exportItems` (pre-fill), `preview` (what would happen), `apply` (all-or-nothing, requires a reason, one audit row). It reuses the studio's validation, so an upload can never create something the studio would refuse. Requires the `content.edit` permission.
- Limit: 300 items and 8 MB per upload.
