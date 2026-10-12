import type { ReactNode } from "react";
import { motion } from "framer-motion";

function PolicyLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-fg-subtle">
          Last updated: {updated}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-fg-muted">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-fg">
        {title}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function PrivacyPolicy() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      updated="October 10, 2026"
    >
      <Section title="1. Overview">
        <p>
          BTech Buddy (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a
          question-paper library for engineering students. This
          policy explains what data we collect, why, and how it is
          protected. We keep student access anonymous: browsing,
          previewing and downloading papers requires no account and
          no personal information.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p>
          <strong>Public visitors:</strong> we store only
          anonymised download statistics (a hashed IP address and
          browser user-agent) to prevent abuse and measure
          popularity. No cookies are required to use the student
          site.
        </p>
        <p>
          <strong>Admin accounts:</strong> admins register with an
          email address and password, stored in Supabase Auth.
          Contact-form submissions store the name, email and
          message you provide so we can respond.
        </p>
      </Section>

      <Section title="3. How we use data">
        <p>
          Data is used to operate the service: serving papers,
          recording download counts, preventing automated abuse
          (rate limiting), and communicating with people who
          contact us. Download counts are displayed publicly in
          aggregate form only.
        </p>
      </Section>

      <Section title="4. Storage and security">
        <p>
          All data lives in Supabase (PostgreSQL) with row-level
          security enabled, and in private Supabase Storage
          buckets. Students never receive original files — only
          watermarked copies. Access to administrative functions
          requires server-side authorization and is audit-logged.
        </p>
      </Section>

      <Section title="5. Sharing">
        <p>
          We do not sell personal data. Files you upload as an
          admin are stored in your project&apos;s private storage
          and served only through the backend.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          You may request access to or deletion of your data
          (including contact-form submissions) by writing to
          hello@btechbuddy.in.
        </p>
      </Section>

      <Section title="7. Changes">
        <p>
          We may update this policy; the &ldquo;last
          updated&rdquo; date above will change. Continued use of
          the service constitutes acceptance of the updated
          policy.
        </p>
      </Section>
    </PolicyLayout>
  );
}

export function TermsOfService() {
  return (
    <PolicyLayout
      title="Terms of Service"
      updated="October 10, 2026"
    >
      <Section title="1. Service">
        <p>
          BTech Buddy provides a searchable library of
          previous-year question papers with browser preview and
          PDF download. The service is provided &ldquo;as
          is&rdquo; and may change or be interrupted without
          notice.
        </p>
      </Section>

      <Section title="2. Acceptable use">
        <p>
          You may use the service for personal, educational
          purposes. You may not: automate bulk downloading;
          redistribute files at scale; attempt to bypass
          rate-limits or watermarks; or use the service for
          unlawful activity.
        </p>
      </Section>

      <Section title="3. Uploads (admins)">
        <p>
          Admins may upload papers only for institutions, branches
          and subjects they are authorised to manage. Uploaded
          files must not contain malware, must be genuine
          question papers, and must not include answer keys marked
          confidential by the issuing institution unless permitted.
        </p>
      </Section>

      <Section title="4. Watermarking">
        <p>
          All student-facing PDFs are automatically stamped with a
          light &ldquo;BTech Buddy&rdquo; watermark. Removing or
          obscuring the watermark is prohibited.
        </p>
      </Section>

      <Section title="5. Availability">
        <p>
          We strive for high availability but do not guarantee
          uninterrupted service. Statistics shown on the site are
          computed from real database records at request time.
        </p>
      </Section>

      <Section title="6. Liability">
        <p>
          To the maximum extent permitted by law, BTech Buddy is
          not liable for indirect damages or for the accuracy of
          third-uploaded content. Papers are provided for
          reference; syllabi change — always confirm with your
          institution.
        </p>
      </Section>

      <Section title="7. Governing law">
        <p>
          These terms are governed by the laws of India. Questions
          may be sent to hello@btechbuddy.in.
        </p>
      </Section>
    </PolicyLayout>
  );
}

export function CopyrightPolicy() {
  return (
    <PolicyLayout
      title="Copyright & DMCA Policy"
      updated="October 10, 2026"
    >
      <Section title="1. Our approach">
        <p>
          BTech Buddy indexes and shares previous-year question
          papers for educational reference. We respect
          intellectual-property rights and comply with applicable
          law, including the Indian IT Act and, where relevant,
          the DMCA.
        </p>
      </Section>

      <Section title="2. Reporting infringement">
        <p>
          If you believe a file infringes your rights, send a
          written notice to hello@btechbuddy.in containing:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Identification of the copyrighted work</li>
          <li>The URL or exact paper title, institution, subject
            and year at issue</li>
          <li>Your contact information</li>
          <li>A statement of good-faith belief and accuracy</li>
        </ul>
      </Section>

      <Section title="3. Response">
        <p>
          Verified reports are actioned by admins, typically by
          unpublishing or deleting the paper, within 48 hours.
          Repeat infringement may result in account termination.
        </p>
      </Section>

      <Section title="4. Counter-notice">
        <p>
          If a paper was removed in error, submit a counter-notice
          with the same details and a statement under penalty of
          perjury that the material was removed by mistake.
        </p>
      </Section>
    </PolicyLayout>
  );
}
