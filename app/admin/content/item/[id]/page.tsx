'use client'

import { useParams } from 'next/navigation'
import type { Id } from '@/convex/_generated/dataModel'
import { ItemEditor } from '@/components/admin/content/item-editor'

export default function ItemEditorPage() {
  const { id } = useParams<{ id: string }>()
  return <ItemEditor itemId={id as Id<'cmsItems'>} />
}
