import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { newSchoolCode } from "../schools";
import { fail, notFound } from "../lib/errors";

/** Schools, for support: who runs each one and how big it is. */
export const list = staffQuery({
  permission: "schools.manage",
  args: {},
  handler: async (ctx) => {
    const schools = await ctx.db.query("schools").order("desc").take(100);
    const out = [];
    for (const s of schools) {
      const members = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", s._id).eq("status", "active")).take(250);
      const head = await ctx.db.get(s.headId);
      out.push({ _id: s._id, name: s.name, county: s.county ?? null, members: members.length, headName: head?.name ?? "", headEmail: head?.email ?? "", archived: s.archivedAt !== undefined, createdAt: s.createdAt });
    }
    return out;
  },
});

/** Set a school up for a head teacher directly (pilots, invoices paid offline). The head must already have an account. */
export const create = staffMutation({
  permission: "schools.manage",
  requireReason: true,
  args: { name: v.string(), county: v.optional(v.string()), headEmail: v.string(), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const email = args.headEmail.trim().toLowerCase();
    const head = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).first();
    if (!head) throw fail("NOT_FOUND", "No learner account has that email. Ask them to sign up first.");
    if (await ctx.db.query("schoolMembers").withIndex("by_profile", (q) => q.eq("profileId", head._id).eq("status", "active")).first())
      throw fail("ALREADY_IN_SCHOOL", "That person is already in a school");
    const name = args.name.trim();
    if (name.length < 3 || name.length > 120) throw fail("INVALID_CONTENT", "School name must be 3–120 characters");
    const now = Date.now();
    const id = await ctx.db.insert("schools", { name, ...(args.county?.trim() ? { county: args.county.trim().slice(0, 60) } : {}), code: await newSchoolCode(ctx), headId: head._id, createdAt: now });
    await ctx.db.insert("schoolMembers", { schoolId: id, profileId: head._id, role: "head", status: "active", joinedAt: now });
    await log({ action: "school.create", targetType: "school", targetId: id, targetLabel: name, after: { head: email } });
    return id;
  },
});

export const archive = staffMutation({
  permission: "schools.manage",
  requireReason: true,
  args: { schoolId: v.id("schools"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const s = await ctx.db.get(args.schoolId);
    if (!s) throw notFound("School");
    if (s.archivedAt !== undefined) throw fail("NO_CHANGES", "Already archived");
    await ctx.db.patch(s._id, { archivedAt: Date.now() });
    await log({ action: "school.archive", targetType: "school", targetId: s._id, targetLabel: s.name });
    return null;
  },
});
