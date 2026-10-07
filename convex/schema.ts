import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const assessment = v.object({
  score: v.number(),
  total: v.number(),
  date: v.string(),
  answers: v.array(v.number()),
});

const a11ySettings = v.object({
  textSize: v.union(
    v.literal("normal"),
    v.literal("large"),
    v.literal("xlarge"),
    v.literal("xxlarge"),
  ),
  highContrast: v.boolean(),
  reduceMotion: v.boolean(),
  dyslexiaFont: v.boolean(),
  wideSpacing: v.boolean(),
});

const notificationPreferences = v.object({
  course: v.boolean(),
  achievement: v.boolean(),
  community: v.boolean(),
  announcement: v.boolean(),
  email: v.boolean(),
});

const goalCategory = v.union(
  v.literal("assessment"),
  v.literal("pedagogy"),
  v.literal("digital"),
  v.literal("community"),
  v.literal("wellbeing"),
  v.literal("other"),
);

const milestone = v.object({
  id: v.string(),
  text: v.string(),
  completed: v.boolean(),
  completedAt: v.optional(v.string()),
});

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    tokenIdentifier: v.string(),
    authSubject: v.string(),
    legacySupabaseUserId: v.optional(v.string()),
    migrationStatus: v.optional(v.union(v.literal("pending"), v.literal("linked"), v.literal("complete"))),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    school: v.optional(v.string()),
    county: v.optional(v.string()),
    subjects: v.array(v.string()),
    grades: v.array(v.string()),
    cbcLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
    ),
    lang: v.union(v.literal("en"), v.literal("sw")),
    completed: v.boolean(),
    a11ySettings,
    lowBandwidth: v.boolean(),
    notificationsState: v.object({
      read: v.array(v.string()),
      dismissed: v.array(v.string()),
    }),
    notificationPreferences: v.optional(notificationPreferences),
    sidebarCollapsed: v.boolean(),
    activeSessionId: v.optional(v.string()), // legacy device id from the old browser-only rule; no longer read
    // One account, one session (device + browser), one tab. Enforced on the server for sessions: requests from any
    // other sign-in session are refused. The tab rule is enforced by the app (all tabs of a browser share a session).
    activeAuthSession: v.optional(v.string()),
    activeTabId: v.optional(v.string()),
    sessionLog: v.optional(v.array(v.object({ at: v.number(), agent: v.string(), replaced: v.boolean() }))),
    phone: v.optional(v.string()),
    phoneNormalized: v.optional(v.string()),
    // Absent means "active" so existing rows need no backfill to keep working.
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deactivated"))),
    statusReason: v.optional(v.string()),
    statusChangedAt: v.optional(v.number()),
    searchText: v.optional(v.string()),
    // Which emails this learner wants. Absent means "yes" for each, so existing learners need no backfill.
    emailPrefs: v.optional(v.object({ streak: v.optional(v.boolean()), tickets: v.optional(v.boolean()), certificates: v.optional(v.boolean()), weekly: v.optional(v.boolean()) })),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_auth_subject", ["authSubject"])
    .index("by_legacy_supabase_user_id", ["legacySupabaseUserId"])
    .index("by_email", ["email"])
    .index("by_phone_normalized", ["phoneNormalized"])
    .index("by_status", ["status"])
    .searchIndex("search_profiles", { searchField: "searchText", filterFields: ["county", "status"] }),

  modules: defineTable({
    legacyId: v.optional(v.string()),
    programId: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    difficultyLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
    ),
    estimatedDuration: v.optional(v.number()),
    contentType: v.union(
      v.literal("video"),
      v.literal("text"),
      v.literal("interactive"),
      v.literal("quiz"),
      v.literal("mixed"),
    ),
    thumbnailUrl: v.optional(v.string()),
    isPublished: v.boolean(),
    orderIndex: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_program_and_slug", ["programId", "slug"])
    .index("by_published_and_order", ["isPublished", "orderIndex"])
    .index("by_published_category_and_order", ["isPublished", "category", "orderIndex"])
    .index("by_program_published_and_order", ["programId", "isPublished", "orderIndex"]),

  lessons: defineTable({
    legacyId: v.optional(v.string()),
    moduleId: v.id("modules"),
    slug: v.string(),
    title: v.string(),
    content: v.optional(v.string()),
    orderIndex: v.number(),
    durationMinutes: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    quizData: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_module_and_order", ["moduleId", "orderIndex"])
    .index("by_module_and_slug", ["moduleId", "slug"]),

  learningProgress: defineTable({
    userId: v.id("profiles"),
    programId: v.string(),
    completedLessons: v.array(v.string()),
    reflections: v.record(v.string(), v.string()),
    preAssessment: v.optional(assessment),
    postAssessment: v.optional(assessment),
    assignment: v.optional(v.object({
      text: v.string(),
      feedback: v.string(),
      submittedAt: v.string(),
    })),
    certificateEarnedAt: v.optional(v.string()),
    certificateSerial: v.optional(v.string()),
    cohortJoined: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_program", ["userId", "programId"])
    .index("by_program", ["programId", "updatedAt"]),

  userProgress: defineTable({
    userId: v.id("profiles"),
    moduleId: v.id("modules"),
    lessonId: v.optional(v.id("lessons")),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    completionPercentage: v.number(),
    timeSpentMinutes: v.number(),
    quizScore: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lastAccessedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_module", ["userId", "moduleId"])
    .index("by_user_module_and_lesson", ["userId", "moduleId", "lessonId"]),

  communityPosts: defineTable({
    userId: v.id("profiles"),
    authorName: v.string(),
    county: v.string(),
    category: v.union(
      v.literal("Assessment"),
      v.literal("Pedagogy"),
      v.literal("Technology"),
      v.literal("Inclusion"),
      v.literal("Wellbeing"),
      v.literal("Resources"),
      v.literal("Ask a Question"),
    ),
    title: v.string(),
    content: v.string(),
    likesCount: v.number(),
    commentsCount: v.number(),
    isPinned: v.boolean(),
    status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden")),
    createdAt: v.number(),
    updatedAt: v.number(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    // Set when staff hide a post. Hidden posts are kept (never deleted) and can be restored.
    moderatedAt: v.optional(v.number()),
    moderatedBy: v.optional(v.id("staff")),
    moderationReason: v.optional(v.string()),
    // Photos on the post. Each needs alt text. "pending" until metadata is stripped (and screened, when enabled);
    // "removed" when screening or staff took it down. Only "ok" images are shown to other teachers.
    images: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      alt: v.string(),
      status: v.union(v.literal("pending"), v.literal("ok"), v.literal("removed")),
      removedReason: v.optional(v.string()),
    }))),
  })
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_status_category_and_created_at", ["status", "category", "createdAt"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  communityComments: defineTable({
    postId: v.id("communityPosts"),
    userId: v.id("profiles"),
    authorName: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    editedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    hiddenBy: v.optional(v.id("staff")),
    hiddenReason: v.optional(v.string()),
    // Photos on the post. Each needs alt text. "pending" until metadata is stripped (and screened, when enabled);
    // "removed" when screening or staff took it down. Only "ok" images are shown to other teachers.
    images: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      alt: v.string(),
      status: v.union(v.literal("pending"), v.literal("ok"), v.literal("removed")),
      removedReason: v.optional(v.string()),
    }))),
  })
    .index("by_post_and_created_at", ["postId", "createdAt"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  // Learner reports of posts or replies, worked by staff in the console.
  communityReports: defineTable({
    postId: v.id("communityPosts"),
    commentId: v.optional(v.id("communityComments")),
    reporterId: v.id("profiles"),
    reason: v.union(v.literal("spam"), v.literal("abusive"), v.literal("misleading"), v.literal("personal_info"), v.literal("other")),
    note: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("actioned"), v.literal("dismissed")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("staff")),
  })
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_post_and_status", ["postId", "status"])
    .index("by_reporter_and_created_at", ["reporterId", "createdAt"]),

  communityPostLikes: defineTable({
    postId: v.id("communityPosts"),
    userId: v.id("profiles"),
  })
    .index("by_post_and_user", ["postId", "userId"])
    .index("by_user_and_post", ["userId", "postId"]),

  journalEntries: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    clientId: v.string(),
    entryDate: v.string(),
    title: v.string(),
    content: v.string(),
    mood: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_user_and_client_id", ["userId", "clientId"])
    .index("by_user_and_entry_date", ["userId", "entryDate"])
    .index("by_legacy_id", ["legacyId"]),

  toolHistory: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    clientId: v.string(),
    toolId: v.string(),
    title: v.string(),
    input: v.any(),
    output: v.string(),
    promptPreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_user_tool_and_created_at", ["userId", "toolId", "createdAt"])
    .index("by_user_and_client_id", ["userId", "clientId"])
    .index("by_legacy_id", ["legacyId"]),

  aiConversations: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated_at", ["userId", "updatedAt"])
    .index("by_user_and_client_id", ["userId", "clientId"])
    .index("by_legacy_id", ["legacyId"]),

  aiMessages: defineTable({
    conversationId: v.id("aiConversations"),
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation_and_created_at", ["conversationId", "createdAt"])
    .index("by_conversation_and_client_id", ["conversationId", "clientId"])
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_legacy_id", ["legacyId"]),

  goals: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    title: v.string(),
    category: goalCategory,
    milestones: v.array(milestone),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_user_and_client_id", ["userId", "clientId"])
    .index("by_legacy_id", ["legacyId"]),

  assessmentResults: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    responses: v.any(),
    knowledgeScore: v.optional(v.number()),
    recommendedProgramIds: v.optional(v.array(v.string())),
    completedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_legacy_id", ["legacyId"]),

  activityLog: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    date: v.string(),
    type: v.union(
      v.literal("lesson"),
      v.literal("tool"),
      v.literal("journal"),
      v.literal("community"),
      v.literal("login"),
      v.literal("assessment"),
    ),
    metadata: v.optional(v.any()),
    // Rows written by staff restoration are flagged so analytics can exclude them.
    source: v.optional(v.union(v.literal("user"), v.literal("restored"))),
    adjustmentId: v.optional(v.id("streakAdjustments")),
    createdAt: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_date_and_type", ["userId", "date", "type"])
    .index("by_date_and_type", ["date", "type"])
    .index("by_legacy_id", ["legacyId"]),

  toolsUsed: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    toolId: v.string(),
    firstUsedAt: v.number(),
    lastUsedAt: v.number(),
    useCount: v.number(),
  })
    .index("by_user_and_tool", ["userId", "toolId"])
    .index("by_user_and_last_used_at", ["userId", "lastUsedAt"])
    .index("by_legacy_id", ["legacyId"]),

  lessonDiscussions: defineTable({
    userId: v.optional(v.id("profiles")),
    legacyId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    programId: v.string(),
    moduleId: v.string(),
    lessonId: v.string(),
    author: v.string(),
    content: v.string(),
    isSeed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_lesson_and_created_at", ["programId", "moduleId", "lessonId", "createdAt"])
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_user_and_client_id", ["userId", "clientId"])
    .index("by_legacy_id", ["legacyId"]),

  notifications: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    type: v.union(
      v.literal("course"),
      v.literal("achievement"),
      v.literal("community"),
      v.literal("announcement"),
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user_and_created_at", ["userId", "createdAt"])
    .index("by_user_and_dedupe_key", ["userId", "dedupeKey"])
    .index("by_legacy_id", ["legacyId"]),

  subscriptions: defineTable({
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("professional"), v.literal("school")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid"),
      v.literal("paused"),
    ),
    requestedPlan: v.optional(v.union(v.literal("professional"), v.literal("school"))),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_legacy_id", ["legacyId"]),

  certificates: defineTable({
    serial: v.string(),
    userId: v.id("profiles"),
    legacyId: v.optional(v.string()),
    programId: v.string(),
    programTitle: v.string(),
    teacherName: v.string(),
    earnedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    reissuedFrom: v.optional(v.id("certificates")),
  })
    .index("by_serial", ["serial"])
    .index("by_user", ["userId"])
    .index("by_user_and_program", ["userId", "programId"]),

  // ── Admin console ──────────────────────────────────────────────────────
  staff: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"),
      v.literal("content_manager"),
      v.literal("support_agent"),
      v.literal("viewer"),
    ),
    noticesSeenAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdBy: v.optional(v.id("staff")),
    // TOTP secret is AES-GCM encrypted (ADMIN_MFA_ENC_KEY); never returned to clients.
    totpSecretEnc: v.optional(v.string()),
    mfaEnrolledAt: v.optional(v.number()),
    mfaFailedAttempts: v.optional(v.number()),
    mfaLockedUntil: v.optional(v.number()),
    lastTotpStep: v.optional(v.number()),
    // Single-use recovery codes (salted hashes), for a lost authenticator. Shown once when created.
    backupCodes: v.optional(v.array(v.string())),
    // Set when someone is invited. An invite that is never used (no 2FA set up) stops working after 14 days.
    invitedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  // One row per Convex Auth session that completed the MFA challenge.
  staffSessions: defineTable({
    staffId: v.id("staff"),
    authSessionId: v.string(),
    verifiedAt: v.number(),
  })
    .index("by_session", ["authSessionId"])
    .index("by_staff", ["staffId"]),

  // Append-only. Only convex/lib/audit.ts inserts; nothing patches or deletes.
  auditLog: defineTable({
    actorStaffId: v.id("staff"),
    actorEmail: v.string(),
    actorRole: v.string(),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    reason: v.optional(v.string()),
    incidentId: v.optional(v.id("incidents")),
    prevHash: v.string(),
    hash: v.string(),
    createdAt: v.number(),
  })
    .index("by_target", ["targetType", "targetId", "createdAt"])
    .index("by_actor", ["actorStaffId", "createdAt"])
    .index("by_action", ["action", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  streakAdjustments: defineTable({
    profileId: v.id("profiles"),
    dates: v.array(v.string()),
    reason: v.string(),
    ticketRef: v.optional(v.string()),
    incidentId: v.optional(v.id("incidents")),
    staffId: v.id("staff"),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("staff")),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId", "createdAt"])
    .index("by_incident", ["incidentId"]),

  incidents: defineTable({
    title: v.string(),
    description: v.string(),
    windowStart: v.string(), // YYYY-MM-DD, inclusive (EAT)
    windowEnd: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdBy: v.id("staff"),
    approvedBy: v.optional(v.id("staff")),
    executedBy: v.optional(v.id("staff")),
    overrideLookback: v.optional(v.boolean()),
    executeReason: v.optional(v.string()),
    // Candidate set is frozen at preview time so the run is deterministic.
    candidateCount: v.optional(v.number()),
    candidatesReady: v.boolean(),
    processedCount: v.number(),
    restoredCount: v.number(),
    skippedCount: v.number(),
    cursor: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status", "createdAt"]),

  incidentTargets: defineTable({
    incidentId: v.id("incidents"),
    profileId: v.id("profiles"),
    outcome: v.optional(v.union(v.literal("restored"), v.literal("skipped"), v.literal("failed"))),
    note: v.optional(v.string()),
    datesRestored: v.optional(v.array(v.string())),
  })
    .index("by_incident", ["incidentId"])
    .index("by_incident_and_profile", ["incidentId", "profileId"]),

  // ── Content management ─────────────────────────────────────────────────
  cmsItems: defineTable({
    kind: v.union(v.literal("program"), v.literal("module"), v.literal("lesson"), v.literal("quiz"), v.literal("assessment"), v.literal("resources"), v.literal("faq"), v.literal("post")),
    // Stable id the learner app and learningProgress refer to (e.g. "cbc-foundations", "m1", "l1").
    key: v.string(),
    parentId: v.optional(v.id("cmsItems")),
    programKey: v.string(),
    title: v.string(),
    orderIndex: v.number(),
    cbcLevels: v.array(v.string()),
    subjects: v.array(v.string()),
    counties: v.array(v.string()),
    draftVersionId: v.optional(v.id("cmsVersions")),
    publishedVersionId: v.optional(v.id("cmsVersions")),
    archivedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_kind_and_program", ["kind", "programKey", "orderIndex"])
    .index("by_parent", ["parentId", "orderIndex"])
    .index("by_program_and_key", ["programKey", "kind", "key"])
    .index("by_published_kind", ["publishedVersionId", "kind"]),

  cmsVersions: defineTable({
    itemId: v.id("cmsItems"),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("published"),
      v.literal("superseded"),
    ),
    data: v.any(),
    authorId: v.optional(v.id("staff")),
    submittedBy: v.optional(v.id("staff")),
    reviewedBy: v.optional(v.id("staff")),
    reviewComment: v.optional(v.string()),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_item", ["itemId", "version"])
    .index("by_status", ["status", "createdAt"]),

  // Support tickets raised by learners and worked by staff.
  tickets: defineTable({
    number: v.string(), // human reference, e.g. MW-4F7K2Q; staff quote it as ticketRef on streak restores
    // Set for a signed-in learner. A visitor who wrote through the public Contact/Support page has none until they
    // add the conversation to their account; until then `visitor` and `tokenHash` identify them.
    profileId: v.optional(v.id("profiles")),
    visitor: v.optional(v.object({ name: v.string(), email: v.string() })),
    tokenHash: v.optional(v.string()), // SHA-256 of the private link's token (the link itself is never stored)
    subject: v.string(),
    category: v.union(
      v.literal("streak"),
      v.literal("account"),
      v.literal("content"),
      v.literal("payment"),
      v.literal("certificate"),
      v.literal("technical"),
      v.literal("feedback"),
      v.literal("other"),
    ),
    // open: waiting for staff · in_progress: staff working on it · pending_user: waiting on the learner/visitor ·
    // resolved: answered (a reply reopens it) · closed: finished, read-only (closed automatically 7 days after resolving)
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("pending_user"), v.literal("resolved"), v.literal("closed")),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    firstResponseAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    searchText: v.optional(v.string()), // number, subject and who wrote it, lower-cased, for staff search
    assignedTo: v.optional(v.id("staff")),
    lastMessageAt: v.number(),
    lastMessageBy: v.union(v.literal("user"), v.literal("staff")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_profile", ["profileId", "lastMessageAt"])
    .index("by_status", ["status", "lastMessageAt"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_visitor_email", ["visitor.email", "createdAt"])
    .searchIndex("search_tickets", { searchField: "searchText", filterFields: ["status"] }),

  // One sitting of a pre/post assessment: when it started and ended, the score, whether the learner switched on
  // assistive input, and the integrity events seen while it was open (copy/paste attempts, leaving the window,
  // screenshots keys, developer tools). Staff review these; nothing here blocks a learner on its own.
  assessmentAttempts: defineTable({
    profileId: v.id("profiles"),
    programId: v.string(),
    kind: v.union(v.literal("pre"), v.literal("post"), v.literal("needs"), v.literal("assignment")),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    total: v.optional(v.number()),
    assistive: v.boolean(),
    events: v.array(v.object({ type: v.string(), at: v.number(), detail: v.optional(v.string()) })),
  })
    .index("by_profile_and_program", ["profileId", "programId", "startedAt"])
    .index("by_started", ["startedAt"]),

  ticketMessages: defineTable({
    ticketId: v.id("tickets"),
    author: v.union(v.literal("user"), v.literal("staff")),
    staffId: v.optional(v.id("staff")),
    authorLabel: v.string(),
    body: v.string(),
    internal: v.boolean(), // staff-only note, never returned to the learner
    attachments: v.optional(v.array(v.object({ storageId: v.id("_storage"), name: v.string(), type: v.string(), size: v.number() }))),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId", "createdAt"]),

  // Team-wide alerts for the admin console (new tickets and replies). Each staff member has a "seen up to" time.
  staffNotices: defineTable({
    kind: v.union(v.literal("ticket_new"), v.literal("ticket_reply"), v.literal("ticket_reopened"), v.literal("image_flagged")),
    title: v.string(),
    body: v.string(),
    link: v.string(),
    ticketId: v.optional(v.id("tickets")),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  // Saved replies staff can insert into a ticket answer.
  cannedReplies: defineTable({
    title: v.string(),
    body: v.string(),
    updatedBy: v.id("staff"),
    updatedAt: v.number(),
  }),

  // Pre-aggregated learning analytics, so dashboards never scan learner tables. Each counter is split over a few
  // shard rows so concurrent learners don't contend on one document; readers sum the shards.
  analyticsCounters: defineTable({
    key: v.string(),
    shard: v.number(),
    value: v.number(),
  }).index("by_key_and_shard", ["key", "shard"]),

  // Staff broadcasts shown in learners' notification bell. One row regardless of audience size; learners read the
  // ones that match them, so sending to everyone costs the same as sending to one county.
  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    audience: v.object({ all: v.boolean(), counties: v.array(v.string()), levels: v.array(v.string()) }),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    createdBy: v.id("staff"),
    createdAt: v.number(),
    cancelledAt: v.optional(v.number()),
  }).index("by_start", ["startsAt"]),

  // Grouped application errors from browsers and server routes, so problems are seen before users complain.
  // One row per distinct error (fingerprint); repeats only bump the counter, so storage stays bounded.
  clientErrors: defineTable({
    fingerprint: v.string(),
    source: v.union(v.literal("browser"), v.literal("server"), v.literal("api")),
    message: v.string(),
    stack: v.optional(v.string()),
    route: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    count: v.number(),
    firstSeen: v.number(),
    lastSeen: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("staff")),
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_last_seen", ["lastSeen"])
    .index("by_first_seen", ["firstSeen"]),

  // Outgoing email: a queue (so sending is paced and retryable) that doubles as the record of what was sent.
  emailLog: defineTable({
    profileId: v.id("profiles"),
    kind: v.union(v.literal("ticket_reply"), v.literal("certificate"), v.literal("streak"), v.literal("weekly")),
    dedupeKey: v.string(),
    to: v.string(),
    data: v.any(), // small facts for the template; the email is rendered when it is sent, not stored
    status: v.union(v.literal("queued"), v.literal("sending"), v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    claimedAt: v.optional(v.number()),
    attempts: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_dedupe", ["dedupeKey"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_profile_and_created_at", ["profileId", "createdAt"]),

  // One row: the lease that keeps a single sender running at a time.
  emailRuntime: defineTable({ leaseUntil: v.number() }),

  // Accountability record of privacy requests (Kenya Data Protection Act). Holds no personal data: the learner is
  // identified only by a one-way hash, so it survives the erasure it records.
  privacyRequests: defineTable({
    kind: v.union(v.literal("export"), v.literal("erasure_requested"), v.literal("erasure_completed")),
    ref: v.string(),
    at: v.number(),
  }).index("by_at", ["at"]),

  // Schools: a head teacher (on the School plan, or set up by staff) sees how the teachers who joined are progressing.
  // Teachers join with a code and can leave at any time, which ends the head's view of them at once.
  schools: defineTable({
    name: v.string(),
    county: v.optional(v.string()),
    code: v.string(),
    headId: v.id("profiles"),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_head", ["headId"]),

  schoolMembers: defineTable({
    schoolId: v.id("schools"),
    profileId: v.id("profiles"),
    // head = principal. Deputies and HODs manage only when the principal delegates it (canAssign); an HOD only
    // within their own department.
    role: v.union(v.literal("head"), v.literal("deputy"), v.literal("hod"), v.literal("teacher")),
    departmentId: v.optional(v.id("departments")),
    canAssign: v.optional(v.boolean()),
    status: v.union(v.literal("active"), v.literal("left"), v.literal("removed")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index("by_school_and_status", ["schoolId", "status"])
    .index("by_profile", ["profileId", "status"]),

  departments: defineTable({
    schoolId: v.id("schools"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_school", ["schoolId"]),

  // Professional-development work set by school leadership. `kind`: a module or whole path from the library, its
  // final assessment, a practical task with evidence, or a school's own path (an ordered list of modules).
  schoolAssignments: defineTable({
    schoolId: v.id("schools"),
    title: v.string(),
    description: v.string(),
    objectives: v.array(v.string()),
    skillArea: v.string(),
    kind: v.union(v.literal("module"), v.literal("assessment"), v.literal("task"), v.literal("path")),
    modules: v.array(v.object({ programId: v.string(), moduleKey: v.optional(v.string()) })), // module/path: what to complete; assessment: the program
    taskInstructions: v.optional(v.string()),
    rubric: v.optional(v.array(v.object({ criterion: v.string(), levels: v.array(v.string()) }))), // levels: EE, ME, AE, BE descriptors
    attachments: v.optional(v.array(v.object({ storageId: v.id("_storage"), name: v.string(), type: v.string(), size: v.number() }))),
    opensAt: v.number(),
    dueAt: v.number(),
    mandatory: v.boolean(),
    graceMinutes: v.number(), // 0 = strict lock at the due time
    allowResubmit: v.boolean(),
    audience: v.object({ kind: v.union(v.literal("all"), v.literal("department"), v.literal("teachers")), departmentId: v.optional(v.id("departments")), profileIds: v.optional(v.array(v.id("profiles"))) }),
    createdBy: v.id("profiles"),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  }).index("by_school", ["schoolId", "dueAt"]),

  // One row per teacher per assignment: their status, extension, score and review.
  assignmentTargets: defineTable({
    assignmentId: v.id("schoolAssignments"),
    schoolId: v.id("schools"),
    profileId: v.id("profiles"),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("submitted"), v.literal("reviewed"), v.literal("returned")),
    late: v.boolean(),
    extensionUntil: v.optional(v.number()),
    extensionReason: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    score: v.optional(v.number()), // assessment percentage
    passed: v.optional(v.boolean()),
    rating: v.optional(v.number()), // rubric average 1-4 (BE=1 … EE=4)
    blockedAttempts: v.optional(v.array(v.number())), // tries after the window closed (recorded, refused)
    reminded: v.optional(v.array(v.string())), // "48h", "24h"
    updatedAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_profile", ["profileId", "status"])
    .index("by_school", ["schoolId"]),

  taskSubmissions: defineTable({
    targetId: v.id("assignmentTargets"),
    profileId: v.id("profiles"),
    text: v.string(),
    attachments: v.optional(v.array(v.object({ storageId: v.id("_storage"), name: v.string(), type: v.string(), size: v.number() }))),
    submittedAt: v.number(),
    review: v.optional(v.object({ levels: v.array(v.number()), feedback: v.string(), reviewedBy: v.id("profiles"), reviewedAt: v.number(), allowResubmit: v.boolean() })),
  }).index("by_target", ["targetId", "submittedAt"]),

  schoolPaths: defineTable({
    schoolId: v.id("schools"),
    title: v.string(),
    description: v.string(),
    items: v.array(v.object({ programId: v.string(), moduleKey: v.string() })),
    createdBy: v.id("profiles"),
    createdAt: v.number(),
  }).index("by_school", ["schoolId"]),

  // What school leadership did: assignments, extensions, overrides, reviews, role changes.
  schoolAudit: defineTable({
    schoolId: v.id("schools"),
    actorId: v.id("profiles"),
    action: v.string(),
    targetLabel: v.string(),
    detail: v.optional(v.string()),
    at: v.number(),
  }).index("by_school", ["schoolId", "at"]),

  schoolSettings: defineTable({
    schoolId: v.id("schools"),
    termName: v.string(),
    termStart: v.number(),
    termEnd: v.number(),
  }).index("by_school", ["schoolId"]),

  // A teacher's professional record belongs to the teacher. These rows say how much of it a school may see.
  recordSharing: defineTable({
    profileId: v.id("profiles"),
    schoolId: v.id("schools"),
    level: v.union(v.literal("summary"), v.literal("full")),
    updatedAt: v.number(),
  }).index("by_profile_and_school", ["profileId", "schoolId"]),

  // Every time school leadership opens a teacher's record. The teacher can read this list.
  recordViews: defineTable({
    ownerId: v.id("profiles"),
    viewerId: v.id("profiles"),
    schoolId: v.id("schools"),
    level: v.union(v.literal("summary"), v.literal("full")),
    at: v.number(),
  }).index("by_owner", ["ownerId", "at"]),

  // A teacher asks to move to another school; that school's principal accepts or declines.
  transferRequests: defineTable({
    profileId: v.id("profiles"),
    fromSchoolId: v.optional(v.id("schools")),
    toSchoolId: v.id("schools"),
    message: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("cancelled")),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id("profiles")),
  })
    .index("by_profile", ["profileId", "status"])
    .index("by_to_school", ["toSchoolId", "status"]),

  // Daily AI allowance per learner, so one heavy user (or a script) cannot run up the bill.
  aiUsage: defineTable({
    profileId: v.id("profiles"),
    day: v.string(), // YYYY-MM-DD, Kenya time
    count: v.number(),
  })
    .index("by_profile_and_day", ["profileId", "day"])
    .index("by_day_and_count", ["day", "count"]),

  // Small switches staff can change without a deploy (AI limits, emergency stop).
  appSettings: defineTable({ key: v.string(), value: v.any(), updatedAt: v.number() }).index("by_key", ["key"]),

  // Daily proof that the audit log has not been rewritten: the chain is re-checked since the last checkpoint and the
  // newest hash is emailed to Super Admins, so a copy exists outside the database that an attacker cannot edit.
  auditCheckpoints: defineTable({
    at: v.number(),
    headHash: v.string(),
    headCreatedAt: v.number(),
    newRows: v.number(),
    status: v.union(v.literal("ok"), v.literal("broken")),
    note: v.optional(v.string()),
  }).index("by_at", ["at"]),

  // Temporary lossless landing zone used while replacing Supabase. Keeping
  // the original row and checksum makes the import resumable and auditable;
  // feature-specific backfills can promote records into typed tables later.
  migrationRecords: defineTable({
    sourceTable: v.string(),
    legacyId: v.string(),
    legacyUserId: v.optional(v.string()),
    checksum: v.string(),
    payload: v.any(),
    importedAt: v.number(),
  })
    .index("by_source_and_legacy_id", ["sourceTable", "legacyId"])
    .index("by_source", ["sourceTable"]),
});
