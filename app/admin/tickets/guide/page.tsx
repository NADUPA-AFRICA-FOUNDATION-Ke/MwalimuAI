import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/admin/common'

const h2 = 'mt-10 text-xl font-semibold'
const p = 'mt-3 text-sm leading-relaxed text-muted-foreground'
const ul = 'mt-3 list-disc space-y-1.5 pl-6 text-sm text-muted-foreground'
const shot = 'mt-4 w-full max-w-3xl rounded-lg border shadow-sm'

/** The support team's handbook: statuses, response targets, escalation, saved replies and the alerts. */
export default function SupportGuidePage() {
  return (
    <article className="max-w-3xl">
      <Link href="/admin/tickets" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden="true" />All tickets</Link>
      <PageHeader title="Support guide for staff" description="How we handle tickets: what each status means, how fast we reply, when to escalate, and how to write a good reply." />

      <h2 className={h2}>Where tickets come from</h2>
      <ul className={ul}>
        <li><b>Learners</b> raise tickets from Dashboard → Support. They see your replies in the app and get a notification.</li>
        <li><b>Visitors</b> (no account, or locked out) write from the public Support or Contact page, or the Locked out? page. They read your reply on a private conversation page. Their email address is as typed and is <b>not verified</b>. No email is ever sent.</li>
      </ul>

      <h2 className={h2}>Noticing new activity</h2>
      <p className={p}>Every new ticket, reply and reopening raises an alert for the whole team:</p>
      <ul className={ul}>
        <li>The <b>bell</b> at the top of the console turns red, shakes and shows a count. Open it to see each alert and jump to the ticket.</li>
        <li>A <b>pop-up</b> appears for each new alert while you have the console open, with an Open button.</li>
        <li>The browser <b>tab title</b> shows the count, so you notice it from another tab.</li>
        <li>The <b>Tickets</b> menu item shows how many need work; the badge turns red when a first reply is overdue.</li>
      </ul>
      {/* eslint-disable-next-line @next/next/no-img-element -- static help screenshot */}
      <img src="/help/staff-queue.jpg" alt="The ticket queue with counts, filters and an overdue ticket at the top" className={shot} />

      <h2 className={h2}>Statuses</h2>
      <ul className={ul}>
        <li><b>Needs reply (open)</b>: new, or the user replied. It is your turn.</li>
        <li><b>In progress</b>: you are working on it but have nothing to say yet. Use it so others don’t pick it up.</li>
        <li><b>Waiting on user</b>: you asked the user something. Set automatically when you send a reply.</li>
        <li><b>Resolved</b>: answered. Use <b>Send and resolve</b>. A reply from the user reopens it.</li>
        <li><b>Closed</b>: finished and read-only. Resolved tickets close themselves after 7 days without a reply. Reopen one by changing its status.</li>
      </ul>
      <p className={p}>Every status change notifies the learner and needs a short reason, which goes into the audit log.</p>

      <h2 className={h2}>Priority and response targets</h2>
      <p className={p}>Targets are for the <b>first</b> reply, counted from when the ticket was opened. The queue shows when each is due, and puts overdue tickets at the top with a red edge.</p>
      <ul className={ul}>
        <li><b>Urgent: 4 hours.</b> Payments taken wrongly, a security worry, many people affected at once.</li>
        <li><b>High: 8 hours.</b> Someone cannot sign in or cannot use paid features. Visitors who write about their account start at High.</li>
        <li><b>Normal: 24 hours.</b> Most questions and problems. The default.</li>
        <li><b>Low: 3 days.</b> Suggestions and feedback.</li>
      </ul>

      <h2 className={h2}>Escalation</h2>
      <ul className={ul}>
        <li><b>Payments</b>: set Urgent, add an internal note with what you found, and tell a Super Admin. Do not promise refunds.</li>
        <li><b>Security</b> (someone else in the account, a suspicious sign-in): set Urgent, issue a temporary password from the user’s profile → Security, and tell a Super Admin.</li>
        <li><b>A bug affecting many people</b>: check Admin → Errors; tell the team; reply to each ticket once there is news.</li>
        <li><b>Content mistakes</b>: note the lesson and what is wrong, and pass it to a Content Manager.</li>
      </ul>

      <h2 className={h2}>Writing a good reply</h2>
      <ul className={ul}>
        <li>Use the person’s name, say what you did, and say what happens next.</li>
        <li>Keep it short and plain. One question at a time if you need more information.</li>
        <li>Never ask for a password. For locked-out accounts, issue a temporary password and give it in the reply.</li>
        <li>Use <b>internal notes</b> for anything the user should not see.</li>
        <li>Attach a screenshot or PDF if it explains better than words (3 files, 5 MB each).</li>
      </ul>
      {/* eslint-disable-next-line @next/next/no-img-element -- static help screenshot */}
      <img src="/help/staff-ticket.jpg" alt="A ticket with priority and status controls, the conversation, saved replies and the reply box" className={shot} />

      <h2 className={h2}>Saved replies</h2>
      <p className={p}>
        <Link href="/admin/tickets/saved-replies" className="text-primary underline underline-offset-4">Saved replies</Link> hold the answers we give most often. In a ticket, choose <b>Insert saved reply…</b>, then edit it so it fits the person. Good ones to keep: how to earn a certificate, how to cancel a plan, how offline lessons work, what to do when locked out.
      </p>

      <h2 className={h2}>Staff FAQ</h2>
      <ul className={ul}>
        <li><b>Can I delete a ticket?</b> No. Close it. Closed tickets are deleted automatically two years after their last activity.</li>
        <li><b>A visitor wants their conversation in their account.</b> Tell them to sign in and open their private link: it has an <b>Add to my account</b> button. Signing in with Google using the same address moves it automatically.</li>
        <li><b>The user sent the wrong file.</b> Ask them to attach the right one in a reply. Files cannot be removed from a sent message.</li>
        <li><b>Who sees internal notes?</b> Only staff.</li>
        <li><b>How do I see a ticket’s history of changes?</b> Admin → Audit log, filtered by the ticket number.</li>
      </ul>
    </article>
  )
}
