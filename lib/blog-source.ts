import { blogPosts, type BlogPost } from './blog-data'
import { cmsPost, cmsPosts } from './server-content'

const FALLBACK_IMAGE = blogPosts[0]?.image ?? '/blog/cbc-competencies.jpg'
const time = (p: BlogPost) => Date.parse(p.date) || 0

/**
 * Blog posts for the public pages: what staff publish in the admin console, plus the built-in posts. A post staff
 * have taken over (same slug) uses their version. Newest first.
 */
export async function loadPosts(): Promise<BlogPost[]> {
  const cms = await cmsPosts()
  if (cms.length === 0) return blogPosts
  const bySlug = new Map(blogPosts.map((p) => [p.slug, p]))
  for (const c of cms) {
    bySlug.set(c.slug, {
      id: c.order, slug: c.slug, title: c.title, excerpt: c.excerpt, content: bySlug.get(c.slug)?.content ?? '',
      author: c.author, authorRole: c.authorRole, date: c.date, readTime: c.readTime, category: c.category, image: c.image || FALLBACK_IMAGE,
    })
  }
  return [...bySlug.values()].sort((a, b) => time(b) - time(a) || b.id - a.id)
}

export async function loadPost(slug: string): Promise<BlogPost | undefined> {
  const c = await cmsPost(slug)
  if (c) {
    return { id: c.order, slug: c.slug, title: c.title, excerpt: c.excerpt, content: c.content, author: c.author, authorRole: c.authorRole, date: c.date, readTime: c.readTime, category: c.category, image: c.image || FALLBACK_IMAGE }
  }
  return blogPosts.find((p) => p.slug === slug)
}
