import { query } from "./_generated/server";
import { assembleProgram, type ProgramShape } from "./lib/contentRead";
import type { AssessmentData } from "./lib/contentValidation";

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

/** The published needs assessment, or null so the learner app uses its built-in copy. */
export const needsAssessment = query({
  args: {},
  handler: async (ctx) => {
    const item = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", "needs-assessment").eq("kind", "assessment").eq("key", "needs-assessment"))
      .first();
    if (!item || !item.publishedVersionId || item.archivedAt !== undefined) return null;
    const version = await ctx.db.get(item.publishedVersionId);
    return version ? (version.data as AssessmentData) : null;
  },
});
