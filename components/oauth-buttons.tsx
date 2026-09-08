'use client'

import { useState, type ComponentType } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type OAuthProvider = 'google'
type BrandIconProps = { className?: string }

function GoogleIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
      <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.02H3.3v2.53A9.74 9.74 0 0 0 12 21.5Z" />
      <path fill="#FBBC05" d="M6.54 13.59A5.85 5.85 0 0 1 6.23 12c0-.55.11-1.09.31-1.59V7.88H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.12l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.39c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.54 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.38l3.24 2.53C7.31 8.11 9.46 6.39 12 6.39Z" />
    </svg>
  )
}

const providers: Array<{ id: OAuthProvider; label: string; Icon: ComponentType<BrandIconProps> }> = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
]

export function OAuthButtons({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const { signIn } = useAuthActions()
  const [busyProvider, setBusyProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const continueWith = async (provider: OAuthProvider) => {
    setError(null)
    setBusyProvider(provider)
    try {
      await signIn(provider, { redirectTo })
    } catch {
      setBusyProvider(null)
      setError('This sign-in option is unavailable right now. Please try again or use email and password.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center py-1">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">or continue with</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid gap-2" aria-label="Social sign-in options">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            disabled={busyProvider !== null}
            onClick={() => void continueWith(provider.id)}
            className="h-11 w-full justify-center gap-3 rounded-xl border-gray-200 bg-white px-3 text-[12px] font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label={`Continue with ${provider.label}`}
          >
            {busyProvider === provider.id ? (
              <Spinner className="size-4" />
            ) : (
              <provider.Icon className="size-5 shrink-0" />
            )}
            <span>{provider.label}</span>
          </Button>
        ))}
      </div>

      {error && <p role="alert" aria-live="assertive" className="text-center text-[12px] text-red-600">{error}</p>}

      <p className="text-center text-[11px] leading-relaxed text-gray-500">
        Google accounts with the same verified email are linked to your existing Mwalimu AI account.
      </p>
    </div>
  )
}
