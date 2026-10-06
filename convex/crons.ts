import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Times are UTC. Kenya (EAT) is UTC+3, so 15:00 UTC is 18:00 in Nairobi. Campaigns only run when
// EMAIL_NUDGES_ENABLED=true in the Convex environment.
crons.daily("streak nudges", { hourUTC: 15, minuteUTC: 0 }, internal.emails.streakNudges, {});
crons.weekly("weekly summaries", { dayOfWeek: "sunday", hourUTC: 14, minuteUTC: 0 }, internal.emails.weeklySummaries, {});
crons.daily("email log cleanup", { hourUTC: 2, minuteUTC: 30 }, internal.emails.cleanup, {});
crons.daily("audit log checkpoint", { hourUTC: 3, minuteUTC: 15 }, internal.auditWitness.check, {});
crons.weekly("audit log full re-check", { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 45 }, internal.auditWitness.check, { full: true });
crons.daily("retention sweep", { hourUTC: 1, minuteUTC: 30 }, internal.retention.sweep, {});
export default crons;
