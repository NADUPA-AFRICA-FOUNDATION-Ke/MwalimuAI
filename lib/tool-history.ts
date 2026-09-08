import { makeFunctionReference } from 'convex/server'
import { getConvexClient } from '@/lib/convex/client'

const HISTORY_KEY = 'mwalimu_tool_history'

export interface ToolOutput {
  id:        string
  toolId:    string
  title:     string
  input:     Record<string, unknown>
  output:    string
  createdAt: string
}

const createToolOutput = makeFunctionReference<'mutation', Omit<ToolOutput, 'createdAt'> & { createdAt: number }, unknown>('toolHistory:create')
const listToolOutputs = makeFunctionReference<'query', { toolId: string; limit: number }, Array<{
  clientId: string; toolId: string; title: string; input: Record<string, unknown>; output: string; createdAt: number
}>>('toolHistory:listMine')
const removeToolOutput = makeFunctionReference<'mutation', { clientId: string }, unknown>('toolHistory:removeMine')

function readLocal(): ToolOutput[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as ToolOutput[] } catch { return [] }
}

function writeLocal(items: ToolOutput[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 100))) } catch {}
}

/**
 * Persist a successful tool generation so the teacher can review or
 * restore it on any device. Fire-and-forget — never throws.
 * Returns the client-generated id so the caller can optimistically
 * prepend the entry to its history list.
 */
export function saveToolOutput(
  userId: string,
  toolId: string,
  title: string,
  input: Record<string, unknown>,
  output: string,
): string {
  void userId // Convex resolves ownership from the authenticated identity.
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

  const item = { id, toolId, title, input, output, createdAt: new Date().toISOString() }
  writeLocal([item, ...readLocal().filter(entry => entry.id !== id)])
  const client = getConvexClient()
  void client?.mutation(createToolOutput, { id, toolId, title, input, output, createdAt: Date.now() })
    .catch(err => console.error('[mwalimu] saveToolOutput sync failed:', err))
  return id
}

export async function loadToolHistory(userId: string, toolId: string, limit = 25): Promise<ToolOutput[]> {
  void userId
  const local = readLocal().filter(item => item.toolId === toolId)
  try {
    const client = getConvexClient()
    if (!client) return local.slice(0, limit)
    const cloud = (await client.query(listToolOutputs, { toolId, limit })).map(r => ({
      id: r.clientId, toolId: r.toolId, title: r.title, input: r.input ?? {}, output: r.output,
      createdAt: new Date(r.createdAt).toISOString(),
    }))
    const merged = [...cloud, ...local.filter(item => !cloud.some(remote => remote.id === item.id))]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    writeLocal([...merged, ...readLocal().filter(item => item.toolId !== toolId)])
    return merged.slice(0, limit)
  } catch (err) {
    console.error('[mwalimu] loadToolHistory error:', err)
    return local.slice(0, limit)
  }
}

export async function deleteToolOutput(id: string): Promise<void> {
  writeLocal(readLocal().filter(item => item.id !== id))
  try {
    await getConvexClient()?.mutation(removeToolOutput, { clientId: id })
  } catch {}
}
