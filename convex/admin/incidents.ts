import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { staffMutation, staffQuery } from "../lib/staff";
import { writeAudit } from "../lib/audit";
import { BULK_APPROVAL_THRESHOLD } from "../lib/permissions";
import { addDays, daysBetween, eatDateKey } from "../lib/streakMath";
import { restoreDays, validateRestoreWindow } from "../lib/streakRestore";
import { fail, notFound } from "../lib/errors";

const COLLECT_PAGE = 200;
const RUN_PAGE = 25;
const MAX_WINDOW_DAYS = 14;

/**
 * Affected users = people whose streak was alive going into the window (activity
 * the day before it starts) but who are missing one or more window days.
 * Collection is paged through the scheduler so it scales; the candidate list is
 * frozen in incidentTargets so the run is deterministic and resumable.
 */
export const create = staffMutation({
  permission: "streaks.restore_bulk",
  requireReason: true,
  args: {
    title: v.string(),
    description: v.string(),
    windowStart: v.string(),
    windowEnd: v.string(),
    reason: v.string(),
    overrideLookback: v.optional(v.boolean()),
  },
  handler: async (ctx, args, { staff }, log) => {
    if (args.overrideLookback && staff.role !== "super_admin") {
      throw fail("FORBIDDEN", "Only a Super Admin can extend the look-back limit");
    }
    const today = eatDateKey(Date.now());
    const { from, to } = validateRestoreWindow(args.windowStart, args.windowEnd, today, args.overrideLookback === true);
    if (daysBetween(from, to) + 1 > MAX_WINDOW_DAYS) {
      throw fail("INVALID_ARGUMENT", `An incident window can span at most ${MAX_WINDOW_DAYS} days`);
    }
    const title = args.title.trim().slice(0, 120);
    if (!title) throw fail("INVALID_ARGUMENT", "Title is required");
    const now = Date.now();
    const id = await ctx.db.insert("incidents", {
      title,
      description: args.description.trim().slice(0, 2000),
      windowStart: from,
      windowEnd: to,
      status: "draft",
      createdBy: staff._id,
      overrideLookback: args.overrideLookback === true,
      candidatesReady: false,
      processedCount: 0,
      restoredCount: 0,
      skippedCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await log({
      action: "incident.create",
      targetType: "incident",
      targetId: id,
      targetLabel: title,
      incidentId: id,
      after: { windowStart: from, windowEnd: to },
    });
    await ctx.scheduler.runAfter(0, internal.admin.incidents.collectCandidates, { incidentId: id });
    return id;
  },
});

export const collectCandidates = internalMutation({
  args: { incidentId: v.id("incidents"), cursor: v.optional(v.string()) },
  handler: async (ctx, { incidentId, cursor }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident || incident.status !== "draft") return;
    const anchor = addDays(incident.windowStart, -1);
    const page = await ctx.db
      .query("activityLog")
      .withIndex("by_date_and_type", (q) => q.eq("date", anchor))
      .paginate({ numItems: COLLECT_PAGE, cursor: cursor ?? null });
    let added = 0;
    const seen = new Set<string>();
    for (const row of page.page) {
      if (seen.has(row.userId)) continue;
      seen.add(row.userId);
      const exists = await ctx.db
        .query("incidentTargets")
        .withIndex("by_incident_and_profile", (q) => q.eq("incidentId", incidentId).eq("profileId", row.userId))
        .first();
      if (exists) continue;
      const profile = await ctx.db.get(row.userId);
      if (!profile || profile.status === "deactivated") continue;
      const inWindow = await ctx.db
        .query("activityLog")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", row.userId).gte("date", incident.windowStart).lte("date", incident.windowEnd),
        )
        .take(200);
      const have = new Set(inWindow.map((r) => r.date));
      if (have.size >= daysBetween(incident.windowStart, incident.windowEnd) + 1) continue;
      await ctx.db.insert("incidentTargets", { incidentId, profileId: row.userId });
      added++;
    }
    const candidateCount = (incident.candidateCount ?? 0) + added;
    if (page.isDone) {
      await ctx.db.patch(incidentId, { candidateCount, candidatesReady: true, updatedAt: Date.now() });
    } else {
      await ctx.db.patch(incidentId, { candidateCount, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.admin.incidents.collectCandidates, {
        incidentId,
        cursor: page.continueCursor,
      });
    }
  },
});

export const list = staffQuery({
  permission: "streaks.read",
  args: {},
  handler: async (ctx) => await ctx.db.query("incidents").order("desc").take(50),
});

export const get = staffQuery({
  permission: "streaks.read",
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, { incidentId }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) throw notFound("Incident");
    return {
      ...incident,
      approvalThreshold: BULK_APPROVAL_THRESHOLD,
      needsApproval: (incident.candidateCount ?? 0) > BULK_APPROVAL_THRESHOLD && !incident.approvedBy,
    };
  },
});

export const targets = staffQuery({
  permission: "streaks.read",
  args: { incidentId: v.id("incidents"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("incidentTargets")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .paginate(args.paginationOpts);
    const withNames = await Promise.all(
      page.page.map(async (t) => {
        const p = await ctx.db.get(t.profileId);
        return { ...t, name: p?.name, email: p?.email };
      }),
    );
    return { ...page, page: withNames };
  },
});

export const approve = staffMutation({
  permission: "streaks.approve_bulk",
  requireReason: true,
  args: { incidentId: v.id("incidents"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw notFound("Incident");
    if (incident.status !== "draft" || !incident.candidatesReady) {
      throw fail("INVALID_STATE", "Wait for the impact preview to finish before approving");
    }
    if (incident.createdBy === staff._id) throw fail("INVALID_STATE", "A second person must approve this incident");
    await ctx.db.patch(incident._id, { status: "approved", approvedBy: staff._id, updatedAt: Date.now() });
    await log({
      action: "incident.approve",
      targetType: "incident",
      targetId: incident._id,
      targetLabel: incident.title,
      incidentId: incident._id,
      after: { candidateCount: incident.candidateCount },
    });
    return null;
  },
});

export const execute = staffMutation({
  permission: "streaks.restore_bulk",
  requireReason: true,
  args: { incidentId: v.id("incidents"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw notFound("Incident");
    if (!incident.candidatesReady) throw fail("INVALID_STATE", "Impact preview is still being calculated");
    if (incident.status !== "draft" && incident.status !== "approved") {
      throw fail("INVALID_STATE", `Incident is ${incident.status}`);
    }
    const count = incident.candidateCount ?? 0;
    if (count === 0) throw fail("NOTHING_TO_RESTORE", "No affected users were found");
    // Above the threshold, a Support Agent needs a second person's approval; a Super Admin is that approver.
    if (count > BULK_APPROVAL_THRESHOLD && !incident.approvedBy && staff.role !== "super_admin") {
      throw fail(
        "APPROVAL_REQUIRED",
        `Restoring more than ${BULK_APPROVAL_THRESHOLD} users needs Super Admin approval`,
      );
    }
    // The window may have aged out of the look-back cap since creation.
    validateRestoreWindow(
      incident.windowStart,
      incident.windowEnd,
      eatDateKey(Date.now()),
      incident.overrideLookback === true,
    );
    await ctx.db.patch(incident._id, {
      status: "running",
      executedBy: staff._id,
      executeReason: args.reason.trim(),
      updatedAt: Date.now(),
    });
    await log({
      action: "incident.execute",
      targetType: "incident",
      targetId: incident._id,
      targetLabel: incident.title,
      incidentId: incident._id,
      after: { candidateCount: count, approvedBy: incident.approvedBy ?? null },
    });
    await ctx.scheduler.runAfter(0, internal.admin.incidents.runBatch, { incidentId: incident._id });
    return null;
  },
});

export const runBatch = internalMutation({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, { incidentId }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident || incident.status !== "running" || !incident.executedBy) return;
    const executor = await ctx.db.get(incident.executedBy);
    if (!executor) return;
    const page = await ctx.db
      .query("incidentTargets")
      .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
      .paginate({ numItems: RUN_PAGE, cursor: incident.cursor ?? null });
    let restored = 0,
      skipped = 0;
    for (const target of page.page) {
      if (target.outcome !== undefined) continue; // resumable / idempotent
      const profile = await ctx.db.get(target.profileId);
      const existing = await ctx.db
        .query("activityLog")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", target.profileId).gte("date", incident.windowStart).lte("date", incident.windowEnd),
        )
        .take(200);
      const have = new Set(existing.map((r) => r.date));
      const missing: string[] = [];
      for (let d = incident.windowStart; d <= incident.windowEnd; d = addDays(d, 1)) if (!have.has(d)) missing.push(d);
      if (!profile || profile.status === "deactivated" || missing.length === 0) {
        await ctx.db.patch(target._id, {
          outcome: "skipped",
          note: !profile ? "profile missing" : missing.length === 0 ? "already covered" : "deactivated",
        });
        skipped++;
        continue;
      }
      const adjustmentId = await restoreDays(ctx, {
        profileId: profile._id,
        dates: missing,
        staffId: executor._id,
        reason: `${incident.title}: ${incident.executeReason ?? ""}`.trim(),
        incidentId,
      });
      await ctx.db.patch(target._id, { outcome: "restored", datesRestored: missing });
      await writeAudit(ctx, executor, {
        action: "streak.restore",
        targetType: "profile",
        targetId: profile._id,
        targetLabel: profile.email ?? profile.name,
        after: { datesRestored: missing, adjustmentId },
        reason: `${incident.title}: ${incident.executeReason ?? ""}`.trim(),
        incidentId,
      });
      restored++;
    }
    const patch = {
      processedCount: incident.processedCount + page.page.length,
      restoredCount: incident.restoredCount + restored,
      skippedCount: incident.skippedCount + skipped,
      cursor: page.continueCursor,
      updatedAt: Date.now(),
    };
    if (page.isDone) {
      await ctx.db.patch(incidentId, { ...patch, status: "completed" });
      await writeAudit(ctx, executor, {
        action: "incident.complete",
        targetType: "incident",
        targetId: incidentId,
        targetLabel: incident.title,
        incidentId,
        after: { restored: patch.restoredCount, skipped: patch.skippedCount },
      });
    } else {
      await ctx.db.patch(incidentId, patch);
      await ctx.scheduler.runAfter(0, internal.admin.incidents.runBatch, { incidentId });
    }
  },
});

export const cancel = staffMutation({
  permission: "streaks.restore_bulk",
  requireReason: true,
  args: { incidentId: v.id("incidents"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw notFound("Incident");
    if (incident.status === "completed" || incident.status === "cancelled") {
      throw fail("INVALID_STATE", `Incident is already ${incident.status}`);
    }
    await ctx.db.patch(incident._id, { status: "cancelled", updatedAt: Date.now() });
    await log({
      action: "incident.cancel",
      targetType: "incident",
      targetId: incident._id,
      targetLabel: incident.title,
      incidentId: incident._id,
      before: { status: incident.status },
      after: { status: "cancelled", restoredSoFar: incident.restoredCount },
    });
    return null;
  },
});
