import { unstable_cache } from 'next/cache'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

/**
 * Public pages (FAQ, blog) are rendered on the server and refreshed every few minutes, so visitors never wait on
 * the database. Staff manage their content in the admin console; if the backend cannot be reached these return
 * null/empty and the built-in copy is used.
 */
const REVALIDATE_SECONDS = 300

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

const faq = unstable_cache(() => fetchQuery(api.content.faq, {}), ['cms-faq'], { revalidate: REVALIDATE_SECONDS })
const posts = unstable_cache(() => fetchQuery(api.content.blogPosts, {}), ['cms-posts'], { revalidate: REVALIDATE_SECONDS })
const post = (slug: string) =>
  unstable_cache(() => fetchQuery(api.content.blogPost, { slug }), ['cms-post', slug], { revalidate: REVALIDATE_SECONDS })()

export const cmsFaq = () => safe(() => faq(), null)
export const cmsPosts = () => safe(() => posts(), [])
export const cmsPost = (slug: string) => safe(() => post(slug), null)
