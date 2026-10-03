'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, fmtTime, Loading, PageHeader, selectClass, StatusPill } from '@/components/admin/common'

const PAGE = 25

export default function UsersPage() {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'suspended' | 'deactivated'>('')
  const {
    results,
    status: loadStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.users.search,
    { ...(query ? { query } : {}), ...(status ? { status } : {}) },
    { initialNumItems: PAGE },
  )

  return (
    <>
      <PageHeader
        title="Users"
        description="Search by email, phone number (0712…, +254712…) or name. With no search, the newest accounts are shown."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(text.trim())
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <Input
          aria-label="Search users"
          className="min-w-0 flex-1 basis-60"
          placeholder="Email, phone or name"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          aria-label="Account status"
          className={`${selectClass} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <Button type="submit">Search</Button>
        {(query || status) && (
          <Button
            type="button"
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
      </form>

      {loadStatus === 'LoadingFirstPage' ? (
        <Loading />
      ) : results.length === 0 ? (
        <Empty>No users match that search.</Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="hidden p-3 md:table-cell">Phone</th>
                  <th className="hidden p-3 lg:table-cell">School · County</th>
                  <th className="p-3">Status</th>
                  <th className="hidden p-3 md:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <Link href={`/admin/users/${u._id}`} className="text-primary hover:underline">
                        {u.name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] truncate p-3">{u.email}</td>
                    <td className="hidden p-3 md:table-cell">{u.phone ?? '—'}</td>
                    <td className="hidden p-3 lg:table-cell">
                      {[u.school, u.county].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="p-3">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">{fmtTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loadStatus === 'CanLoadMore' && (
            <Button variant="outline" className="mt-4" onClick={() => loadMore(PAGE)}>
              Load more
            </Button>
          )}
        </>
      )}
    </>
  )
}
