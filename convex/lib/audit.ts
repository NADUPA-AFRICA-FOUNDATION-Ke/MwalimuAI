import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export const GENESIS_HASH = "0".repeat(64);

export type AuditEntry = {
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  incidentId?: Id<"incidents">;
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function auditHashInput(
  prevHash: string,
  row: Pick<
    Doc<"auditLog">,
    "actorStaffId" | "action" | "targetType" | "targetId" | "before" | "after" | "reason" | "createdAt"
  >,
) {
  return JSON.stringify(
    stable([
      prevHash,
      row.actorStaffId,
      row.action,
      row.targetType,
      row.targetId,
      row.before ?? null,
      row.after ?? null,
      row.reason ?? null,
      row.createdAt,
    ]),
  );
}

/**
 * The only writer of auditLog. Each row commits the hash of the previous row,
 * so editing or deleting history is detectable (see admin/audit.verifyChain).
 */
export async function writeAudit(ctx: MutationCtx, staff: Doc<"staff">, entry: AuditEntry) {
  const last = await ctx.db.query("auditLog").withIndex("by_created_at").order("desc").first();
  const prevHash = last?.hash ?? GENESIS_HASH;
  const createdAt = Date.now();
  const hash = await sha256Hex(
    auditHashInput(prevHash, {
      actorStaffId: staff._id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
      createdAt,
    }),
  );
  return await ctx.db.insert("auditLog", {
    actorStaffId: staff._id,
    actorEmail: staff.email,
    actorRole: staff.role,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ...(entry.targetLabel !== undefined ? { targetLabel: entry.targetLabel } : {}),
    ...(entry.before !== undefined ? { before: entry.before } : {}),
    ...(entry.after !== undefined ? { after: entry.after } : {}),
    ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
    ...(entry.incidentId !== undefined ? { incidentId: entry.incidentId } : {}),
    prevHash,
    hash,
    createdAt,
  });
}
