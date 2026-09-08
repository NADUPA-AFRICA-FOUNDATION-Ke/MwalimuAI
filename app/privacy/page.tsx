import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Mwalimu AI collects, uses, and protects educator information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: September 7, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Mwalimu AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use
              our platform.
            </p>
            <p className="text-muted-foreground">
              By using Mwalimu AI, you agree to the collection and use of information in accordance with
              this policy. If you do not agree with the terms of this privacy policy, please do not
              access the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3">Personal Information</h3>
            <p className="text-muted-foreground mb-4">When you register for an account, we collect:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Name and email address</li>
              <li>School name and county</li>
              <li>Teaching level and subjects</li>
              <li>Years of teaching experience</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Usage Data</h3>
            <p className="text-muted-foreground mb-4">We automatically collect:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Learning progress and module completion</li>
              <li>Quiz scores and assessment results</li>
              <li>AI Coach conversation history</li>
              <li>Forum posts and community interactions</li>
              <li>Device information and browser type</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide and maintain our platform</li>
              <li>Personalize your learning experience</li>
              <li>Track your progress and issue certificates</li>
              <li>Improve our AI Coach responses</li>
              <li>Send important updates and notifications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist our operations (under strict confidentiality)</li>
              <li>Aggregated, anonymized data for research and reporting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits</li>
              <li>Access controls and employee training</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as your account is active or as needed to
              provide services. Learning records may be retained longer for certification verification
              purposes. You can request account deletion at any time through your settings or by
              contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Mwalimu AI is designed for adult educators. We do not knowingly collect information from
              children under 18. If you believe a child has provided us with personal information,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you
              to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <p className="text-muted-foreground">
              Email: privacy@mwalimu.ai<br />
              Address: Westlands Business Park, Nairobi, Kenya
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
