'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode,
} from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { syncActivityFromSupabase, syncToolsUsedFromSupabase, syncCommunityPostsFromSupabase } from '@/lib/streak'
import { setLearningProgressUser, loadProgressFromCloud, syncCertificatesToRegistry } from '@/lib/learning-progress'
import { setA11yUser, applyA11y, type A11ySettings } from '@/lib/a11y-settings'
import { setAccessibilityUser } from '@/lib/accessibility'
import { trackWrite, flushWrites } from '@/lib/write-queue'
import { decideDeviceAction } from '@/lib/device-claim'
import { type Lang } from '@/lib/i18n'

export interface TeacherProfile {
  name:      string
  school:    string
  county:    string
  subjects:  string[]
  grades:    string[]
  cbcLevel:  'beginner' | 'intermediate' | 'advanced'
  completed: boolean
}

interface ProfileContextType {
  user:         User | null
  authLoading:  boolean
  signOut:      () => Promise<void>
  profile:      TeacherProfile | null
  setProfile:   (p: TeacherProfile) => Promise<void>
  clearProfile: () => void
  mounted:      boolean
  syncReady:    boolean
  lang:         Lang
  setLang:      (l: Lang) => void
  toggleLang:   () => void
}

const ProfileContext = createContext<ProfileContextType>({
  user: null, authLoading: true, signOut: async () => {},
  profile: null, setProfile: async () => {}, clearProfile: () => {},
  mounted: false, syncReady: false,
  lang: 'en', setLang: () => {}, toggleLang: () => {},
})

const PROFILE_KEY  = 'mwalimu_profile'
const LANG_KEY     = 'mwalimu_lang'
const USER_ID_KEY  = 'mwalimu_user_id'
const DEVICE_KEY   = 'mwalimu_device_id'
export const FORCED_LOGOUT_FLAG = 'mwalimu_signedout_other_device'

// Stable per-browser device id used to enforce one-active-device-per-account.
function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown-device'
  }
}


// All keys that belong to a specific user — cleared when a DIFFERENT user signs in.
const ALL_USER_KEYS = [
  PROFILE_KEY, LANG_KEY, USER_ID_KEY,
  'mwalimu_learning_progress', 'mwalimu_activity', 'mwalimu_tools_used',
  'mwalimu_community_post_count',
  'mwalimu_journal', 'mwalimu_discussions', 'mwalimu_current_lesson',
  'mwalimu_notifications_state', 'mwalimu_assessment',
  'mwalimu_a11y', 'mwalimu_low_bandwidth', 'mwalimu_sidebar_collapsed',
]

// Keys that are session/preference-only and safe to clear on every sign-out.
// Progress keys (learning_progress, activity, tools_used, journal, discussions)
// are intentionally omitted so same-user re-login keeps local data as a fallback
// in case any Supabase writes were lost.
const SESSION_KEYS = [
  PROFILE_KEY, LANG_KEY,
  'mwalimu_current_lesson', 'mwalimu_assessment',
  'mwalimu_notifications_state',
  'mwalimu_a11y', 'mwalimu_low_bandwidth', 'mwalimu_sidebar_collapsed',
]

function clearLocalUserData() {
  if (typeof window === 'undefined') return
  ALL_USER_KEYS.forEach(key => { try { localStorage.removeItem(key) } catch {} })
}

function clearSessionData() {
  if (typeof window === 'undefined') return
  SESSION_KEYS.forEach(key => { try { localStorage.removeItem(key) } catch {} })
}

// Map Supabase snake_case columns → TeacherProfile camelCase
function dbToProfile(row: Record<string, unknown>): TeacherProfile {
  return {
    name:      (row.name      as string)  ?? '',
    school:    (row.school    as string)  ?? '',
    county:    (row.county    as string)  ?? '',
    subjects:  (row.subjects  as string[]) ?? [],
    grades:    (row.grades    as string[]) ?? [],
    cbcLevel:  ((row.cbc_level as string) ?? 'beginner') as TeacherProfile['cbcLevel'],
    completed: (row.completed as boolean) ?? false,
  }
}

// Seed localStorage from the preference columns on the profile row.
// Called after every successful profile load from Supabase so all
// setting modules (a11y, accessibility, notification-center, layout)
// read the correct user values on mount.
function applyPrefsFromRow(row: Record<string, unknown>, userId: string, accountCreatedAt: string) {
  // ── Accessibility settings ──────────────────────────────────
  if (row.a11y_settings) {
    try { localStorage.setItem('mwalimu_a11y', JSON.stringify(row.a11y_settings)) } catch {}
    applyA11y(row.a11y_settings as A11ySettings)
  }

  // ── Low-bandwidth mode ──────────────────────────────────────
  if (typeof row.low_bandwidth === 'boolean') {
    try { localStorage.setItem('mwalimu_low_bandwidth', String(row.low_bandwidth)) } catch {}
  }

  // ── Sidebar collapsed ──────────────────────────────────────
  if (typeof row.sidebar_collapsed === 'boolean') {
    try { localStorage.setItem('mwalimu_sidebar_collapsed', String(row.sidebar_collapsed)) } catch {}
  }

  // ── Notification read/dismissed state ──────────────────────
  // Prefer the cloud value; for returning users whose cloud value is
  // still the default empty array, fall back to the 24 h auto-seed.
  const cloudNotif = row.notifications_state as { read: string[]; dismissed: string[] } | null
  const hasCloudNotifData = cloudNotif && (cloudNotif.read.length > 0 || cloudNotif.dismissed.length > 0)

  if (hasCloudNotifData) {
    try { localStorage.setItem('mwalimu_notifications_state', JSON.stringify(cloudNotif)) } catch {}
  } else if (!localStorage.getItem('mwalimu_notifications_state')) {
    // No cloud data and no local cache — auto-seed for returning users so
    // they are not re-shown onboarding notifications on every new device.
    const accountAgeMs = Date.now() - new Date(accountCreatedAt).getTime()
    if (accountAgeMs > 24 * 60 * 60 * 1000) {
      const seeded = { read: ['welcome', 'module-1', 'assessment-cta'], dismissed: [] }
      try { localStorage.setItem('mwalimu_notifications_state', JSON.stringify(seeded)) } catch {}
      // Persist the seed to Supabase so it is ready on the next new device
      const supabase = createClient()
      trackWrite(supabase
        .from('profiles')
        .upsert({ id: userId, notifications_state: seeded, updated_at: new Date().toISOString() }))
    }
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfileState]    = useState<TeacherProfile | null>(null)
  const [lang, setLangState]          = useState<Lang>('en')
  const [mounted, setMounted]         = useState(false)
  const [syncReady, setSyncReady]     = useState(false)
  // Stable client — one instance per provider lifecycle so all writes share
  // the same auth session and onAuthStateChange fires exactly once.
  const [supabase] = useState(() => createClient())
  // Single-device claim state.
  // deviceClaimPending: true while a claim write is in flight (watchdog pauses).
  // claimedDeviceId: the device id we wrote as the active session — the watchdog
  //   compares against THIS, not getDeviceId(), so localStorage eviction can't
  //   cause a false logout.
  // claimedForUser: the user id we last claimed for, so the claim runs once per
  //   login instead of on every spurious SIGNED_IN re-fire (supabase-js v2 emits
  //   SIGNED_IN on tab focus and token refresh, not only on real logins).
  const deviceClaimPending = useRef(false)
  const claimedDeviceId    = useRef<string | null>(null)
  const claimedForUser     = useRef<string | null>(null)

  const claimDevice = useCallback(async (userId: string) => {
    if (claimedForUser.current === userId) return // already claimed this login
    claimedForUser.current = userId
    const deviceId = getDeviceId()
    claimedDeviceId.current = deviceId
    deviceClaimPending.current = true
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        active_session_id: deviceId,
        updated_at: new Date().toISOString(),
      })
      // Revoke other devices' refresh tokens (server-side backstop). Once per
      // login, never on focus/refresh re-fires.
      await supabase.auth.signOut({ scope: 'others' })
    } catch (err) {
      console.error('[mwalimu] device claim failed:', err)
    }
    deviceClaimPending.current = false
  }, [supabase])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setAuthLoading(false)
        setMounted(true)
      }
    })

    // The handler must NOT run inside the onAuthStateChange callback itself:
    // supabase-js holds its auth lock while dispatching the event, so awaiting
    // other Supabase calls there deadlocks token refresh — the session cookie
    // then expires and the next server-validated navigation logs the user out.
    const handleSession = async (event: string, session: Session | null) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)

        if (nextUser) {
          // ── Single-device enforcement: claim the account for this device
          // once per login. Claiming on a restored session (INITIAL_SESSION)
          // too means a returning sole device always re-asserts ownership and
          // never locks itself out; only a device that is superseded while
          // actively open is signed out (by the watchdog below). claimDevice
          // is deduped, so spurious SIGNED_IN re-fires (focus/token refresh)
          // do not re-run signOut({scope:'others'}).
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && typeof window !== 'undefined') {
            await claimDevice(nextUser.id)
          }

          // Reset syncReady so the dashboard waits for fresh cloud data
          setSyncReady(false)

          // If a DIFFERENT user is signing in, wipe the previous user's data.
          // Same-user re-login keeps local progress as a fallback (cloud sync
          // will overwrite with authoritative data once syncReady fires).
          if (typeof window !== 'undefined') {
            const prevId = localStorage.getItem(USER_ID_KEY)
            if (prevId && prevId !== nextUser.id) {
              clearLocalUserData()
            }
            try { localStorage.setItem(USER_ID_KEY, nextUser.id) } catch {}
          }

          // Wire per-user Supabase sync for all setting modules
          setLearningProgressUser(nextUser.id)
          setA11yUser(nextUser.id)
          setAccessibilityUser(nextUser.id)

          // Load profile from Supabase, fall back to localStorage cache when offline
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', nextUser.id)
              .maybeSingle()

            const row = data as Record<string, unknown> | null

            if (row?.completed) {
              // Cloud has a finished profile — use it as source of truth
              const p = dbToProfile(row)
              setProfileState(p)
              localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
              if (row.lang === 'en' || row.lang === 'sw') setLangState(row.lang as Lang)
              // Apply all preference columns to localStorage/DOM
              applyPrefsFromRow(row, nextUser.id, nextUser.created_at)
            } else {
              // Cloud has no row or an incomplete row — prefer localStorage cache
              const local = localStorage.getItem(PROFILE_KEY)
              if (local) {
                const cached = JSON.parse(local) as TeacherProfile
                setProfileState(cached)
                // Re-sync completed profile back to cloud so future logins work without localStorage
                if (cached.completed) {
                  supabase.from('profiles').upsert({
                    id:        nextUser.id,
                    name:      cached.name,
                    school:    cached.school,
                    county:    cached.county,
                    subjects:  cached.subjects,
                    grades:    cached.grades,
                    cbc_level: cached.cbcLevel,
                    completed: true,
                    updated_at: new Date().toISOString(),
                  }).then(
                    ({ error }) => { if (error) console.error('[Profile] Re-sync failed:', error.message) },
                    (err) => console.error('[Profile] Re-sync error:', err),
                  )
                }
              }
              // Still try to apply prefs from partial row (may have non-profile pref columns)
              if (row) applyPrefsFromRow(row, nextUser.id, nextUser.created_at)
            }
          } catch {
            const local = localStorage.getItem(PROFILE_KEY)
            if (local) setProfileState(JSON.parse(local) as TeacherProfile)
          }

          const storedLang = localStorage.getItem(LANG_KEY) as Lang | null
          if (storedLang === 'en' || storedLang === 'sw') setLangState(storedLang)

          // Kick off cloud syncs in the background. setSyncReady(true) fires when
          // all three settle so the dashboard knows localStorage is freshly populated.
          Promise.allSettled([
            syncActivityFromSupabase(nextUser.id),
            syncToolsUsedFromSupabase(nextUser.id),
            loadProgressFromCloud(nextUser.id),
            syncCommunityPostsFromSupabase(nextUser.id),
          ]).then(() => {
            // Backfill the certificate registry once cloud progress is loaded,
            // so any certificate whose registration was lost verifies at /verify.
            try {
              const local = localStorage.getItem(PROFILE_KEY)
              const name = local ? (JSON.parse(local) as TeacherProfile).name : ''
              syncCertificatesToRegistry(name || 'Teacher')
            } catch {}
            setSyncReady(true)
          })
        } else {
          // Session gone (sign-out or expiry) — null out all module user IDs
          // so subsequent writes don't attempt authenticated Supabase calls
          // with a stale (now-invalid) token.
          setLearningProgressUser(null)
          setA11yUser(null)
          setAccessibilityUser(null)
          setProfileState(null)
          setSyncReady(false)
          // Allow the next login (any user) to claim cleanly.
          claimedForUser.current  = null
          claimedDeviceId.current = null
        }

        // Always resolve auth and mount together — never leave the app in a
        // partial state where authLoading=false but mounted=false.
        setAuthLoading(false)
        setMounted(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Defer all work out of the callback so the auth lock is released
        // immediately (see comment on handleSession above).
        setTimeout(() => { void handleSession(event, session) }, 0)
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Single-device watchdog ──────────────────────────────────────
  // While signed in, periodically (and on tab focus) compare this browser's
  // device id with profiles.active_session_id. If another device has claimed
  // the account, sign this one out locally and explain why on the login page.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return
    let cancelled = false

    const readRemote = async (): Promise<{ ok: boolean; remote: string | null }> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('active_session_id')
        .eq('id', user.id)
        .maybeSingle()
      if (error || !data) return { ok: false, remote: null } // column missing pre-migration → no enforcement
      return { ok: true, remote: (data.active_session_id as string | null) }
    }

    const check = async () => {
      if (cancelled || deviceClaimPending.current) return
      try {
        const first = await readRemote()
        if (cancelled || !first.ok) return

        const claimed = claimedDeviceId.current ?? getDeviceId()
        const action  = decideDeviceAction(first.remote, claimed)

        if (action === 'reclaim') {
          await claimDevice(user.id)
          return
        }
        if (action !== 'logout') return

        // Confirm with a second read after a short delay before signing out,
        // so a transient read during another tab's claim cannot bounce us.
        await new Promise(r => setTimeout(r, 1500))
        if (cancelled || deviceClaimPending.current) return
        const second = await readRemote()
        if (cancelled || !second.ok) return
        if (decideDeviceAction(second.remote, claimedDeviceId.current ?? getDeviceId()) !== 'logout') return

        try { sessionStorage.setItem(FORCED_LOGOUT_FLAG, '1') } catch {}
        await flushWrites()
        await supabase.auth.signOut({ scope: 'local' })
        // onAuthStateChange's signed-out branch + the dashboard auth guard
        // handle cleanup and the redirect to /auth/login.
      } catch {}
    }

    void check()
    const interval = setInterval(check, 60_000)
    const onFocus = () => { void check() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [user, supabase, claimDevice])

  const setProfile = useCallback(async (p: TeacherProfile) => {
    setProfileState(p)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))

    if (user) {
      const upsertRow = {
        id:        user.id,
        name:      p.name,
        school:    p.school,
        county:    p.county,
        subjects:  p.subjects,
        grades:    p.grades,
        cbc_level: p.cbcLevel,
        lang,
        completed: p.completed,
        updated_at: new Date().toISOString(),
      }
      // supabase never throws — errors come back as { error }, not exceptions.
      let { error } = await supabase.from('profiles').upsert(upsertRow)
      if (error) {
        // Losing this write is high-stakes (it's what marks onboarding as
        // complete) — retry once before giving up, since most failures here
        // are transient network blips right after a fresh sign-in.
        ;({ error } = await supabase.from('profiles').upsert(upsertRow))
      }
      if (error) {
        console.error('[Profile] Cloud save failed:', error.message)
        toast.error("Couldn't save your profile to the cloud", {
          description: 'Saved on this device — it will sync automatically once the connection is back.',
        })
      }
    }
  }, [user, lang, supabase])

  const clearProfile = useCallback(() => {
    setProfileState(null)
    try { localStorage.removeItem(PROFILE_KEY) } catch {}
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') document.documentElement.lang = l === 'sw' ? 'sw' : 'en'
    try { localStorage.setItem(LANG_KEY, l) } catch {}
    if (user) {
      trackWrite(supabase.from('profiles').upsert({ id: user.id, lang: l, updated_at: new Date().toISOString() }))
    }
  }, [user, supabase])

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next: Lang = prev === 'en' ? 'sw' : 'en'
      if (typeof window !== 'undefined') document.documentElement.lang = next === 'sw' ? 'sw' : 'en'
      try { localStorage.setItem(LANG_KEY, next) } catch {}
      if (user) {
        trackWrite(supabase.from('profiles').upsert({ id: user.id, lang: next, updated_at: new Date().toISOString() }))
      }
      return next
    })
  }, [user, supabase])

  const signOut = useCallback(async () => {
    // Release the device claim so the next sign-in (any device) starts clean.
    if (user) {
      try { await supabase.from('profiles').update({ active_session_id: null }).eq('id', user.id) } catch {}
    }
    // Drain all in-flight writes before invalidating the session token.
    await flushWrites()
    // Stamp the user ID so same-user re-login recognises the local cache
    // as belonging to them and skips the full data wipe.
    if (user && typeof window !== 'undefined') {
      try { localStorage.setItem(USER_ID_KEY, user.id) } catch {}
    }
    await supabase.auth.signOut()
    setLearningProgressUser(null)
    setA11yUser(null)
    setAccessibilityUser(null)
    // Only clear session/preference data. Progress keys (learning_progress,
    // activity, tools_used, etc.) are preserved so re-login can use them as
    // a local fallback even if Supabase writes were lost.
    clearSessionData()
    clearProfile()
  }, [user, clearProfile, supabase])

  return (
    <ProfileContext.Provider value={{
      user, authLoading, signOut,
      profile, setProfile, clearProfile, mounted, syncReady,
      lang, setLang, toggleLang,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
