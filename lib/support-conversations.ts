/** A visitor's private conversation links, remembered in this browser so they can find them again. Never sent anywhere. */
const KEY = 'mwalimu_support_conversations'
export type RememberedConversation = { number: string; subject: string; path: string; at: number }

export function readConversations(): RememberedConversation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((c) => c && typeof c.path === 'string') : []
  } catch {
    return []
  }
}

export function rememberConversation(c: RememberedConversation) {
  try {
    const rest = readConversations().filter((x) => x.path !== c.path)
    localStorage.setItem(KEY, JSON.stringify([c, ...rest].slice(0, 20)))
  } catch {
    /* storage blocked: the link on the confirmation screen still works */
  }
}

export function forgetConversation(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(readConversations().filter((x) => x.path !== path)))
  } catch {
    /* ignore */
  }
}
