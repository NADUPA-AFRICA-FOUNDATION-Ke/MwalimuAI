import type { MetadataRoute } from 'next'
import { loadPosts } from '@/lib/blog-source'

const siteUrl = 'https://mwalimu-ai-nu.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await loadPosts()
  const publicRoutes = [
    '/', '/features', '/pricing', '/about', '/blog', '/docs', '/faq',
    '/support', '/contact', '/privacy', '/terms', '/verify',
  ]

  return [
    ...publicRoutes.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '/' || path === '/blog' ? 'weekly' as const : 'monthly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
