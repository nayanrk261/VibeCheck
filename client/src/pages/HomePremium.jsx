import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentSubmissions, submitAudit } from '../api/index';
import { ActionLink, Badge, BrandMark, Panel, ScorePill, StatusPill, ThemeToggle } from '../components/ui';

const TOP_NAV = ['Product', 'History', 'How it works', 'Security', 'Docs', 'Pricing'];

const DIMENSIONS = [
  {
    title: 'Security',
    description: 'Real vulnerabilities, exposed secrets, dependency risk, security headers, and unsafe routes.',
  },
  {
    title: 'Readiness',
    description: 'Signals that affect launch quality, reliability, and production confidence.',
  },
  {
    title: 'Legal',
    description: 'Privacy policy, terms, cookie notices, and compliance-adjacent signals.',
  },
  {
    title: 'Integrations',
    description: 'OAuth, payments, webhooks, analytics, and third-party connection health.',
  },
  {
    title: 'SEO',
    description: 'Metadata, robots, sitemap, and discoverability basics.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect',
    body: 'Provide your GitHub repository and live application URL so VibeCheck can gather evidence.',
  },
  {
    step: '02',
    title: 'Analyze',
    body: 'VibeCheck scans source code, dependencies, and live app signals with deterministic rules.',
  },
  {
    step: '03',
    title: 'Fix',
    body: 'Review concrete findings and recommended actions before shipping.',
  },
];

const SCORE_ROWS = [
  ['Security', '78', 'Needs attention'],
  ['Readiness', '85', 'Good'],
  ['Legal', '90', 'Great'],
  ['Integrations', '76', 'Needs attention'],
  ['SEO', '88', 'Great'],
];

const FINDINGS = [
  ['HIGH', 'Exposed .env file', 'Publicly accessible environment file detected.', '.env'],
  ['HIGH', 'Vulnerable dependency', 'express@4.17.1 has known vulnerabilities.', 'package.json'],
  ['MEDIUM', 'Missing security headers', 'Recommended browser security headers are missing.', 'Live URL'],
  ['MEDIUM', 'Debug route exposed', 'A debug route is reachable in production.', '/debug'],
  ['LOW', 'Missing rate limiting', 'API endpoints do not show throttling.', '/api/*'],
];

const PREVIEW_ISSUES = [
  { severity: 'HIGH', title: 'Exposed .env', surface: '.env', tone: 'danger' },
  { severity: 'HIGH', title: 'Vulnerable dependency', surface: 'package.json', tone: 'danger' },
  { severity: 'MEDIUM', title: 'Missing security headers', surface: 'Live URL', tone: 'attention' },
];

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function SectionLabel({ children }) {
  return <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">{children}</div>;
}

function HeroScoreRow({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'attention' ? 'text-amber-700' : tone === 'danger' ? 'text-rose-700' : 'text-zinc-700';
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-sm text-zinc-600">{label}</div>
      <div className={cx('text-sm font-medium', toneClass)}>{value}</div>
    </div>
  );
}

function PremiumPreview({ scanning, progress, sourceProgress, liveProgress, scanStage, repoUrl, liveUrl, findingsCount }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">VibeCheck</div>
          <div className="mt-1 text-sm font-medium text-zinc-900">Application dashboard preview</div>
        </div>
        <StatusPill tone="good">Live preview</StatusPill>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-zinc-200 p-5 lg:border-b-0 lg:border-r">
          <div className="text-sm font-medium text-zinc-500">my-app</div>
          <div className="mt-1 text-xs text-zinc-500">{liveUrl || 'https://my-app.com'}</div>
          <div className="mt-1 text-xs text-zinc-400">{repoUrl}</div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Overall</div>
              <div className="mt-2 text-5xl font-semibold tracking-tight text-zinc-950">82</div>
            </div>
            <div className="pb-2">
              <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Status</div>
              <div className="mt-2 text-sm font-medium text-emerald-700">Good</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-zinc-100">
            <div className="h-full w-[82%] rounded-full bg-emerald-600" />
          </div>
          <div className="mt-4 space-y-1">
            {SCORE_ROWS.map(([label, value, tone]) => (
              <HeroScoreRow key={label} label={label} value={value} tone={tone === 'Great' ? 'good' : tone === 'Needs attention' ? 'attention' : 'neutral'} />
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Scanned</div>
              <div className="mt-1 text-sm text-zinc-900">2 minutes ago</div>
            </div>
            <ScorePill value={82} status="scored" />
          </div>

          <div className="mt-5 border-t border-zinc-200 pt-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Issues requiring attention</div>
            <div className="mt-4 space-y-3">
              {PREVIEW_ISSUES.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <div className={cx('mt-0.5 h-2.5 w-2.5 rounded-full', item.tone === 'danger' ? 'bg-rose-500' : 'bg-amber-500')} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900">{item.title}</div>
                    <div className="mt-1 text-sm text-zinc-600">{item.surface}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/92 px-5 backdrop-blur-[2px]">
              <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Analyzing my-app</div>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
                      <span>Repository</span>
                      <span className="text-emerald-700">Connected</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(sourceProgress, 8)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
                      <span>Dependencies</span>
                      <span className="text-emerald-700">Analyzed</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(sourceProgress, 28)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
                      <span>Security</span>
                      <span className="text-amber-700">Checking</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(liveProgress, 18)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
                      <span>Production readiness</span>
                      <span className="text-zinc-500">Waiting</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-zinc-300" style={{ width: `${Math.max(liveProgress - 12, 8)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm text-zinc-600">
                  <span>{scanStage || 'Preparing audit'}</span>
                  <span>{progress}% complete</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">Real evidence</div>
            <div className="mt-1 text-sm text-zinc-700">Backed by source and live signals</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">Deterministic scoring</div>
            <div className="mt-1 text-sm text-zinc-700">Rules-based, not invented</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">No fabricated findings</div>
            <div className="mt-1 text-sm text-zinc-700">Honest when evidence is missing</div>
          </div>
        </div>
        <div className="mt-4 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          {findingsCount} findings in the preview report
        </div>
      </div>
    </div>
  );
}

function formatScanDate(dateValue) {
  if (!dateValue) return 'Unknown date';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function HomePremium() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const repoRef = useRef(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [readinessEnabled, setReadinessEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sourceProgress, setSourceProgress] = useState(0);
  const [liveProgress, setLiveProgress] = useState(0);
  const [scanStage, setScanStage] = useState('Preparing audit');
  const timerRef = useRef(null);

  const [recentScans, setRecentScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scansError, setScansError] = useState('');

  const fetchRecentScans = async () => {
    setScansLoading(true);
    setScansError('');
    try {
      const scans = await getRecentSubmissions(10);
      setRecentScans(Array.isArray(scans) ? scans : []);
    } catch (err) {
      console.error('Failed to load recent scans:', err);
      setScansError('Could not load recent scans. Please try again.');
    } finally {
      setScansLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentScans();
  }, []);

  const formattedRepo = repoUrl.trim() || 'username/repository';
  const formattedLive = liveUrl.trim() || 'your-app.com';

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => repoRef.current?.focus(), 160);
  };

  const runAudit = () => {
    if (!repoUrl && !liveUrl) {
      focusForm();
      return;
    }
    formRef.current?.requestSubmit();
  };

  const startProgress = () => {
    setIsScanning(true);
    setProgress(10);
    setSourceProgress(16);
    setLiveProgress(8);
    setScanStage('Connecting to repository');

    const stages = [
      ['Connecting to repository', 16, 8],
      ['Loading dependencies', 38, 20],
      ['Scanning security', 58, 44],
      ['Checking readiness', 72, 58],
      ['Preparing results', 92, 76],
    ];
    let index = 0;
    timerRef.current = window.setInterval(() => {
      const next = stages[Math.min(index, stages.length - 1)];
      setScanStage(next[0]);
      setSourceProgress(next[1]);
      setLiveProgress(next[2]);
      setProgress((current) => Math.min(99, current + 18));
      index += 1;
      if (index >= stages.length) {
        window.clearInterval(timerRef.current);
      }
    }, 450);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!repoUrl && !liveUrl) {
      setError('Enter a GitHub repository or live application URL.');
      return;
    }

    setError('');
    startProgress();

    const cleanRepo = repoUrl.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
    let cleanLive = liveUrl.trim();
    if (cleanLive && !cleanLive.startsWith('http')) cleanLive = `https://${cleanLive}`;

    try {
      const result = await submitAudit(cleanRepo ? `https://github.com/${cleanRepo}` : '', cleanLive || '', readinessEnabled ? 'production' : 'core');
      if (timerRef.current) window.clearInterval(timerRef.current);
      setProgress(100);
      setScanStage('Scan complete');
      window.setTimeout(() => {
        navigate(`/result/${result.submissionId || result._id}`);
      }, 450);
    } catch (submitError) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsScanning(false);
      setProgress(0);
      setSourceProgress(0);
      setLiveProgress(0);
      setScanStage('Preparing audit');
      setError(submitError.response?.data?.error || submitError.response?.data?.details?.[0] || 'Audit failed. Check the inputs and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-(--app-bg) text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-10">
            <BrandMark />
            <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
              {TOP_NAV.map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="transition-colors hover:text-zinc-900">
                  {item}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ActionLink href="/contact" variant="ghost">Sign in</ActionLink>
            <button type="button" onClick={focusForm} className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-500">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div>
              <SectionLabel>Security + Production Readiness</SectionLabel>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-zinc-950 md:text-7xl md:leading-[0.96]">
                Know what you're shipping.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
                VibeCheck audits your application for real security and production-readiness issues before you ship.
                No AI guesses. No fabricated scores. Only findings backed by evidence.
              </p>

              <Panel className="mt-8 overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <div className="border-b border-zinc-200 px-5 py-4">
                  <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Audit your application</div>
                  <div className="mt-1 text-sm text-zinc-600">Connect a repository and live URL to start a deterministic audit.</div>
                </div>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-5">
                  <label className="block">
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">GitHub Repository</div>
                    <div className="flex items-center rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 focus-within:border-zinc-400">
                      <span className="mr-3 text-sm text-zinc-500">github.com/</span>
                      <input
                        ref={repoRef}
                        value={repoUrl}
                        onChange={(event) => setRepoUrl(event.target.value)}
                        placeholder="username/repository"
                        disabled={isScanning}
                        className="w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">Live Application URL</div>
                    <div className="flex items-center rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 focus-within:border-zinc-400">
                      <span className="mr-3 text-sm text-zinc-500">https://</span>
                      <input
                        value={liveUrl}
                        onChange={(event) => setLiveUrl(event.target.value)}
                        placeholder="your-app.com"
                        disabled={isScanning}
                        className="w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60"
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => setReadinessEnabled((current) => !current)}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-zinc-300"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-950">Production Readiness</div>
                      <div className="mt-1 text-sm text-zinc-500">Separate readiness signals from security findings.</div>
                    </div>
                    <div className={cx('relative h-6 w-11 rounded-full border transition-colors', readinessEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300 bg-zinc-200')}>
                      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', readinessEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
                    </div>
                  </button>

                  {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button type="submit" disabled={isScanning} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-500 disabled:opacity-60">
                      Run Audit →
                    </button>
                    <button type="button" onClick={runAudit} className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950">
                      Run from current inputs
                    </button>
                  </div>

                  <div className="grid gap-3 pt-1 sm:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">Real evidence</div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">Deterministic scoring</div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">No fabricated findings</div>
                  </div>
                </form>
              </Panel>
            </div>

            <div>
              <PremiumPreview
                scanning={isScanning}
                progress={progress}
                sourceProgress={sourceProgress}
                liveProgress={liveProgress}
                scanStage={scanStage}
                repoUrl={formattedRepo}
                liveUrl={formattedLive}
                findingsCount={FINDINGS.length}
              />
            </div>
          </div>
        </section>

        <section id="history" className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionLabel>Audit History</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Recent Scans</h2>
              </div>
              {recentScans.length > 0 && (
                <StatusPill tone="info">{recentScans.length} {recentScans.length === 1 ? 'scan' : 'scans'} recorded</StatusPill>
              )}
            </div>

            {scansLoading ? (
              <div className="mt-6 flex items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-500">
                Loading recent scans...
              </div>
            ) : scansError ? (
              <div className="mt-6 flex items-center justify-between rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                <span>{scansError}</span>
                <button type="button" onClick={fetchRecentScans} className="text-xs font-medium underline hover:text-rose-900">
                  Try again
                </button>
              </div>
            ) : recentScans.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-xs">
                  <span className="text-lg">🔍</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-950">No scans yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                  Start your first deterministic security and readiness audit using the form above.
                </p>
                <button
                  type="button"
                  onClick={focusForm}
                  className="mt-5 inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                >
                  Start First Audit →
                </button>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                {recentScans.map((scan) => {
                  const overallScore = scan.scores?.overall;
                  const repoName = scan.repoUrl ? scan.repoUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '') : (scan.liveUrl || 'Audit Submission');
                  return (
                    <div
                      key={scan._id}
                      onClick={() => navigate(`/result/${scan._id}`)}
                      className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-zinc-950">{repoName}</span>
                          {scan.auditMode === 'production' && <Badge className="text-[9px]">Production</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>{formatScanDate(scan.createdAt)}</span>
                          <span>•</span>
                          <span>{scan.findingsCount || 0} {scan.findingsCount === 1 ? 'finding' : 'findings'}</span>
                          {scan.meta?.techStack?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{scan.meta.techStack.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <ScorePill value={overallScore} status={scan.auditStatus} />
                        <span className="font-medium text-sm text-zinc-400">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section id="product" className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:items-start">
              <div>
                <SectionLabel>One audit. Five dimensions.</SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">A single audit spans the five areas that matter before launch.</h2>
              </div>
              <div className="divide-y divide-zinc-200 border-y border-zinc-200">
                {DIMENSIONS.map((item) => (
                  <div key={item.title} className="grid gap-4 py-4 md:grid-cols-[160px_1fr] md:items-start">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{item.title}</div>
                    </div>
                    <div className="text-sm leading-6 text-zinc-600">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-zinc-200 bg-(--app-surface-muted)">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <SectionLabel>How it works</SectionLabel>
            <div className="mt-4 grid gap-8 lg:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.step} className="border-t border-zinc-200 pt-4">
                  <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">{step.step}</div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-zinc-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{step.body}</p>
                  <div className="mt-6 h-px bg-zinc-200" />
                  <div className="mt-3 text-sm text-zinc-500">{index === 0 ? 'Repository and app URL' : index === 1 ? 'Evidence extraction and rules' : 'Actionable report and remediation'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="border-t border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[0.42fr_0.58fr] lg:px-8">
            <div>
              <SectionLabel>Scores you can actually trust</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Every score is derived from detected evidence and predefined rules.</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                VibeCheck does not use AI to invent findings or fill missing information. If evidence is not sufficient, the product says so.
              </p>
              <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Not enough data</div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">VibeCheck could not gather enough evidence to score this category reliably.</p>
              </div>
            </div>
            <div className="grid gap-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <div className="border-b border-zinc-200 px-5 py-5">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Overall</div>
                <div className="mt-3 flex items-end gap-4">
                  <div className="text-6xl font-semibold tracking-tight text-zinc-950">82</div>
                  <div className="pb-2 text-sm font-medium text-emerald-700">OVERALL</div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-zinc-100">
                  <div className="h-full w-[82%] rounded-full bg-emerald-600" />
                </div>
              </div>
              <div className="divide-y divide-zinc-200 px-5">
                {SCORE_ROWS.map(([label, value, status]) => (
                  <div key={label} className="flex items-center justify-between py-3">
                    <div className="text-sm text-zinc-700">{label}</div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-zinc-950">{value}</div>
                      <div className={cx('text-[10px] font-medium uppercase tracking-[0.24em]', status === 'Great' ? 'text-emerald-700' : 'text-amber-700')}>{status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="docs" className="border-t border-zinc-200 bg-(--app-surface-muted)">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <SectionLabel>Findings</SectionLabel>
            <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              {FINDINGS.map((finding, index) => (
                <div key={finding[1]} className={cx('grid gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 md:grid-cols-[80px_1fr_1fr_160px_20px] md:items-start', index !== FINDINGS.length - 1 && 'border-b border-zinc-200')}>
                  <div className={cx('text-xs font-medium uppercase tracking-[0.24em]', finding[0] === 'HIGH' ? 'text-rose-700' : finding[0] === 'MEDIUM' ? 'text-amber-700' : 'text-zinc-500')}>{finding[0]}</div>
                  <div className="text-sm font-medium text-zinc-950">{finding[1]}</div>
                  <div className="text-sm leading-6 text-zinc-600">{finding[2]}</div>
                  <div className="font-mono text-sm text-zinc-500">{finding[3]}</div>
                  <div className="text-right text-zinc-400">→</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr] lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">Security auditing for modern applications.</p>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Product</div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div>Security</div>
              <div>Production Readiness</div>
              <div>Docs</div>
              <div>Pricing</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Company</div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div>Contact</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Legal</div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div>Privacy Policy</div>
              <div>Terms of Service</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
