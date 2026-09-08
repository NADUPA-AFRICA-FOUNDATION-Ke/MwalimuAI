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

const PROFILE_KEY = 'mwalimu_profile'
const LANG_KEY = 'mwalimu_lang'
const USER_ID_KEY = 'mwalimu_user_id'
const DEVICE_KEY = 'mwalimu_device_id'
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

function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown-device'
  }
}

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
  const claimedFor = useRef<string | null>(null)

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

  // Preserve the existing one-active-device experience through Convex.
  useEffect(() => {
    if (!user || !profileDoc) {
      claimedFor.current = null
      return
    }
    const deviceId = getDeviceId()
    if (!claimedFor.current) {
      claimedFor.current = deviceId
      void upsertProfile({ activeSessionId: deviceId })
      return
    }
    if (profileDoc.activeSessionId && profileDoc.activeSessionId !== claimedFor.current) {
      try { sessionStorage.setItem(FORCED_LOGOUT_FLAG, '1') } catch {}
      void convexSignOut()
    }
  }, [user, profileDoc, upsertProfile, convexSignOut])

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
    if (user) {
      try { localStorage.setItem(USER_ID_KEY, user.id) } catch {}
      try { await upsertProfile({ activeSessionId: '' }) } catch {}
    }
    await convexSignOut()
    clearKeys(SESSION_KEYS)
    clearProfile()
  }, [user, upsertProfile, convexSignOut, clearProfile])

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
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
