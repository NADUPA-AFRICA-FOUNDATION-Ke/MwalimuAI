/**
 * Plain, light, mobile-friendly emails in English and Kiswahili. Pure functions: no database, no sending.
 * Every email says why the person got it and how to stop it.
 */
export type Lang = "en" | "sw";
export type EmailContext = { name: string; lang: Lang; siteUrl: string; unsubscribeUrl: string };
export type Rendered = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const first = (name: string) => (name.trim().split(/\s+/)[0] || "").slice(0, 40);

const T = {
  en: {
    hi: (n: string) => (n ? `Hello ${n},` : "Hello,"),
    why: { ticket_reply: "You are receiving this because you asked our team for help.", certificate: "You are receiving this because you earned a certificate.", streak: "You are receiving this because you have a learning streak.", weekly: "You are receiving your weekly summary." },
    stop: "Email preferences or unsubscribe",
    team: "The Mwalimu AI team",
  },
  sw: {
    hi: (n: string) => (n ? `Habari ${n},` : "Habari,"),
    why: { ticket_reply: "Umepokea barua pepe hii kwa sababu uliomba msaada kutoka kwa timu yetu.", certificate: "Umepokea barua pepe hii kwa sababu umepata cheti.", streak: "Umepokea barua pepe hii kwa sababu una mfululizo wa kujifunza.", weekly: "Hii ni muhtasari wako wa wiki." },
    stop: "Mapendeleo ya barua pepe au jiondoe",
    team: "Timu ya Mwalimu AI",
  },
} as const;

function layout(ctx: EmailContext, kind: keyof typeof T.en.why, title: string, paragraphs: string[], cta?: { label: string; url: string }): Rendered["html"] {
  const t = T[ctx.lang];
  return `<!doctype html><html lang="${ctx.lang}"><body style="margin:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#1c2a25">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 16px;font-weight:700;font-size:18px;color:#0e5c42">Mwalimu AI</p>
<div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #dfe8e3">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
<p style="margin:0 0 12px;line-height:1.5">${esc(t.hi(first(ctx.name)))}</p>
${paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${p}</p>`).join("\n")}
${cta ? `<p style="margin:20px 0"><a href="${esc(cta.url)}" style="background:#0e5c42;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:700">${esc(cta.label)}</a></p>` : ""}
<p style="margin:16px 0 0;color:#4a5a54">${esc(t.team)}</p>
</div>
<p style="font-size:12px;color:#5b6b64;line-height:1.5;margin:16px 4px">${esc(t.why[kind])} <a href="${esc(ctx.unsubscribeUrl)}" style="color:#0e5c42">${esc(t.stop)}</a>.</p>
</div></body></html>`;
}

const plain = (ctx: EmailContext, kind: keyof typeof T.en.why, lines: string[], cta?: { label: string; url: string }) =>
  [T[ctx.lang].hi(first(ctx.name)), "", ...lines, ...(cta ? ["", `${cta.label}: ${cta.url}`] : []), "", T[ctx.lang].team, "", `${T[ctx.lang].why[kind]} ${T[ctx.lang].stop}: ${ctx.unsubscribeUrl}`].join("\n");

export function ticketReplyEmail(ctx: EmailContext, d: { number: string; subject: string; excerpt: string; ticketId: string; resolved: boolean }): Rendered {
  const url = `${ctx.siteUrl}/dashboard/support/${d.ticketId}`;
  const en = ctx.lang === "en";
  const title = en ? (d.resolved ? `Your ticket ${d.number} was resolved` : `Support replied to ${d.number}`) : d.resolved ? `Tiketi yako ${d.number} imeshughulikiwa` : `Msaada umejibu ${d.number}`;
  const lines = [en ? `About: ${d.subject}` : `Kuhusu: ${d.subject}`, `“${d.excerpt}”`];
  const cta = { label: en ? "Read and reply" : "Soma na ujibu", url };
  return { subject: title, html: layout(ctx, "ticket_reply", title, lines.map(esc), cta), text: plain(ctx, "ticket_reply", lines, cta) };
}

export function certificateEmail(ctx: EmailContext, d: { programTitle: string; serial: string; programId: string }): Rendered {
  const en = ctx.lang === "en";
  const title = en ? `Congratulations: you earned a certificate` : `Hongera: umepata cheti`;
  const lines = [en ? `You completed “${d.programTitle}”.` : `Umekamilisha “${d.programTitle}”.`, en ? `Your certificate number is ${d.serial}. Anyone can check it is genuine on our website.` : `Nambari ya cheti chako ni ${d.serial}. Mtu yeyote anaweza kuthibitisha kuwa ni halisi kwenye tovuti yetu.`];
  const cta = { label: en ? "View and share your certificate" : "Tazama na ushiriki cheti chako", url: `${ctx.siteUrl}/dashboard/learning/${d.programId}/certificate` };
  return { subject: title, html: layout(ctx, "certificate", title, lines.map(esc), cta), text: plain(ctx, "certificate", lines, cta) };
}

export function streakEmail(ctx: EmailContext, d: { days: number }): Rendered {
  const en = ctx.lang === "en";
  const title = en ? `Keep your ${d.days}-day streak going tonight` : `Endeleza mfululizo wako wa siku ${d.days} leo usiku`;
  const lines = [en ? `You have learned ${d.days} days in a row. One short lesson today keeps it alive. It takes about ten minutes.` : `Umejifunza siku ${d.days} mfululizo. Somo moja fupi leo litauweka hai. Huchukua takriban dakika kumi.`];
  const cta = { label: en ? "Continue learning" : "Endelea kujifunza", url: `${ctx.siteUrl}/dashboard` };
  return { subject: title, html: layout(ctx, "streak", title, lines.map(esc), cta), text: plain(ctx, "streak", lines, cta) };
}

export function weeklyEmail(ctx: EmailContext, d: { activeDays: number; lessons: number; streak: number }): Rendered {
  const en = ctx.lang === "en";
  const title = en ? "Your week on Mwalimu AI" : "Wiki yako kwenye Mwalimu AI";
  const lines = en
    ? [`You were active on ${d.activeDays} day${d.activeDays === 1 ? "" : "s"} this week and finished ${d.lessons} lesson${d.lessons === 1 ? "" : "s"}.`, d.streak >= 2 ? `Your current streak is ${d.streak} days.` : "A short lesson tomorrow starts a new streak."]
    : [`Ulikuwa hai siku ${d.activeDays} wiki hii na ulimaliza masomo ${d.lessons}.`, d.streak >= 2 ? `Mfululizo wako sasa ni siku ${d.streak}.` : "Somo fupi kesho litaanza mfululizo mpya."];
  const cta = { label: en ? "Pick up where you left off" : "Endelea ulipoachia", url: `${ctx.siteUrl}/dashboard` };
  return { subject: title, html: layout(ctx, "weekly", title, lines.map(esc), cta), text: plain(ctx, "weekly", lines, cta) };
}
