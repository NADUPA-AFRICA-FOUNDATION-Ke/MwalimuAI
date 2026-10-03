'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/** Email goes to the sign-up page. One field, one primary action. */
export function HeroSignupForm() {
  const router = useRouter()
  return (
    <form
      className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
      onSubmit={(e) => { e.preventDefault(); router.push('/auth/sign-up') }}
      aria-label="Create a Mwalimu AI account"
    >
      <label htmlFor="homepage-email" className="sr-only">Email address</label>
      <input
        id="homepage-email" type="email" required autoComplete="email" placeholder="you@school.ac.ke"
        aria-describedby="homepage-email-help"
        className="h-12 w-full min-w-0 rounded-xl border sm:flex-1 border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" size="lg" className="h-12 rounded-xl px-6 text-base">Create free account</Button>
      <p id="homepage-email-help" className="sr-only">Opens the sign-up page.</p>
    </form>
  )
}
