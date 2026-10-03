import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { buildSearchText, normalizePhone } from "../lib/profileSearch";
import { canonicalCounty } from "../lib/taxonomy";

const PAGE = 100;

/**
 * Backfills searchText / phoneNormalized (from the auth user's phone) and canonical
 * county names on existing profiles. Pages through the table via the scheduler and
 * is safe to re-run:  npx convex run admin/migrations:backfillProfiles
 */
export const backfillProfiles = internalMutation({
  args: { cursor: v.optional(v.string()), updated: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({ numItems: PAGE, cursor: args.cursor ?? null });
    let updated = args.updated ?? 0;
    for (const p of page.page) {
      let phoneNormalized = p.phoneNormalized;
      if (!phoneNormalized) {
        const userId = ctx.db.normalizeId("users", p.authSubject);
        const phone = userId ? (await ctx.db.get(userId))?.phone : undefined;
        try {
          phoneNormalized = phone ? normalizePhone(phone) : undefined;
        } catch {
          phoneNormalized = undefined;
        }
      }
      const county = p.county ? (canonicalCounty(p.county) ?? p.county) : p.county;
      const searchText = buildSearchText({ name: p.name, email: p.email, school: p.school, phoneNormalized });
      if (searchText !== p.searchText || county !== p.county || phoneNormalized !== p.phoneNormalized) {
        await ctx.db.patch(p._id, {
          searchText,
          ...(county !== undefined ? { county } : {}),
          ...(phoneNormalized ? { phoneNormalized, phone: p.phone ?? phoneNormalized } : {}),
        });
        updated++;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.admin.migrations.backfillProfiles, {
        cursor: page.continueCursor,
        updated,
      });
    }
    return { done: page.isDone, updated };
  },
});
