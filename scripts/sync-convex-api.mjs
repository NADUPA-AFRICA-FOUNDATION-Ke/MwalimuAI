#!/usr/bin/env node
// Regenerates the module list in convex/_generated/api.d.ts from the files on disk,
// for environments where `npx convex dev` (which normally does this) can't run.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'convex')
const files = []
const walk = (dir, prefix = '') => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name === 'node_modules') continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`)
    else if (/\.(ts|js)$/.test(name) && !name.endsWith('.d.ts') && !name.endsWith('.config.ts') && !name.includes('.test.') && name !== 'schema.ts' && name !== 'tsconfig.json') files.push(`${prefix}${name.replace(/\.(ts|js)$/, '')}`)
  }
}
walk(root)
files.sort()
const ident = (f) => f.replace(/\//g, '_')
const imports = files.map((f) => `import type * as ${ident(f)} from "../${f}.js";`).join('\n')
const entries = files.map((f) => `  ${f.includes('/') ? JSON.stringify(f) : f}: typeof ${ident(f)};`).join('\n')
const file = path.join(root, '_generated/api.d.ts')
let src = readFileSync(file, 'utf8')
src = src.replace(/import type \* as [\s\S]*?(?=\nimport type \{\n  ApiFromModules)/, `${imports}\n`)
src = src.replace(/declare const fullApi: ApiFromModules<\{[\s\S]*?\}>;/, `declare const fullApi: ApiFromModules<{\n${entries}\n}>;`)
writeFileSync(file, src)
console.log(`api.d.ts updated with ${files.length} modules`)
