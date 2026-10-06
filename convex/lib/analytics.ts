import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { STATIC_PROGRAMS as PROGRAMS } from "./staticCurriculum";
import { assembleProgram, type ProgramShape } from "./contentRead";

/**
 * Learning analytics are kept as small sharded counters that learner mutations bump as they happen.
 * Reading a dashboard is then a few hundred indexed reads, however many learners exist.
 *
 * Keys:
 *   p:{program}:enrolled | lessons | pre | preSum | post | postSum | assign | cert | certDays
 *   p:{program}:qa:{pre|post}:{questionIndex}:{answerIndex}     how many learners chose each option (item analysis)
 *   na:{questionId}:{answer} | na:_total                          needs-assessment answers (what teachers say they need)
 *   p:{program}:l:{moduleId/lessonId}      learners who completed that lesson
 *   d:{YYYY-MM-DD}:login | lesson | tool | journal | community | assessment   learners with that activity that day (EAT)
 *   ("login" is recorded on every visit, so d:*:login is the day's active learners)
 */
const SHARDS = 4;

export async function bump(ctx: MutationCtx, key: string, by = 1) {
  if (by === 0) return;
  const shard = Math.floor(Math.random() * SHARDS);
  const row = await ctx.db
    .query("analyticsCounters")
    .withIndex("by_key_and_shard", (q) => q.eq("key", key).eq("shard", shard))
    .unique();
  if (row) await ctx.db.patch(row._id, { value: row.value + by });
  else await ctx.db.insert("analyticsCounters", { key, shard, value: by });
}

export async function readCounters(ctx: QueryCtx, keys: string[]) {
  const out = new Map<string, number>();
  await Promise.all(
    keys.map(async (key) => {
      const rows = await ctx.db
        .query("analyticsCounters")
        .withIndex("by_key_and_shard", (q) => q.eq("key", key))
        .take(SHARDS);
      out.set(key, Math.max(0, rows.reduce((n, r) => n + r.value, 0)));
    }),
  );
  return out;
}

async function bumpAnswers(ctx: MutationCtx, prefix: string, answers: number[] | undefined) {
  for (const [i, a] of (answers ?? []).entries()) if (Number.isInteger(a) && a >= 0 && a <= 3) await bump(ctx, `${prefix}:${i}:${a}`);
}

/** Counts a learner's needs-assessment answers once, so staff can see what teachers say they need. */
export async function countNeedsAnswers(ctx: MutationCtx, responses: unknown) {
  if (!responses || typeof responses !== "object") return;
  let n = 0;
  for (const [qid, ans] of Object.entries(responses as Record<string, unknown>)) {
    if (++n > 40) break;
    const picks = Array.isArray(ans) ? ans : [ans];
    for (const a of picks.slice(0, 8)) {
      if (typeof a === "string" && a) await bump(ctx, `na:${qid.slice(0, 40)}:${a.slice(0, 100)}`);
      else if (typeof a === "number") await bump(ctx, `na:${qid.slice(0, 40)}:#${a}`);
    }
  }
  await bump(ctx, "na:_total");
}

type Progress = Pick<
  Doc<"learningProgress">,
  "completedLessons" | "preAssessment" | "postAssessment" | "assignment" | "certificateSerial" | "certificateEarnedAt" | "updatedAt"
>;

const pct = (a?: { score: number; total: number }) => (a && a.total > 0 ? Math.round((a.score / a.total) * 100) : 0);

/** Applies the difference between a learner's previous and new progress to the counters. */
export async function applyProgressDelta(
  ctx: MutationCtx,
  programId: string,
  prev: Progress | null,
  next: Progress,
  startedAt: number,
) {
  const k = (suffix: string) => `p:${programId}:${suffix}`;
  if (!prev) await bump(ctx, k("enrolled"));
  const before = new Set(prev?.completedLessons ?? []);
  const after = new Set(next.completedLessons);
  let added = 0;
  for (const lesson of after) {
    if (!before.has(lesson)) {
      await bump(ctx, k(`l:${lesson}`));
      added++;
    }
  }
  let removed = 0;
  for (const lesson of before) {
    if (!after.has(lesson)) {
      await bump(ctx, k(`l:${lesson}`), -1);
      removed++;
    }
  }
  await bump(ctx, k("lessons"), added - removed);
  if (next.preAssessment && !prev?.preAssessment) {
    await bump(ctx, k("pre"));
    await bump(ctx, k("preSum"), pct(next.preAssessment));
    await bumpAnswers(ctx, k("qa:pre"), next.preAssessment.answers);
  }
  if (next.postAssessment && !prev?.postAssessment) {
    await bump(ctx, k("post"));
    await bump(ctx, k("postSum"), pct(next.postAssessment));
    await bumpAnswers(ctx, k("qa:post"), next.postAssessment.answers);
  }
  if (next.assignment && !prev?.assignment) await bump(ctx, k("assign"));
  if (next.certificateSerial && !prev?.certificateSerial) {
    const earned = next.certificateEarnedAt ? Date.parse(next.certificateEarnedAt) : NaN;
    const finishedAt = Number.isNaN(earned) ? next.updatedAt : earned;
    await bump(ctx, k("cert"));
    await bump(ctx, k("certDays"), Math.max(0, Math.round((finishedAt - startedAt) / 86_400_000)));
  }
}

export type CatalogLesson = { key: string; title: string; module: string; active: boolean };
export type CatalogProgram = { id: string; title: string; lessons: CatalogLesson[] };

/** Every program the platform serves (CMS-managed ones win over the bundled curriculum), with its lessons. */
export async function programCatalog(ctx: QueryCtx): Promise<CatalogProgram[]> {
  const out = new Map<string, CatalogProgram>();
  for (const p of PROGRAMS) {
    if (p.modules.length === 0) continue;
    out.set(p.id, {
      id: p.id,
      title: p.title,
      lessons: p.modules.flatMap((m) => m.lessons.map((l) => ({ key: `${m.id}/${l.id}`, title: l.title, module: m.title, active: true }))),
    });
  }
  const items = await ctx.db
    .query("cmsItems")
    .withIndex("by_kind_and_program", (q) => q.eq("kind", "program"))
    .take(200);
  for (const item of items) {
    if (!item.publishedVersionId) continue;
    const all = await assembleProgram(ctx, item, "published", true);
    if (!all) continue;
    const active = await assembleProgram(ctx, item, "published", false);
    const activeKeys = new Set(active ? lessonKeys(active) : []);
    out.set(item.key, {
      id: item.key,
      title: all.title,
      lessons: all.modules.flatMap((m) =>
        m.lessons.map((l) => ({ key: `${m.id}/${l.id}`, title: l.title, module: m.title, active: activeKeys.has(`${m.id}/${l.id}`) })),
      ),
    });
  }
  return [...out.values()];
}

const lessonKeys = (p: ProgramShape) => p.modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`));
