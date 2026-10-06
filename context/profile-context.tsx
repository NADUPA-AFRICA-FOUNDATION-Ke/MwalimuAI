'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { ConvexAuthProvider, useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex/client'
import { applyA11y, type A11ySettings } from '@/lib/a11y-settings'
import { type Lang } from '@/lib/i18n'
import {
  loadProgressFromCloud,
  setLearningProgressUser,
  syncCertificatesToRegistry,
} from '@/lib/learning-progress'
import { reportClientError } from '@/lib/report-client-error'

export interface TeacherProfile {
  name: string
  school: string
  county: string
  subjects: string[]
  grades: string[]
  cbcLevel: 'beginner' | 'intermediate' | 'advanced'
  completed: boolean
}

/** Compatibility shape used by existing dashboard components during cutover. */
export interface AuthUser {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
}

interface ProfileContextType {
  user: AuthUser | null
  authLoading: boolean
  signOut: () => Promise<void>
  profile: TeacherProfile | null
  setProfile: (p: TeacherProfile) => Promise<void>
  clearProfile: () => void
  mounted: boolean
  syncReady: boolean
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
}

const ProfileContext = createContext<ProfileContextType>({
  user: null, authLoading: true, signOut: async () => {},
  profile: null, setProfile: async () => {}, clearProfile: () => {},
  mounted: false, syncReady: false,
  lang: 'en', setLang: () => {}, toggleLang: () => {},
})

const newTabId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))

const PROFILE_KEY = 'mwalimu_profile'
const LANG_KEY = 'mwalimu_lang'
const USER_ID_KEY = 'mwalimu_user_id'
export const FORCED_LOGOUT_FLAG = 'mwalimu_signedout_other_device'

const ALL_USER_KEYS = [
  PROFILE_KEY, LANG_KEY, USER_ID_KEY,
  'mwalimu_learning_progress', 'mwalimu_activity', 'mwalimu_tools_used',
  'mwalimu_community_post_count', 'mwalimu_journal', 'mwalimu_discussions',
  'mwalimu_current_lesson', 'mwalimu_notifications_state', 'mwalimu_assessment',
  'mwalimu_a11y', 'mwalimu_low_bandwidth', 'mwalimu_sidebar_collapsed',
]

const SESSION_KEYS = [
  PROFILE_KEY, LANG_KEY, 'mwalimu_current_lesson', 'mwalimu_assessment',
  'mwalimu_notifications_state', 'mwalimu_a11y', 'mwalimu_low_bandwidth',
  'mwalimu_sidebar_collapsed',
]


function clearKeys(keys: string[]) {
  if (typeof window === 'undefined') return
  keys.forEach(key => { try { localStorage.removeItem(key) } catch {} })
}

/**
 * Local boundary for native Convex Auth. It can move to the app root once
 * marketing routes are ready to share the authenticated provider bundle.
 */
export function ConvexNativeAuthBoundary({
  children,
  handleCode = true,
}: {
  children: ReactNode
  handleCode?: boolean
}) {
  const [client] = useState(() => getConvexClient())
  if (!client) {
    return <div role="alert" className="p-6 text-center">Authentication is temporarily unavailable.</div>
  }
  return (
    <ConvexAuthProvider client={client} shouldHandleCode={handleCode}>
      {children}
    </ConvexAuthProvider>
  )
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexNativeAuthBoundary>
      <ProfileProviderInner>{children}</ProfileProviderInner>
    </ConvexNativeAuthBoundary>
  )
}

function ProfileProviderInner({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signOut: convexSignOut } = useAuthActions()
  const profileDoc = useQuery(api.profiles.me, isAuthenticated ? {} : 'skip')
  const upsertProfile = useMutation(api.profiles.upsert)
  const linkIdentity = useMutation(api.profiles.linkMigratedIdentity)
  const [profile, setProfileState] = useState<TeacherProfile | null>(null)
  const [lang, setLangState] = useState<Lang>('en')
  const [provisioning, setProvisioning] = useState(false)
  const [progressReady, setProgressReady] = useState(false)
  const provisionedFor = useRef<string | null>(null)
  // A fresh id for every page load of every tab (sessionStorage is copied when a tab is duplicated, so it is not used).
  const [tabIdValue] = useState(newTabId)
  const tabId = useRef(tabIdValue)
  const claimState = useRef<'idle' | 'claiming' | 'confirm' | 'held'>('idle')
  const [takeover, setTakeover] = useState<null | 'device' | 'tab'>(null)
  // Until this session holds the account the server refuses its requests, so the app is not shown yet.
  const [held, setHeld] = useState(false)
  const claimSession = useMutation(api.sessions.claim)
  const releaseSession = useMutation(api.sessions.release)
  // Diagnostics: a session that ends without the user (or the one-device rule) asking for it is reported once,
  // with what was left in storage, so unexpected sign-outs can be traced from the error log.
  const wasAuthenticated = useRef(false)
  const intentionalSignOut = useRef(false)

  // Link an existing/migrated profile once it has been resolved. New users
  // create their profile explicitly from the onboarding form; never create a
  // blank profile just because a lookup temporarily returned null.
  useEffect(() => {
    if (!isAuthenticated || profileDoc === undefined || profileDoc === null || provisioning) return
    const key = profileDoc._id
    if (provisionedFor.current === key) return
    provisionedFor.current = key
    setProvisioning(true)
    const provision = linkIdentity({})
    void provision.catch(error => {
      provisionedFor.current = null
      console.error('[Profile] Convex profile provisioning failed:', error)
    }).finally(() => setProvisioning(false))
  }, [isAuthenticated, profileDoc, provisioning, linkIdentity])

  const user = useMemo<AuthUser | null>(() => {
    if (!isAuthenticated || !profileDoc) return null
    const createdAt = new Date(profileDoc._creationTime).toISOString()
    return {
      id: profileDoc.legacySupabaseUserId ?? profileDoc._id,
      email: profileDoc.email ?? null,
      // Password auth is configured without email verification.
      email_confirmed_at: createdAt,
      created_at: createdAt,
    }
  }, [isAuthenticated, profileDoc])

  // Hydrate the device cache from Convex before dashboard consumers read
  // progress. The migrated rows live in Convex, while the existing learning
  // screens intentionally use the local cache for fast synchronous reads.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLearningProgressUser(null)
      setProgressReady(false)
      return
    }
    let active = true
    setProgressReady(false)
    setLearningProgressUser(user.id)
    void loadProgressFromCloud(user.id)
      .then(() => {
        if (active) syncCertificatesToRegistry(profile?.name ?? '')
      })
      .finally(() => {
        if (active) setProgressReady(true)
      })
    return () => { active = false }
  }, [isAuthenticated, profile?.name, user])

  useEffect(() => {
    if (!profileDoc) {
      if (!isAuthenticated) setProfileState(null)
      return
    }

    const nextProfile: TeacherProfile = {
      name: profileDoc.name ?? '',
      school: profileDoc.school ?? '',
      county: profileDoc.county ?? '',
      subjects: profileDoc.subjects,
      grades: profileDoc.grades,
      cbcLevel: profileDoc.cbcLevel,
      completed: profileDoc.completed,
    }
    setProfileState(nextProfile)
    setLangState(profileDoc.lang)
    try {
      const previousUser = localStorage.getItem(USER_ID_KEY)
      const nextUser = profileDoc.legacySupabaseUserId ?? profileDoc._id
      if (previousUser && previousUser !== nextUser) clearKeys(ALL_USER_KEYS)
      localStorage.setItem(USER_ID_KEY, nextUser)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
      localStorage.setItem(LANG_KEY, profileDoc.lang)
      localStorage.setItem('mwalimu_a11y', JSON.stringify(profileDoc.a11ySettings))
      localStorage.setItem('mwalimu_low_bandwidth', String(profileDoc.lowBandwidth))
      localStorage.setItem('mwalimu_sidebar_collapsed', String(profileDoc.sidebarCollapsed))
      localStorage.setItem('mwalimu_notifications_state', JSON.stringify(profileDoc.notificationsState))
      applyA11y(profileDoc.a11ySettings as A11ySettings)
    } catch {}
  }, [isAuthenticated, profileDoc])

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) { wasAuthenticated.current = true; return }
    if (!wasAuthenticated.current || intentionalSignOut.current) return
    wasAuthenticated.current = false
    let detail = 'storage unreadable'
    try {
      const keys = Object.keys(localStorage)
      detail = `refresh token ${keys.some(k => k.startsWith('__convexAuthRefreshToken')) ? 'still stored' : 'gone'}, jwt ${keys.some(k => k.startsWith('__convexAuthJWT')) ? 'still stored' : 'gone'}`
    } catch {}
    reportClientError(new Error(`Signed out without the user asking (${detail})`))
  }, [isLoading, isAuthenticated])

  // One account, one session (device and browser), one tab. The server holds which session and tab own the account
  // (sessions.claim) and refuses requests from any other session. This tab claims on load; if another device or browser
  // holds the account, the person confirms before taking over. A replaced session signs out; a second tab locks.
  useEffect(() => {
    if (!user || !profileDoc) { claimState.current = 'idle'; setHeld(false); return }
    if (claimState.current !== 'idle') return
    claimState.current = 'claiming'
    void claimSession({ tabId: tabId.current, confirm: false, agent: navigator.userAgent })
      .then((r) => {
        if (r.status === 'confirm') { claimState.current = 'confirm'; setTakeover('device') }
        else { claimState.current = 'held'; setHeld(true) }
      })
      .catch(() => { claimState.current = 'idle' })
  }, [user, profileDoc, claimSession])

  useEffect(() => {
    if (!profileDoc || claimState.current !== 'held') return
    const session = (profileDoc as { session?: { isActive: boolean; activeTabId: string | null } }).session
    if (!session) return
    if (!session.isActive) {
      // Another device or browser took the account over: this session is already refused by the server.
      try { sessionStorage.setItem(FORCED_LOGOUT_FLAG, '1') } catch {}
      intentionalSignOut.current = true
      void convexSignOut()
      return
    }
    setTakeover(session.activeTabId && session.activeTabId !== tabId.current ? 'tab' : null)
  }, [profileDoc, convexSignOut])

  const takeOver = useCallback(async () => {
    claimState.current = 'claiming'
    try {
      await claimSession({ tabId: tabId.current, confirm: true, agent: navigator.userAgent })
      claimState.current = 'held'
      setHeld(true)
      setTakeover(null)
    } catch {
      claimState.current = 'idle'
      toast.error('Could not continue here. Please try again.')
    }
  }, [claimSession])

  const setProfile = useCallback(async (next: TeacherProfile) => {
    setProfileState(next)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)) } catch {}
    try {
      await upsertProfile({
        name: next.name,
        school: next.school,
        county: next.county,
        subjects: next.subjects,
        grades: next.grades,
        cbcLevel: next.cbcLevel,
        completed: next.completed,
        lang,
      })
    } catch (error) {
      console.error('[Profile] Convex save failed:', error)
      toast.error("Couldn't save your profile to the cloud", {
        description: 'Saved on this device. Please retry when your connection is restored.',
      })
      throw error
    }
  }, [lang, upsertProfile])

  const clearProfile = useCallback(() => {
    setProfileState(null)
    try { localStorage.removeItem(PROFILE_KEY) } catch {}
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    if (typeof document !== 'undefined') document.documentElement.lang = next
    try { localStorage.setItem(LANG_KEY, next) } catch {}
    if (isAuthenticated) void upsertProfile({ lang: next })
  }, [isAuthenticated, upsertProfile])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'sw' : 'en')
  }, [lang, setLang])

  const signOut = useCallback(async () => {
    intentionalSignOut.current = true
    if (user) {
      try { localStorage.setItem(USER_ID_KEY, user.id) } catch {}
      try { await releaseSession({}) } catch {}
    }
    await convexSignOut()
    clearKeys(SESSION_KEYS)
    clearProfile()
  }, [user, releaseSession, convexSignOut, clearProfile])

  // Profile linking and the active-device claim are background sync work. Do
  // not hold the whole dashboard behind those mutations once the profile
  // query has returned; they do not affect the first render.
  // Do not let dashboard guards observe the one-render gap between the cloud
  // profile query returning and the compatibility profile state being set.
  // Without this, an existing completed account can be redirected to
  // onboarding even though `profiles.me` already returned its record.
  const authLoading = isLoading || (
    isAuthenticated && (
      profileDoc === undefined ||
      (profileDoc !== null && profile === null)
    )
  )

  return (
    <ProfileContext.Provider value={{
      user, authLoading, signOut,
      profile, setProfile, clearProfile,
      mounted: !isLoading,
      syncReady: Boolean(isAuthenticated && profileDoc && progressReady),
      lang, setLang, toggleLang,
    }}>
      {user && profileDoc && held && (profileDoc as { session?: { isActive: boolean } }).session?.isActive === false ? (
        <div role="status" className="flex min-h-[100dvh] items-center justify-center p-6 text-center text-sm text-muted-foreground">Your account was opened on another device or browser, so you are being signed out here…</div>
      ) : user && profileDoc && !held ? (
        takeover ? null : <div role="status" className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">Checking your sign-in…</div>
      ) : children}
      {takeover && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="takeover-h" className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 p-6 backdrop-blur">
          <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-xl">
            <h2 id="takeover-h" className="text-lg font-semibold">
              {takeover === 'device' ? 'Your account is open somewhere else' : 'Mwalimu AI is open in another tab'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {takeover === 'device'
                ? 'You can use Mwalimu AI on one device and one browser at a time. Continue here to sign the other one out. If that was not you, continue here and change your password in Settings.'
                : 'You can use one tab at a time. Use it here and the other tab will pause.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => void takeOver()} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                {takeover === 'device' ? 'Continue here' : 'Use it here'}
              </button>
              {takeover === 'device' && (
                <button type="button" onClick={() => void signOut()} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
