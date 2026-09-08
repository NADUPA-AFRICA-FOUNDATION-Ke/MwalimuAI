#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
const secret = process.env.MIGRATION_SECRET
if (!convexUrl || !secret) throw new Error('Set CONVEX_URL and MIGRATION_SECRET')
const dir = path.resolve(process.env.MIGRATION_DIR ?? 'migration-data')
const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
const client = new ConvexHttpClient(convexUrl)
const batch = []
const idOf = (row, fallback) => String(row.id ?? row.serial ?? fallback)
const userOf = (row) => row.user_id ? String(row.user_id) : undefined

const authUsersPath = path.join(dir, 'auth-users.json')
const authUsers = JSON.parse(readFileSync(authUsersPath, 'utf8'))
for (const user of authUsers) {
  const payload = { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at, phone: user.phone, user_metadata: user.user_metadata, created_at: user.created_at, updated_at: user.updated_at }
  batch.push({ sourceTable: 'auth.users', legacyId: String(user.id), legacyUserId: String(user.id), checksum: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'), payload })
  if (batch.length === 50) { await client.mutation(api.migration.importBatch, { secret, records: batch.splice(0) }); console.log('imported auth users/application batch'); }
}

for (const [table, info] of Object.entries(manifest.tables)) {
  const rows = JSON.parse(readFileSync(path.join(dir, info.file), 'utf8'))
  for (let i = 0; i < rows.length; i++) {
    const payload = rows[i]
    batch.push({ sourceTable: table, legacyId: idOf(payload, `${table}:${i}`), legacyUserId: userOf(payload), checksum: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'), payload })
    if (batch.length === 50) { await client.mutation(api.migration.importBatch, { secret, records: batch.splice(0) }); console.log(`imported ${table} batch`); }
  }
}
if (batch.length) await client.mutation(api.migration.importBatch, { secret, records: batch })
console.log('Migration import complete. Run the Convex counts query and compare with migration-data/manifest.json before cutover.')
