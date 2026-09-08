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
    activeSessionId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_auth_subject", ["authSubject"])
    .index("by_legacy_supabase_user_id", ["legacySupabaseUserId"])
    .index("by_email", ["email"]),

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
    .index("by_user_and_program", ["userId", "programId"]),

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
    status: v.union(v.literal("active"), v.literal("deleted")),
    createdAt: v.number(),
    updatedAt: v.number(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
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
  })
    .index("by_post_and_created_at", ["postId", "createdAt"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

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
    createdAt: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_date_and_type", ["userId", "date", "type"])
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
  })
    .index("by_serial", ["serial"])
    .index("by_user", ["userId"])
    .index("by_user_and_program", ["userId", "programId"]),

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
