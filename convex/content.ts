import { query } from "./_generated/server";
import { assembleProgram, type ProgramShape } from "./lib/contentRead";

/**
 * Learner catalogue. `managedKeys` lists every program the CMS controls, so the app
 * knows to stop showing the static copy of a program that staff have since archived
 * or replaced. Archived programs are returned separately so learners who already
 * started them can keep going.
 */
export const publishedPrograms = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("cmsItems")
      .withIndex("by_kind_and_program", (q) => q.eq("kind", "program"))
      .take(200);
    const programs: ProgramShape[] = [],
      archivedPrograms: ProgramShape[] = [];
    for (const item of items) {
      if (!item.publishedVersionId) continue;
      const assembled = await assembleProgram(ctx, item, "published", item.archivedAt !== undefined);
      // "Launching soon" placeholders have no lessons yet but still belong in the catalogue.
      if (!assembled || (assembled.lessons === 0 && !assembled.launchingSoon)) continue;
      (item.archivedAt !== undefined ? archivedPrograms : programs).push(assembled);
    }
    return { programs, archivedPrograms, managedKeys: items.map((i) => i.key) };
  },
});
