import { ActionLink, Badge, BrandMark, Panel } from '../components/ui';

function TrustPageShell({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-[#050706] text-[#F5F7F6]">
      {/* Background radial glow & grid texture */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] pointer-events-none bg-ambient-glow z-0" />

      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[#050706]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-3">
            <ActionLink href="/" variant="secondary" className="text-xs">Back to Home</ActionLink>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
        <Panel className="p-8 md:p-10 lg:p-12">
          <Badge variant="green">{eyebrow}</Badge>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#F5F7F6] sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A3AAA7]">{description}</p>
          <div className="mt-8 space-y-8 text-xs sm:text-sm leading-relaxed text-[#A3AAA7] border-t border-[rgba(255,255,255,0.08)] pt-8">
            {children}
          </div>
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
      description="VibeCheck is built to help developers audit public applications transparently without storing unnecessary data."
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">What We Collect</h2>
        <p>We only collect data necessary to complete and render the audit report:</p>
        <ul className="list-disc list-inside space-y-1 text-[#A3AAA7] pl-2">
          <li>Submitted public GitHub repository URLs and optional live application URLs.</li>
          <li>Basic submission metadata (date, scan findings, scores).</li>
          <li>Operational logs for rate limiting and service stability.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">How We Use Data</h2>
        <ul className="list-disc list-inside space-y-1 text-[#A3AAA7] pl-2">
          <li>We execute deterministic scanner rules against repository files and public live HTTP headers.</li>
          <li>We do not fabricate findings, store private repository code, or sell audit data.</li>
          <li>When data is missing or incomplete, VibeCheck marks categories as "Not enough data".</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">User Rights & Controls</h2>
        <p>If you require assistance or report removal, please reach out via the Contact page.</p>
      </section>
    </TrustPageShell>
  );
}

export function TermsPage() {
  return (
    <TrustPageShell
      eyebrow="Terms of Service"
      title="Terms of Service"
      description="Clear, developer-first terms for using VibeCheck security audit tooling."
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">Acceptable Use</h2>
        <p>
          You agree to use VibeCheck only on public repositories and application endpoints that you own or have explicit authorization to assess.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">Service Scope & Limitations</h2>
        <p>
          VibeCheck provides automated evidence-backed security scanning and AI narrative summaries. Automated checks provide actionable guidance but do not constitute a full manual security audit or guarantee zero vulnerabilities.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">Disclaimer of Warranties</h2>
        <p>
          The service is provided "as is" without warranty of any kind. Developers are encouraged to verify finding evidence directly in their source code before deploying to production.
        </p>
      </section>
    </TrustPageShell>
  );
}

export function ContactPage() {
  return (
    <TrustPageShell
      eyebrow="Contact"
      title="Contact VibeCheck"
      description="Questions, feedback, or report support requests."
    >
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#F5F7F6]">Get in Touch</h2>
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070908] p-5 font-mono text-xs">
          <div className="text-[#35E59A] font-bold">Email</div>
          <div className="mt-1 text-[#F5F7F6]">hello@vibecheck.dev</div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[#F5F7F6]">What to Include</h2>
        <ul className="list-disc list-inside space-y-1 text-[#A3AAA7] pl-2">
          <li>Your submission ID or report URL.</li>
          <li>Repository link and expected vs actual findings.</li>
          <li>Any relevant logs or environment notes.</li>
        </ul>
      </section>
    </TrustPageShell>
  );
}
