'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePaginatedQuery } from 'convex/react'
import { Users } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Avatar, compactSelect, Empty, fmtTime, LoadMore, Loading, PageHeader, Panel, SearchField, StatusPill, Toolbar } from '@/components/admin/common'

const PAGE = 25

export default function UsersPage() {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'suspended' | 'deactivated'>('')
  const { results, status: loadStatus, loadMore } = usePaginatedQuery(
    api.admin.users.search,
    { ...(query ? { query } : {}), ...(status ? { status } : {}) },
    { initialNumItems: PAGE },
  )

  return (
    <>
      <PageHeader title="Users" description="Find a learner to restore a streak, edit a profile or change their account status. Phone numbers work as 0712… or +254712…." />
      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(text.trim())
          }}
        >
          <Toolbar end={loadStatus === 'LoadingFirstPage' ? undefined : `${results.length}${loadStatus === 'CanLoadMore' ? '+' : ''} ${query || status ? 'matching' : 'newest'}`}>
            <SearchField value={text} onChange={setText} placeholder="Email, phone or name" label="Search users" />
            <select aria-label="Account status" className={compactSelect} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <Button type="submit" size="sm">Search</Button>
            {(query || status) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText('')
                  setQuery('')
                  setStatus('')
                }}
              >
                Clear
              </Button>
            )}
          </Toolbar>
        </form>

        {loadStatus === 'LoadingFirstPage' ? (
          <div className="px-4"><Loading /></div>
        ) : results.length === 0 ? (
          <div className="p-4"><Empty icon={<Users />}>No users match that search.</Empty></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">User</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Phone</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">School · County</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {results.map((u) => (
                  <tr key={u._id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/users/${u._id}`} className="flex items-center gap-3">
                        <Avatar name={u.name || u.email || '?'} />
                        <span className="min-w-0 max-w-[11rem] sm:max-w-[18rem]">
                          <span className="block truncate font-medium hover:text-primary">{u.name || 'Unnamed'}</span>
                          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-2.5 tabular-nums md:table-cell">{u.phone ?? '—'}</td>
                    <td className="hidden px-4 py-2.5 lg:table-cell">{[u.school, u.county].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-2.5"><StatusPill status={u.status} /></td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground md:table-cell">{fmtTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loadStatus === 'CanLoadMore' && <LoadMore onClick={() => loadMore(PAGE)} />}
          </>
        )}
      </Panel>
    </>
  )
}
