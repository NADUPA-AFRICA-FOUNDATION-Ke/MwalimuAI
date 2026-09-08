import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { BackButton } from '@/components/back-button'
import { getBlogPost, getAllBlogPosts } from '@/lib/blog-data'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { Calendar, Clock, User, ArrowRight } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    return {
      title: 'Post Not Found - Mwalimu AI Blog',
    }
  }

  return {
    title: `${post.title} - Mwalimu AI Blog`,
    description: post.excerpt,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const allPosts = getAllBlogPosts()
  const relatedPosts = allPosts.filter((p) => p.slug !== slug).slice(0, 3)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref="/blog" label="Back to Blog" />
            <Link href="/" className="flex items-center gap-2">
              <BrandMark className="w-10 h-10" />
              <span className="font-bold text-lg hidden sm:inline">Mwalimu AI</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="rounded-full"><Link href="/auth/login">Log In</Link></Button>
            <Button asChild className="rounded-full shadow-md shadow-primary/25"><Link href="/auth/sign-up">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative h-64 md:h-96 w-full">
        <Image
          src={post.image}
          alt={post.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 md:px-8 -mt-32 relative z-10">
        <Card className="p-8 md:p-12 border-border/50 shadow-xl">
          {/* Meta */}
          <div className="mb-6">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              {post.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-balance">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{post.author}</p>
                  <p className="text-xs">{post.authorRole}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <p className="text-lg text-muted-foreground mb-8 pb-8 border-b border-border/50 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Content */}
          <div className="max-w-none">
            <MarkdownRenderer content={post.content} article />
          </div>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-primary/20">
              <h3 className="text-xl font-bold mb-2">Ready to enhance your teaching?</h3>
              <p className="text-muted-foreground mb-4">
                Get personalized AI coaching and professional development with Mwalimu AI.
              </p>
              <Button asChild className="rounded-full shadow-md shadow-primary/25">
                <Link href="/auth/sign-up">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>
          </div>
        </Card>
      </article>

      {/* Related Posts */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16">
        <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {relatedPosts.map((relatedPost) => (
            <Link href={`/blog/${relatedPost.slug}`} key={relatedPost.id} className="group">
              <Card className="overflow-hidden h-full border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={relatedPost.image}
                    alt={relatedPost.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 text-xs">
                    {relatedPost.category}
                  </Badge>
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">{relatedPost.readTime}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Mwalimu AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
