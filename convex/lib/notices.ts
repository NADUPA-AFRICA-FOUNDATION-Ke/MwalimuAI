import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Queues an in-app notification for a learner. Called by staff actions so the learner sees what changed. */
export async function notify(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  notice: { title: string; body: string; link?: string },
) {
  await ctx.db.insert("notifications", {
    userId: profileId,
    type: "announcement",
    title: notice.title,
    message: notice.body,
    createdAt: Date.now(),
    ...(notice.link ? { link: notice.link } : {}),
  });
}

/** "12 Sep" style label for a YYYY-MM-DD key. */
function label(date: string) {
  const [, m, d] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

export function describeDates(dates: string[]) {
  const sorted = [...dates].sort();
  if (sorted.length === 1) return label(sorted[0]);
  if (sorted.length <= 3) return sorted.map(label).join(", ");
  return `${sorted.length} days (${label(sorted[0])} to ${label(sorted[sorted.length - 1])})`;
}
