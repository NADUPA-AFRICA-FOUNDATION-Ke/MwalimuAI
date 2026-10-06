'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { getLowBandwidth, setLowBandwidth } from '@/lib/accessibility'
import { useProfile } from '@/context/profile-context'
import { useAction, useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/authed-fetch'
import { errorMessage } from '@/lib/support'
import { Wifi, WifiOff, Globe, Download, KeyRound, Trash2, AlertCircle, Check } from 'lucide-react'

const ALL_USER_KEYS = [
  'mwalimu_profile', 'mwalimu_lang', 'mwalimu_last_uid',
  'mwalimu_community', 'mwalimu_learning_progress', 'mwalimu_activity',
  'mwalimu_tools_used', 'mwalimu_journal', 'mwalimu_goals',
  'mwalimu_discussions', 'mwalimu_current_lesson',
]

export default function SettingsPage() {
  const { lang, setLang, profile, setProfile, user, signOut } = useProfile()
  const [lowBandwidth, setLBW]       = useState(false)
  const [isDirty, setIsDirty]        = useState(false)
  const [isSaving, setIsSaving]      = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting]  = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const convex = useConvex()
  const deleteMine = useMutation(api.dataRights.deleteMine)
  const logExport = useMutation(api.dataRights.logExport)
  const billing = useQuery(api.subscriptions.mine, {})
  const changePassword = useAction(api.passwords.changeMine)
  const siteFacts = useQuery(api.siteFacts.facts, {})
  const sessionInfo = useQuery(api.sessions.mine, {})

  const [formData, setFormData] = useState({
    name:      '',
    school:    '',
    county:    '',
    subjects:  '',
    grades:    '',
    cbcLevel:  'beginner' as 'beginner' | 'intermediate' | 'advanced',
  })

  // Pre-populate from real profile data on mount / when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name:     profile.name     ?? '',
        school:   profile.school   ?? '',
        county:   profile.county   ?? '',
        subjects: (profile.subjects ?? []).join(', '),
        grades:   (profile.grades   ?? []).join(', '),
        cbcLevel: profile.cbcLevel ?? 'beginner',
      })
    }
  }, [profile])

  useEffect(() => { setLBW(getLowBandwidth()) }, [])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Name is required'); return }
    setIsSaving(true)
    try {
      await setProfile({
        name:      formData.name.trim(),
        school:    formData.school.trim(),
        county:    formData.county.trim(),
        subjects:  formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
        grades:    formData.grades.split(',').map(s => s.trim()).filter(Boolean),
        cbcLevel:  formData.cbcLevel,
        completed: true,
      })
      toast.success('Profile saved')
      setIsDirty(false)
    } catch {
      toast.error('Failed to save — check your connection')
    } finally {
      setIsSaving(false)
    }
  }

  const [pw, setPw] = useState({ current: '', next: '', again: '' })
  const [changingPw, setChangingPw] = useState(false)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.again) { toast.error('The new passwords do not match.'); return }
    setChangingPw(true)
    try {
      await changePassword({ current: pw.current, next: pw.next })
      setPw({ current: '', next: '', again: '' })
      toast.success('Password changed.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setChangingPw(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const data = await convex.query(api.dataRights.exportMine, {})
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `mwalimu-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      void logExport({}).catch(() => {})
      toast.success(data.truncated.length ? 'Data downloaded. Some long lists were shortened. Contact support for the full set.' : 'Data downloaded')
    } catch {
      toast.error('Download failed. Check your connection and try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCancelPlan = async () => {
    setIsCancelling(true)
    try {
      const res = await authedFetch('/api/stripe/cancel', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not cancel your plan.')
      toast.success('Your paid plan was cancelled.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel your plan.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteMine({ confirm: deleteText })
      // The server has ended every session; clear this device and leave.
      ALL_USER_KEYS.forEach(key => { try { localStorage.removeItem(key) } catch { /* ignore */ } })
      toast.success('Your account is being deleted.')
      window.location.href = '/'
    } catch (e) {
      setDeleteError(errorMessage(e, 'We could not delete your account. Please try again or contact support.'))
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Profile Information</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" autoComplete="name" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email-display">Email</Label>
          <Input id="email-display" value={user?.email ?? ''} disabled />
          <p className="text-xs text-muted-foreground">Email is managed by your login provider</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="school">School Name</Label>
            <Input id="school" name="school" value={formData.school} onChange={handleChange} placeholder="Your school" autoComplete="organization" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="county">County</Label>
            <Input id="county" name="county" value={formData.county} onChange={handleChange} placeholder="e.g. Nairobi" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="subjects">Subjects Taught</Label>
            <Input id="subjects" name="subjects" value={formData.subjects} onChange={handleChange} placeholder="e.g. Mathematics, English" autoComplete="off" />
            <p className="text-xs text-muted-foreground">Separate multiple with commas</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grades">Grades / Classes</Label>
            <Input id="grades" name="grades" value={formData.grades} onChange={handleChange} placeholder="e.g. Grade 4, Grade 5" autoComplete="off" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>CBC Experience Level</Label>
          <Select value={formData.cbcLevel} onValueChange={v => { setFormData(prev => ({ ...prev, cbcLevel: v as typeof formData.cbcLevel })); setIsDirty(true) }}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner — just getting started with CBC</SelectItem>
              <SelectItem value="intermediate">Intermediate — comfortable with most CBC concepts</SelectItem>
              <SelectItem value="advanced">Advanced — leading CBC implementation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={isSaving || !isDirty} className="w-full rounded-xl">
          {isSaving ? 'Saving…' : isDirty ? 'Save Profile' : 'Profile up to date'}
        </Button>
      </Card>

      {/* Language */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Language / Lugha</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose the language for AI responses and Teacher Tools.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setLang('en'); toast.success('Language set to English') }}
            aria-pressed={lang === 'en'}
            className={`rounded-xl p-4 border-2 text-left transition-all ${
              lang === 'en' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/40'
            }`}
          >
            <p className="font-semibold text-sm mb-0.5">English</p>
            <p className="text-xs text-muted-foreground">Full AI responses in English</p>
            {lang === 'en' && <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wide text-primary"><Check className="w-2.5 h-2.5" /> Active</span>}
          </button>

          <button
            onClick={() => { setLang('sw'); toast.success('Lugha imewekwa kwa Kiswahili') }}
            aria-pressed={lang === 'sw'}
            className={`rounded-xl p-4 border-2 text-left transition-all ${
              lang === 'sw' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/40'
            }`}
          >
            <p className="font-semibold text-sm mb-0.5">Kiswahili</p>
            <p className="text-xs text-muted-foreground">Majibu ya AI kwa Kiswahili</p>
            {lang === 'sw' && <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wide text-primary"><Check className="w-2.5 h-2.5" /> Imewashwa</span>}
          </button>
        </div>

        {lang === 'sw' && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Majibu ya AI yanaweza kuwa na makosa ya Kiswahili hasa kwa istilahi za kiufundi. Thibitisha maneno muhimu kabla ya kuyatumia darasani.</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">The AI Coach and all Teacher Tools will respond in your chosen language.</p>
      </Card>

      {/* Accessibility */}
      <Card className="p-6 space-y-5">
        <h2 className="text-xl font-semibold">Accessibility &amp; Connectivity</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              {lowBandwidth ? <WifiOff className="w-4 h-4 text-muted-foreground" /> : <Wifi className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <p className="font-medium text-sm">Low-bandwidth Mode</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hides video thumbnails and decorative media. Ideal for slow internet or mobile data.
              </p>
            </div>
          </div>
          <Switch checked={lowBandwidth} onCheckedChange={v => { setLowBandwidth(v); setLBW(v) }} aria-label="Toggle low-bandwidth mode" />
        </div>
      </Card>

      {siteFacts?.emailEnabled !== false && <EmailPreferences />}

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Where you&apos;re signed in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account works on one device, one browser and one tab at a time. Signing in anywhere else asks you to confirm, then signs this one out.
          {sessionInfo?.since ? ` Signed in here since ${new Date(sessionInfo.since).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}
        </p>
        {sessionInfo && sessionInfo.switchesLast30Days > 3 && (
          <p className="mt-2 text-sm text-amber-700">Your account was opened on {sessionInfo.switchesLast30Days} different sign-ins in the last 30 days. If some were not you, change your password below.</p>
        )}
      </Card>

      {/* Plan: where a paid plan is shown and cancelled (cancelling used to be reachable only from the delete-account dialog). */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Your plan</h2>
        {billing === undefined ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : billing.entitlement.isPaid ? (
          <div className="mt-2 space-y-3 text-sm">
            <p>
              You are on the <strong>{billing.entitlement.plan === 'school' ? 'School' : 'Professional'}</strong> plan.
              {billing.entitlement.currentPeriodEnd ? ` Current billing period ends ${new Date(billing.entitlement.currentPeriodEnd).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}.` : ''}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="min-h-11" disabled={isCancelling}>{isCancelling ? 'Cancelling…' : 'Cancel my plan'}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your plan?</AlertDialogTitle>
                  <AlertDialogDescription>Your plan ends straight away and you will not be charged again. You keep your account, progress and certificates, and go back to the free plan. You can subscribe again later.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelPlan}>Cancel my plan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You are on the free plan. <a className="text-primary underline underline-offset-4" href="/pricing">See what the paid plans change.</a>
          </p>
        )}
      </Card>

      {/* Account */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Account</h2>

        {/* Change Password: done in the app, no email */}
        <form onSubmit={handleChangePassword} className="space-y-3 rounded-xl border p-4">
          <h3 className="flex items-center gap-2 font-medium"><KeyRound className="w-4 h-4" /> Change password</h3>
          <div>
            <Label htmlFor="pw-current">Current password</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="mt-1 max-w-sm" />
          </div>
          <div>
            <Label htmlFor="pw-next">New password (at least 8 characters)</Label>
            <Input id="pw-next" type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="mt-1 max-w-sm" />
          </div>
          <div>
            <Label htmlFor="pw-again">New password again</Label>
            <Input id="pw-again" type="password" autoComplete="new-password" required minLength={8} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} className="mt-1 max-w-sm" />
          </div>
          <Button type="submit" variant="outline" disabled={changingPw}>{changingPw ? 'Changing…' : 'Change password'}</Button>
          <p className="text-xs text-muted-foreground">Signed in with Google? You have no password to change here. Forgot it? Ask support from the Support page and they will give you a temporary one.</p>
        </form>

        {/* Download Data */}
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Preparing download…' : 'Download My Data'}
        </Button>
        <p className="text-xs text-muted-foreground -mt-2">
          Downloads everything we hold about you as a file you can keep: profile, progress, certificates, activity, journal, AI conversations, community posts and support tickets.
        </p>

        {/* Delete Account */}
        <AlertDialog onOpenChange={() => { setDeleteError(''); setDeleteText('') }}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full rounded-xl gap-2">
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. We will permanently delete your profile, progress, journal, AI conversations, activity and support tickets. Your community posts are removed. A certificate you earned stays verifiable, but no longer shows your name. Download your data first if you want a copy.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {billing?.entitlement.isPaid && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <p>You have a paid plan. Cancel it first so you are not charged after your account is gone.</p>
                <Button type="button" size="sm" variant="outline" className="mt-2 min-h-11" onClick={handleCancelPlan} disabled={isCancelling}>
                  {isCancelling ? 'Cancelling…' : 'Cancel my paid plan'}
                </Button>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input id="delete-confirm" value={deleteText} onChange={e => setDeleteText(e.target.value)} autoComplete="off" className="rounded-xl min-h-11" />
              {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={e => { e.preventDefault(); void handleDeleteAccount() }}
                disabled={isDeleting || deleteText.trim() !== 'DELETE' || Boolean(billing?.entitlement.isPaid)}
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  )
}

const EMAIL_OPTIONS = [
  { key: 'tickets', label: 'Replies to my support tickets', hint: 'So you never miss an answer when you are not in the app.' },
  { key: 'certificates', label: 'Certificates I earn', hint: 'A copy of your certificate number and a link to share it.' },
  { key: 'streak', label: 'Streak reminders', hint: 'One short note in the evening when your streak is at risk.' },
  { key: 'weekly', label: 'Weekly summary', hint: 'What you learned this week, on Sunday.' },
] as const

/** Which emails the learner wants. Every email also carries a one-click unsubscribe link. */
function EmailPreferences() {
  const data = useQuery(api.emails.myPrefs, {})
  const save = useMutation(api.emails.setPrefs)
  if (!data) return null
  const set = async (key: (typeof EMAIL_OPTIONS)[number]['key'], on: boolean) => {
    try {
      await save({ prefs: { ...data.prefs, [key]: on } })
    } catch {
      toast.error('Could not save. Check your connection and try again.')
    }
  }
  return (
    <Card className="p-6 space-y-4" aria-labelledby="email-prefs-h">
      <div>
        <h2 id="email-prefs-h" className="text-xl font-semibold">Email</h2>
        <p className="text-sm text-muted-foreground">{data.hasEmail ? 'Choose what we may email you.' : 'Add an email address to your account to get emails.'}</p>
      </div>
      {EMAIL_OPTIONS.map((o) => (
        <div key={o.key} className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-sm" id={`email-${o.key}`}>{o.label}</p>
            <p className="text-sm text-muted-foreground">{o.hint}</p>
          </div>
          <Switch checked={data.prefs[o.key]} onCheckedChange={(v) => void set(o.key, v)} aria-labelledby={`email-${o.key}`} disabled={!data.hasEmail} />
        </div>
      ))}
    </Card>
  )
}
