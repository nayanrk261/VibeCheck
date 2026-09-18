import { ActionLink, Badge, BrandMark, Panel, SectionHeading, ThemeToggle } from '../components/ui';

function TrustPageShell({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ActionLink href="/" variant="ghost">Back to home</ActionLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
        <Panel className="p-6 md:p-8 lg:p-10">
          <Badge>{eyebrow}</Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">{description}</p>
          <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-700">{children}</div>
        </Panel>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <TrustPageShell
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      description="VibeCheck is designed to help users audit public apps without inventing findings or storing unnecessary data."
    >
      <section>
        <SectionHeading title="What we collect" description="We only need the data required to run and display an audit." />
        <ul className="mt-4 space-y-3">
          <li>GitHub repository URL and live application URL supplied for the audit.</li>
          <li>Submission metadata needed to display the report and history.</li>
          <li>Operational logs required to keep the service reliable and secure.</li>
        </ul>
      </section>
      <section>
        <SectionHeading title="How we use it" description="To run the scan, display findings, and improve service reliability." />
        <ul className="mt-4 space-y-3">
          <li>We analyze the submitted repo and live URL to generate deterministic findings.</li>
          <li>We do not use the report pipeline to fabricate scores or infer missing data.</li>
          <li>We keep the UI honest when data is insufficient for a category.</li>
        </ul>
      </section>
      <section>
        <SectionHeading title="Your controls" description="Public app audits should remain understandable and configurable." />
        <p className="mt-4">If you need a report removed or want to discuss data handling, use the Contact page.</p>
      </section>
    </TrustPageShell>
  );
}

export function TermsPage() {
  return (
    <TrustPageShell
      eyebrow="Terms of Service"
      title="Terms of Service"
      description="Simple terms for a product that exists to help developers make safer release decisions."
    >
      <section>
        <SectionHeading title="Use of the service" description="Use VibeCheck to review public apps and improve launch readiness." />
        <p className="mt-4">You are responsible for the data you submit and for reviewing findings before acting on them.</p>
      </section>
      <section>
        <SectionHeading title="Limitations" description="Automated checks are useful, but they do not replace a full security review or manual testing." />
        <p className="mt-4">Some checks are intentionally marked as not enough data or manual checklist items when the scanner cannot prove them reliably.</p>
      </section>
      <section>
        <SectionHeading title="Acceptable use" description="Do not use the product to test systems you do not own or have permission to assess." />
        <p className="mt-4">VibeCheck is built for legitimate application readiness and security review workflows.</p>
      </section>
    </TrustPageShell>
  );
}

export function ContactPage() {
  return (
    <TrustPageShell
      eyebrow="Contact"
      title="Contact VibeCheck"
      description="Reach out for product questions, report issues, or audit workflow feedback."
    >
      <section>
        <SectionHeading title="Support" description="Use this page when you need help with a scan result or product issue." />
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="font-medium text-zinc-900">Email</p>
          <p className="mt-2 text-zinc-600">hello@vibecheck.dev</p>
          <p className="mt-4 text-sm text-zinc-500">Replace this with your real support address before publishing.</p>
        </div>
      </section>
      <section>
        <SectionHeading title="What to include" description="Send enough context for the issue to be reproduced." />
        <ul className="mt-4 space-y-3">
          <li>Submission ID or report URL.</li>
          <li>What you expected the scanner to detect.</li>
          <li>Any relevant environment details or screenshots.</li>
        </ul>
      </section>
    </TrustPageShell>
  );
}
