const ROLES = ["super_admin", "content_manager", "support_agent", "viewer"] as const;
type StaffRole = (typeof ROLES)[number];

const PERMISSIONS = [
  "users.read",
  "streaks.read",
  "streaks.restore",
  "streaks.restore_bulk",
  "streaks.approve_bulk",
  "profiles.edit",
  "accounts.suspend",
  "auth.send_reset_link",
  "certificates.manage",
  "content.read",
  "content.edit",
  "content.review",
  "content.publish",
  "audit.read",
  "audit.read_all",
  "tickets.read",
  "tickets.reply",
  "analytics.read",
  "analytics.export",
  "analytics.rebuild",
  "announcements.send",
  "staff.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Single source of truth for the role matrix. The UI only mirrors this; every
// admin function enforces it server-side through convex/lib/staff.ts.
export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  content_manager: ["content.read", "content.edit", "content.review", "content.publish", "analytics.read", "announcements.send", "audit.read"],
  support_agent: [
    "users.read",
    "streaks.read",
    "streaks.restore",
    "streaks.restore_bulk",
    "profiles.edit",
    "accounts.suspend",
    "auth.send_reset_link",
    "tickets.read",
    "tickets.reply",
    "analytics.read",
    "analytics.export",
    "audit.read",
  ],
  viewer: ["users.read", "streaks.read", "content.read", "tickets.read", "analytics.read", "analytics.export", "audit.read", "audit.read_all"],
};

export function roleHasPermission(role: StaffRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Support agents may restore on their own up to this many users; above it a
// Super Admin must approve the incident.
export const BULK_APPROVAL_THRESHOLD = 50;
// A streak can only be restored for dates this many days back from today (EAT).
export const MAX_RESTORE_LOOKBACK_DAYS = 30;
export const MIN_REASON_LENGTH = 10;
