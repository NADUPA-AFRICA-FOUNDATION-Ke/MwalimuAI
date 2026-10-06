import { query } from "./_generated/server";
import { readAiSettings } from "./lib/settings";
import { MAX_MEMBERS } from "./schools";

/**
 * Numbers the public pages quote, read from the live system so they cannot drift from what the product does:
 * the real AI allowances (admin-adjustable), the school size limit, and how much learning content is published.
 */
export const facts = query({
  args: {},
  handler: async (ctx) => {
    const ai = await readAiSettings(ctx);
    const published = async (kind: "program" | "module" | "lesson") =>
      (await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", kind)).take(3000)).filter((i) => i.publishedVersionId !== undefined && i.archivedAt === undefined);
    let paths = 0;
    for (const p of await published("program")) {
      const d = (await ctx.db.get(p.publishedVersionId!))?.data as { available?: boolean; launchingSoon?: boolean } | undefined;
      if (d && d.available !== false && !d.launchingSoon) paths++;
    }
    return {
      aiPerDayFree: ai.dailyFree,
      aiPerDayPaid: ai.dailyPaid,
      schoolMaxTeachers: MAX_MEMBERS,
      // False when the platform is set to keep everything in-app (no email is sent to anyone).
      emailEnabled: process.env.EMAILS_DISABLED !== "true",
      paths,
      modules: (await published("module")).length,
      lessons: (await published("lesson")).length,
    };
  },
});
