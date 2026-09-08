import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, User, ArrowRight } from 'lucide-react'
import { getAllBlogPosts } from '@/lib/blog-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CBC Teaching Resources & Insights',
  description: 'Practical insights, tips, and resources for Kenyan teachers implementing the Competency-Based Curriculum.',
}

export default function BlogPage() {
  const blogPosts = getAllBlogPosts()
  const featuredPost = blogPosts[0]
  const otherPosts = blogPosts.slice(1)

  return (
    <div className="min-h-screen">
      <MarketingHeader activePath="/blog" />

      <main>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1">
          Teacher Resources
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance">Mwalimu AI Blog</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
          Insights, tips, and resources to help Kenyan teachers excel with Competency-Based Curriculum.
        </p>
      </section>

      {/* Featured Post */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
        <Link href={`/blog/${featuredPost.slug}`} className="group block">
          <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all hover:shadow-xl">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-64 md:h-auto min-h-[300px] overflow-hidden">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge variant="secondary" className="w-fit mb-4 bg-accent/10 text-accent border-accent/20">
                  Featured
                </Badge>
                <Badge className="w-fit mb-3 bg-primary/10 text-primary border-primary/20">
                  {featuredPost.category}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-6 line-clamp-3">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{featuredPost.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{featuredPost.readTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                  Read Article <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherPosts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className="group">
              <Card className="overflow-hidden flex flex-col h-full border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <Badge className="w-fit mb-3 bg-primary/10 text-primary border-primary/20">
                    {post.category}
                  </Badge>
                  <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span className="truncate max-w-[120px]">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                    <Calendar className="w-4 h-4" />
                    <span>{post.date}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Continue learning */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-primary/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Continue learning with Mwalimu AI</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create an account to save your progress and use the platform&apos;s learning and planning tools.
          </p>
          <Button asChild className="rounded-xl px-6 shadow-md shadow-primary/25"><Link href="/auth/sign-up">Create an account</Link></Button>
        </Card>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
