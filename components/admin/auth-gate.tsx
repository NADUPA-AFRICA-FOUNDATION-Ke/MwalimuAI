'use client'

/**
 * Everything between "a browser opened /admin" and "a verified staff member sees the console":
 * sign-in, the not-staff screen, authenticator enrolment and the 6-digit challenge.
 * The server enforces all of it; this only decides what to show.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { ShieldCheck } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { makeQR } from '@/lib/qr'
import { getSiteUrl } from '@/lib/site-url'
import { Loading, StaffProvider, errorMessage } from './common'
import { Shell } from './shell'

export function AdminApp({ children }: { children: ReactNode }) {
  return (
    <ConvexNativeAuthBoundary>
      <Gate>{children}</Gate>
    </ConvexNativeAuthBoundary>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-semibold">Mwalimu AI · Staff console</span>
        </div>
        {children}
      </div>
    </main>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.admin.me.me, isAuthenticated ? {} : 'skip')
  const { signOut } = useAuthActions()

  if (isLoading || (isAuthenticated && me === undefined))
    return (
      <Centered>
        <Loading />
      </Centered>
    )
  if (!isAuthenticated || me?.state === 'signed_out')
    return (
      <Centered>
        <SignIn />
      </Centered>
    )
  if (me?.state === 'not_staff') {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Not authorised</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account does not have access to the staff console. Ask a Super Admin to invite you, then sign in with the
          invited email address.
        </p>
        <Button className="mt-4 w-full" variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Centered>
    )
  }
  if (me?.state === 'mfa_enrollment_required')
    return (
      <Centered>
        <MfaEnroll />
      </Centered>
    )
  if (me?.state === 'mfa_required')
    return (
      <Centered>
        <MfaChallenge />
      </Centered>
    )
  if (me?.state !== 'ready')
    return (
      <Centered>
        <Loading />
      </Centered>
    )
  return (
    <StaffProvider staff={{ email: me.email, name: me.name, role: me.role, permissions: me.permissions }}>
      <Shell>{children}</Shell>
    </StaffProvider>
  )
}

function SignIn() {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<'signin' | 'forgot' | 'sent'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      const r = await signIn('password', { flow: 'signIn', email: email.trim().toLowerCase(), password })
      if (!r.signingIn) throw new Error('bad')
    } catch { setError('Incorrect email or password.') } finally { setBusy(false) }
  }

  // Same reset flow as the main site: an emailed single-use link. Opening it also marks the email
  // as verified, which staff access requires.
  const sendReset = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      await signIn('password', { flow: 'reset', email: email.trim().toLowerCase(), redirectTo: '/auth/reset-password' })
      setMode('sent') // always say "sent": never reveal whether the address has an account
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(/not enabled|configured/i.test(msg)
        ? 'Password reset email is not set up on this deployment yet. Use Google sign-in, or ask a Super Admin for help.'
        : 'We could not send the email. Check the address and try again, or use Google sign-in.')
    } finally { setBusy(false) }
  }

  if (mode === 'sent') {
    return (
      <div className="space-y-4" role="status">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">If <b className="text-foreground">{email.trim().toLowerCase()}</b> has an account, a reset link is on its way (check spam too). Set a new password from that link, then come back to this page and sign in.</p>
        <Button type="button" className="w-full" onClick={() => { setMode('signin'); setPassword('') }}>Back to sign in</Button>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={sendReset} className="space-y-4">
        <div><h1 className="text-lg font-semibold">Reset your password</h1><p className="text-sm text-muted-foreground">Enter the email you were invited with and we will send a reset link.</p></div>
        <div className="space-y-1.5"><Label htmlFor="reset-email">Email</Label><Input id="reset-email" type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Spinner className="mr-2 h-4 w-4" />}Send reset link</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('signin'); setError(null) }}>Back to sign in</Button>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button type="button" onClick={() => { setMode('forgot'); setError(null) }} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Forgot password?</button>
        </div>
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Spinner className="mr-2 h-4 w-4" />}Sign in</Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => void signIn('google', { redirectTo: '/admin' })}>Continue with Google</Button>
      <p className="text-xs text-muted-foreground">
        Staff accounts only. No account yet?{' '}
        <a className="font-medium text-primary underline underline-offset-2" href={`${getSiteUrl()}/auth/sign-up`}>Create one on the main site</a>{' '}
        with your invited email, then come back. You will be asked for a two-factor code next.
      </p>
    </form>
  )
}

function CodeForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (code: string) => void
  busy: boolean
  error: string | null
}) {
  const [code, setCode] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(code.replace(/\s/g, ''))
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="code">6-digit code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center text-lg tracking-widest"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || code.replace(/\s/g, '').length !== 6}>
        {busy && <Spinner className="mr-2 h-4 w-4" />}Verify
      </Button>
    </form>
  )
}

function useVerify() {
  const verify = useMutation(api.admin.mfa.verifyCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (code: string) => {
    setBusy(true)
    setError(null)
    try {
      const r = await verify({ code })
      if (!r.ok)
        setError(
          r.locked
            ? `Too many attempts. Try again in ${Math.ceil(r.retryAfterSeconds / 60)} minutes.`
            : 'That code is not right. Check the time on your phone and try again.',
        )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return { submit, busy, error }
}

function MfaChallenge() {
  const { signOut } = useAuthActions()
  const v = useVerify()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Two-factor verification</h1>
        <p className="text-sm text-muted-foreground">Enter the code from your authenticator app.</p>
      </div>
      <CodeForm onSubmit={v.submit} busy={v.busy} error={v.error} />
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  )
}

function MfaEnroll() {
  const begin = useMutation(api.admin.mfa.beginEnrollment)
  const { signOut } = useAuthActions()
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const v = useVerify()
  useEffect(() => {
    let live = true
    begin({})
      .then((s) => {
        if (live) setSetup(s)
      })
      .catch((e) => {
        if (live) setErr(errorMessage(e))
      })
    return () => {
      live = false
    }
  }, [begin])
  if (err)
    return (
      <p role="alert" className="text-sm text-destructive">
        {err}
      </p>
    )
  if (!setup) return <Loading />
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Set up two-factor</h1>
        <p className="text-sm text-muted-foreground">
          Staff accounts require an authenticator app (Google Authenticator, Authy, 1Password…). Scan the code, then
          enter the 6-digit number it shows.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={makeQR(setup.uri, 'M').createDataURL(5, 8)}
        alt="QR code for your authenticator app"
        className="mx-auto h-48 w-48 rounded border bg-white"
      />
      <p className="break-all text-center font-mono text-xs text-muted-foreground">
        Can&apos;t scan? Enter this key: {setup.secret}
      </p>
      <CodeForm onSubmit={v.submit} busy={v.busy} error={v.error} />
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  )
}
