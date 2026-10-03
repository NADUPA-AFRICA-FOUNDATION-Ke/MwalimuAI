import type { FunctionReturnType } from 'convex/server'
import type { api } from '@/convex/_generated/api'

/** What `admin.users.get` returns: the profile plus its certificates, progress and plan. */
export type UserData = FunctionReturnType<typeof api.admin.users.get>
