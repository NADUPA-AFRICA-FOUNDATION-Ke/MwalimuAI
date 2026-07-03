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
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/site-url'
import { toast } from 'sonner'
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
  const [isResetting, setIsResetting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting]  = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [reAuthPassword, setReAuthPassword] = useState('')

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

  const handlePasswordReset = async () => {
    const email = user?.email
    if (!email) { toast.error('No email on file'); return }
    setIsResetting(true)
    try {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`,
      })
      toast.success(`Password reset email sent to ${email}`)
    } catch {
      toast.error('Could not send reset email — check your connection')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDownload = () => {
    setIsDownloading(true)
    try {
      const data: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        email: user?.email ?? null,
        profile,
      }
      ALL_USER_KEYS.forEach(key => {
        try {
          const raw = localStorage.getItem(key)
          if (raw) data[key] = JSON.parse(raw)
        } catch {
          // ignore parse errors on individual keys
        }
      })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `mwalimu-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data downloaded')
    } catch {
      toast.error('Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.email) return
    setDeleteError('')
    setIsDeleting(true)
    // Supabase requires re-authentication via password before deleting
    setDeleteError('requires-recent-login')
    setIsDeleting(false)
  }

  const handleReAuthAndDelete = async () => {
    if (!user?.email || !reAuthPassword) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const supabase = createClient()
      // Re-authenticate by signing in with the current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reAuthPassword,
      })
      if (authError) { toast.error('Incorrect password — account not deleted'); setIsDeleting(false); return }
      // Call server-side route to delete via admin client
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      if (!res.ok) throw new Error('delete failed')
      await signOut()
    } catch {
      toast.error('Could not delete account — try again or contact support')
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
            {lang === 'en' && <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wide text-primary"><Check className="w-2.5 h-2.5" /> Active</span>}
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
            {lang === 'sw' && <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wide text-primary"><Check className="w-2.5 h-2.5" /> Imewashwa</span>}
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

      {/* Account */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Account</h2>

        {/* Change Password */}
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2"
          onClick={handlePasswordReset}
          disabled={isResetting || !user?.email}
        >
          <KeyRound className="w-4 h-4" />
          {isResetting ? 'Sending reset email…' : 'Change Password'}
        </Button>
        {user?.email && (
          <p className="text-xs text-muted-foreground -mt-2">
            A reset link will be sent to <strong>{user.email}</strong>
          </p>
        )}

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
          Downloads your profile, learning progress, journal, and activity as a JSON file.
        </p>

        {/* Delete Account */}
        <AlertDialog onOpenChange={() => { setDeleteError(''); setReAuthPassword('') }}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full rounded-xl gap-2">
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. All your progress, badges, journal entries, and learning data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteError === 'requires-recent-login' && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  For security, please re-enter your password to confirm deletion.
                </p>
                <Input
                  type="password"
                  placeholder="Your current password"
                  value={reAuthPassword}
                  onChange={e => setReAuthPassword(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {deleteError === 'requires-recent-login' ? (
                <Button
                  variant="destructive"
                  onClick={handleReAuthAndDelete}
                  disabled={isDeleting || !reAuthPassword}
                >
                  {isDeleting ? 'Deleting…' : 'Confirm delete'}
                </Button>
              ) : (
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={e => { e.preventDefault(); handleDeleteAccount() }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  )
}
