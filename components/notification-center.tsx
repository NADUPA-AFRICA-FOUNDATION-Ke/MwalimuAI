'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { Bell, X, BookOpen, Award, MessageSquare, Megaphone, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/convex/_generated/api'
import { useProfile } from '@/context/profile-context'

type NotificationType = 'course' | 'achievement' | 'community' | 'announcement'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  read: boolean
  link?: string
}

const SEED_NOTIFICATIONS: Omit<Notification, 'read'>[] = [
  {
    id: 'welcome',
    type: 'announcement',
    title: 'Welcome to Mwalimu AI!',
    message: 'Start your professional development journey with our AI-powered platform.',
    time: 'Just now',
    link: '/dashboard',
  },
  {
    id: 'module-1',
    type: 'course',
    title: 'New Module Available',
    message: 'CBC Fundamentals module is now available. Start learning today!',
    time: '5 min ago',
    link: '/dashboard/modules/1',
  },
  {
    id: 'assessment-cta',
    type: 'course',
    title: 'Complete Your Assessment',
    message: 'Take your needs assessment to get personalised learning recommendations.',
    time: '1 day ago',
    link: '/dashboard/assessment',
  },
]

const NOTIF_KEY = 'mwalimu_notifications_state'

interface NotifState {
  read: string[]       // IDs the user has marked as read
  dismissed: string[]  // IDs the user has deleted
}

const updateNotificationPreferences = makeFunctionReference<'mutation', { notificationsState: NotifState }, unknown>('profiles:updatePreferences')

function loadState(): NotifState {
  if (typeof window === 'undefined') return { read: [], dismissed: [] }
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? (JSON.parse(raw) as NotifState) : { read: [], dismissed: [] }
  } catch {
    return { read: [], dismissed: [] }
  }
}

function saveState(state: NotifState) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(state)) } catch {}
}

function buildNotifications(state: NotifState): Notification[] {
  return SEED_NOTIFICATIONS
    .filter(n => !state.dismissed.includes(n.id))
    .map(n => ({ ...n, read: state.read.includes(n.id) }))
}

const notificationIcons: Record<NotificationType, typeof BookOpen> = {
  course: BookOpen,
  achievement: Award,
  community: MessageSquare,
  announcement: Megaphone,
}

const notificationColors: Record<NotificationType, string> = {
  course: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  achievement: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  community: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  announcement: 'bg-primary/10 text-primary',
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user } = useProfile()
  const cloudProfile = useQuery(api.profiles.me, user ? {} : 'skip')
  const updatePreferences = useMutation(updateNotificationPreferences)

  // Load persisted state once on mount
  useEffect(() => {
    setNotifications(buildNotifications(loadState()))
  }, [])

  // Merge remote state with any actions taken while offline. This keeps
  // dismissals/read markers monotonic and retains localStorage as fallback.
  useEffect(() => {
    if (!cloudProfile?.notificationsState) return
    const local = loadState()
    const merged: NotifState = {
      read: [...new Set([...cloudProfile.notificationsState.read, ...local.read])],
      dismissed: [...new Set([...cloudProfile.notificationsState.dismissed, ...local.dismissed])],
    }
    saveState(merged)
    setNotifications(buildNotifications(merged))
  }, [cloudProfile?.notificationsState])

  const persistToCloud = useCallback((state: NotifState) => {
    if (!user) return
    void updatePreferences({ notificationsState: state })
      .catch(err => console.error('[mwalimu] notification state sync failed:', err))
  }, [updatePreferences, user])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const markAsRead = (id: string) => {
    const state = loadState()
    if (!state.read.includes(id)) {
      state.read = [...state.read, id]
      saveState(state)
      persistToCloud(state)
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    const state = loadState()
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    state.read = [...new Set([...state.read, ...unreadIds])]
    saveState(state)
    persistToCloud(state)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    const state = loadState()
    if (!state.dismissed.includes(id)) {
      state.dismissed = [...state.dismissed, id]
      saveState(state)
      persistToCloud(state)
    }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    const state = loadState()
    state.dismissed = [...new Set([...state.dismissed, ...notifications.map(n => n.id)])]
    saveState(state)
    persistToCloud(state)
    setNotifications([])
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.link) router.push(notification.link)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative min-w-11 min-h-11 inline-flex items-center justify-center hover:bg-muted rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className={cn('w-5 h-5 transition-colors', isOpen ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-accent text-accent-foreground rounded-full px-1 animate-pulse motion-reduce:animate-none" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-[24rem] bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-label="Notifications"
          aria-modal="false"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="min-h-11 text-xs text-primary hover:underline font-medium focus-visible:ring-2 focus-visible:ring-ring rounded px-2"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-w-11 min-h-11 inline-flex items-center justify-center hover:bg-muted rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type]
                  return (
                    <li
                      key={notification.id}
                      className={cn('group relative flex items-stretch', !notification.read && 'bg-primary/5')}
                    >
                      {/* Main clickable area — no nested buttons inside */}
                      <button
                        className="flex-1 text-left px-4 py-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        onClick={() => handleNotificationClick(notification)}
                        aria-label={`${notification.title}${!notification.read ? ' (unread)' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn('flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', notificationColors[notification.type])}
                            aria-hidden="true"
                          >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn('text-sm font-medium truncate', !notification.read && 'text-foreground')}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" aria-hidden="true" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </button>
                      {/* Action buttons — siblings of main button, shown on hover/focus */}
                      <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="min-w-11 min-h-11 inline-flex items-center justify-center hover:bg-background rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteNotification(notification.id)}
                          className="min-w-11 min-h-11 inline-flex items-center justify-center hover:bg-background rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <button
                type="button"
                onClick={clearAll}
                className="min-h-11 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded px-2"
              >
                Clear all
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                type="button"
                onClick={() => { setIsOpen(false); router.push('/dashboard/settings') }}
              >
                Notification settings
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
