import type { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/blog-data'

const siteUrl = 'https://mwalimu-ai-nu.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
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
    ...getAllBlogPosts().map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
