import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

const short = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Tells the support team (in the admin console) that a learner or visitor wrote. */
export async function notifyStaff(ctx: MutationCtx, t: Doc<"tickets">, kind: "ticket_new" | "ticket_reply" | "ticket_reopened", who: string, text: string) {
  const title = kind === "ticket_new" ? `New ticket ${t.number} from ${who}` : kind === "ticket_reopened" ? `${who} reopened ${t.number}` : `${who} replied on ${t.number}`;
  await ctx.db.insert("staffNotices", { kind, title, body: `${t.subject}: ${short(text)}`, link: `/admin/tickets/${t._id}`, ticketId: t._id, createdAt: Date.now() });
}
