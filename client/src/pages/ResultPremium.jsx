import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubmission } from '../api/index';
import { ActionLink, BrandMark, ThemeToggle } from '../components/ui';
import { DEFAULT_CHECKLIST_ITEMS } from '../data/checklist';

const SIDEBAR_SECTIONS = ['Overview', 'Security', 'Production Readiness', 'Findings', 'Manual Checklist'];

function formatRepoLabel(repoUrl = '') {
  return repoUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '') || 'No repo provided';
}

function formatLiveLabel(liveUrl = '') {
  return liveUrl || 'No live URL provided';
}

function formatDate(dateValue) {
  if (!dateValue) return 'Unknown time';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', minute: '2-digit', hour: 'numeric' }).format(date);
}

function scoreLabel(value) {
  if (value == null) return 'NOT ENOUGH DATA';
  if (value >= 70) return 'GOOD';
  if (value >= 40) return 'NEEDS ATTENTION';
  return 'HIGH RISK';
}

function severityTone(severity) {
  const value = (severity || '').toUpperCase();
  if (value === 'HIGH' || value === 'CRITICAL') return 'danger';
  if (value === 'MEDIUM') return 'attention';
  if (value === 'LOW') return 'good';
  return 'neutral';
}

function sortSeverity(severity) {
  const value = (severity || '').toUpperCase();
  if (value === 'CRITICAL') return 4;
  if (value === 'HIGH') return 3;
  if (value === 'MEDIUM') return 2;
  if (value === 'LOW') return 1;
  return 0;
}

function findingTarget(finding) {
  return finding.path || finding.location || finding.url || finding.route || finding.endpoint || finding.target || 'General';
}

function statusLabel(status) {
  const value = (status || '').toLowerCase();
  if (value === 'passed' || value === 'good') return 'Passed';
  if (value === 'needs-attention') return 'Needs attention';
  return 'Not checked';
}

function SidebarLink({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'}`}>
      <span>{label}</span>
      <span className="text-zinc-400">→</span>
    </button>
  );
}

function CompactStat({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'attention' ? 'text-amber-700' : tone === 'danger' ? 'text-rose-700' : 'text-zinc-700';
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-sm font-medium ${toneClass}`}>{value}</div>
    </div>
  );
}

function FindingsTableRow({ finding, active, onClick }) {
  const severity = (finding.severity || 'INFO').toUpperCase();
  const toneClass = severityTone(severity) === 'danger' ? 'text-rose-700' : severityTone(severity) === 'attention' ? 'text-amber-700' : severityTone(severity) === 'good' ? 'text-emerald-700' : 'text-zinc-500';

  return (
    <button type="button" onClick={onClick} className={`grid w-full gap-4 border-b border-zinc-200 px-4 py-4 text-left transition-colors hover:bg-zinc-50 md:grid-cols-[88px_1fr_180px_120px] md:items-start ${active ? 'bg-zinc-50' : 'bg-white'}`}>
      <div className={`text-[11px] font-medium uppercase tracking-[0.24em] ${toneClass}`}>{severity}</div>
      <div>
        <div className="text-sm font-semibold text-zinc-950">{finding.title}</div>
        <div className="mt-1 text-sm leading-6 text-zinc-600">{finding.description}</div>
      </div>
      <div className="font-mono text-sm text-zinc-500">{findingTarget(finding)}</div>
      <div className="text-right text-[11px] uppercase tracking-[0.24em] text-zinc-500">{finding.reviewed ? 'Reviewed' : 'Confirmed'}</div>
    </button>
  );
}

function InspectorField({ label, value }) {
  return (
    <div className="border-b border-zinc-200 py-3 last:border-b-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm leading-6 text-zinc-900">{value}</div>
    </div>
  );
}

function EmptyState({ title, copy }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="text-sm font-semibold text-zinc-950">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{copy}</div>
    </div>
  );
}

export default function ResultPremium() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('Overview');
  const [activeFindingId, setActiveFindingId] = useState('');
  const [reviewedItems, setReviewedItems] = useState(() => new Set());
  const [checklistState, setChecklistState] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getSubmission(id);
        setData(result);
      } catch {
        setError('Could not load this report.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const findings = useMemo(() => data?.findings || [], [data]);
  const securityFindings = useMemo(() => findings.filter((item) => item.track !== 'readiness'), [findings]);
  const readinessFindings = useMemo(() => findings.filter((item) => item.track === 'readiness'), [findings]);
  const checklistItems = useMemo(() => (data?.checklist?.length ? data.checklist : DEFAULT_CHECKLIST_ITEMS), [data]);
  const overall = data?.scores?.overall;
  const repositoryLabel = formatRepoLabel(data?.repoUrl);
  const liveLabel = formatLiveLabel(data?.liveUrl);
  const scannedLabel = formatDate(data?.createdAt);
  const activeFinding = findings.find((item) => findingTarget(item) === activeFindingId) || findings[0] || null;
  const securityCounts = useMemo(() => ({
    high: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'HIGH').length,
    medium: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'MEDIUM').length,
    low: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'LOW').length,
  }), [securityFindings]);

  useEffect(() => {
    if (!data) return;
    const storedChecklist = JSON.parse(localStorage.getItem(`vibecheck-checklist:${id}`) || '{}');
    const nextChecklist = {};
    for (const item of checklistItems) {
      nextChecklist[item.id] = storedChecklist[item.id] || 'not-checked';
    }
    setChecklistState(nextChecklist);
  }, [data, id, checklistItems]);

  useEffect(() => {
    const storedReviewed = JSON.parse(localStorage.getItem(`vibecheck-reviewed:${id}`) || '[]');
    setReviewedItems(new Set(storedReviewed));
  }, [id]);

  useEffect(() => {
    if (!findings.length) return;
    if (!activeFindingId || !findings.some((item) => findingTarget(item) === activeFindingId)) {
      setActiveFindingId(findingTarget([...findings].sort((a, b) => sortSeverity(b.severity) - sortSeverity(a.severity))[0]));
    }
  }, [findings, activeFindingId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const persistReviewed = (nextSet) => {
    const values = Array.from(nextSet);
    localStorage.setItem(`vibecheck-reviewed:${id}`, JSON.stringify(values));
    setReviewedItems(new Set(values));
    setToast('Marked as reviewed');
  };

  const handleReviewedToggle = () => {
    if (!activeFinding) return;
    const target = findingTarget(activeFinding);
    const next = new Set(reviewedItems);
    if (next.has(target)) next.delete(target);
    else next.add(target);
    persistReviewed(next);
  };

  const handleChecklistToggle = (itemId) => {
    setChecklistState((current) => {
      const currentValue = current[itemId] || 'not-checked';
      const nextValue = currentValue === 'not-checked' ? 'passed' : currentValue === 'passed' ? 'needs-attention' : 'not-checked';
      const nextState = { ...current, [itemId]: nextValue };
      localStorage.setItem(`vibecheck-checklist:${id}`, JSON.stringify(nextState));
      return nextState;
    });
  };

  const copyValue = async (value, message) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      setToast('Copy failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <BrandMark compact />
            <ThemeToggle />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-4">
              <div className="h-4 w-24 rounded-full bg-zinc-100" />
              <div className="mt-5 space-y-3">
                <div className="h-10 rounded-2xl bg-zinc-100" />
                <div className="h-10 rounded-2xl bg-zinc-100" />
                <div className="h-10 rounded-2xl bg-zinc-100" />
                <div className="h-10 rounded-2xl bg-zinc-100" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-28 rounded-[24px] border border-zinc-200 bg-white" />
              <div className="h-72 rounded-[24px] border border-zinc-200 bg-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center px-5">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Report unavailable</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{error}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">The report could not be loaded. Check the link and try again.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href="/" variant="primary">Back to audit</ActionLink>
              <ActionLink href="/contact" variant="ghost">Contact support</ActionLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="border-b border-zinc-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <BrandMark compact />
            <ThemeToggle />
          </div>

          <button type="button" onClick={() => navigate('/')} className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-emerald-500">
            + New Audit
          </button>

          <nav className="mt-4 flex-1 space-y-1">
            {SIDEBAR_SECTIONS.map((section) => (
              <SidebarLink key={section} label={section} active={activeSection === section} onClick={() => setActiveSection(section)} />
            ))}

            <div className="my-4 border-t border-zinc-200" />

            <SidebarLink label="Past Scans" active={false} onClick={() => copyValue(window.location.href, 'Report link copied')} />
            <SidebarLink label="Settings" active={false} onClick={() => navigate('/contact')} />
          </nav>

          <div className="space-y-2 border-t border-zinc-200 pt-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">Help</div>
            <div className="text-sm text-zinc-600">Security auditing for modern applications.</div>
            <div className="pt-2 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">Account</div>
            <div className="text-sm text-zinc-600">Signed in locally</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <div className="flex items-center gap-5">
              <BrandMark compact />
              <div className="hidden items-center gap-3 text-sm text-zinc-500 md:flex">
                <span className="font-medium text-zinc-900">{repositoryLabel}</span>
                <span className="text-zinc-300">/</span>
                <span>{liveLabel}</span>
                <span className="text-zinc-300">/</span>
                <span>Scanned {scannedLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ActionLink href="/" variant="primary">Re-scan</ActionLink>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
          {activeSection === 'Overview' && (
            <section className="grid gap-6 xl:grid-cols-[1fr_0.68fr]">
              <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Results overview</div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{repositoryLabel}</h1>
                    <div className="mt-2 text-sm text-zinc-500">{liveLabel}</div>
                    <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Scanned {scannedLabel}</div>
                  </div>
                  <ActionLink href="/" variant="primary">Re-scan</ActionLink>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Overall readiness</div>
                    <div className="mt-3 flex items-end gap-4">
                      <div className="text-7xl font-semibold tracking-tight text-zinc-950">{overall == null ? '—' : overall}</div>
                      <div className="pb-2 text-sm font-medium text-emerald-700">{scoreLabel(overall)}</div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-emerald-600" style={overall == null ? { width: '24%' } : { width: `${overall}%` }} />
                    </div>
                    <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
                      Security and production readiness are measured separately, so the score stays credible and explainable.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    {[
                      ['Security', data?.scores?.security?.value, data?.scores?.security?.status],
                      ['Readiness', data?.scores?.readiness?.value, data?.scores?.readiness?.status],
                      ['Legal', data?.scores?.legal?.value, data?.scores?.legal?.status],
                      ['Integrations', data?.scores?.integrations?.value, data?.scores?.integrations?.status],
                      ['SEO', data?.scores?.seo?.value, data?.scores?.seo?.status],
                    ].map(([label, value, status]) => (
                      <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-zinc-900">{label}</div>
                          <div className="text-sm font-medium text-zinc-950">{value == null ? 'Not enough data' : value}</div>
                        </div>
                        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">{statusLabel(status)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Totals</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <CompactStat label="Findings" value={findings.length} />
                  <CompactStat label="High" value={securityCounts.high} tone="danger" />
                  <CompactStat label="Medium" value={securityCounts.medium} tone="attention" />
                </div>
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Trust model</div>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-600">
                    <p>Scores are derived from detected evidence and predefined rules.</p>
                    <p>When evidence is insufficient, VibeCheck shows Not enough data instead of guessing.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'Security' && (
            <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="border-b border-zinc-200 px-5 py-5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Security</div>
                  <div className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">{data?.scores?.security?.value == null ? 'Not enough data' : `${data.scores.security.value} / 100`}</div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">{securityCounts.high} High</span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">{securityCounts.medium} Medium</span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">{securityCounts.low} Low</span>
                  </div>
                </div>

                <div className="grid grid-cols-[88px_1fr_180px_120px] gap-4 border-b border-zinc-200 px-5 py-3 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                  <div>Severity</div>
                  <div>Finding</div>
                  <div>Affected surface</div>
                  <div className="text-right">Status</div>
                </div>

                <div>
                  {securityFindings.length > 0 ? (
                    [...securityFindings]
                      .sort((left, right) => sortSeverity(right.severity) - sortSeverity(left.severity))
                      .map((finding) => (
                        <FindingsTableRow
                          key={`${finding.title}-${findingTarget(finding)}`}
                          finding={finding}
                          active={findingTarget(finding) === activeFindingId}
                          onClick={() => setActiveFindingId(findingTarget(finding))}
                        />
                      ))
                  ) : (
                    <div className="p-5">
                      <EmptyState title="NOT ENOUGH DATA" copy="VibeCheck could not gather enough evidence to score this category reliably." />
                    </div>
                  )}
                </div>
              </div>

              <aside className="rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)] xl:sticky xl:top-4 xl:h-fit">
                {activeFinding ? (
                  <div className="p-5">
                    <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Finding detail</div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{activeFinding.title}</h2>
                    <div className={`mt-3 text-[10px] font-medium uppercase tracking-[0.24em] ${severityTone(activeFinding.severity) === 'danger' ? 'text-rose-700' : severityTone(activeFinding.severity) === 'attention' ? 'text-amber-700' : 'text-zinc-500'}`}>
                      {(activeFinding.severity || 'INFO').toUpperCase()}
                    </div>
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Description</div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{activeFinding.description || 'This issue was detected from the current audit evidence and may expose users or private configuration.'}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <InspectorField label="Evidence" value={activeFinding.evidenceUrl || activeFinding.url || activeFinding.path || findingTarget(activeFinding)} />
                      <InspectorField label="Affected surface" value={findingTarget(activeFinding)} />
                      <InspectorField label="Status" value={reviewedItems.has(findingTarget(activeFinding)) ? 'Reviewed' : 'Confirmed'} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Recommendation</div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{activeFinding.fix || 'Remove the issue from the public deployment and rotate any exposed credentials.'}</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={handleReviewedToggle} className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500">
                        Mark as reviewed
                      </button>
                      <button type="button" onClick={() => copyValue(window.location.href, 'Finding link copied')} className="rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950">
                        Copy link
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState title="NOT ENOUGH DATA" copy="VibeCheck could not gather enough evidence to score this category reliably." />
                  </div>
                )}
              </aside>
            </section>
          )}

          {activeSection === 'Production Readiness' && (
            <section className="space-y-6">
              <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Production readiness</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">{data?.scores?.readiness?.value == null ? 'Not enough data' : `${data.scores.readiness.value} / 100`}</div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">Production readiness does not affect the security score. It is measured and reported separately.</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {[
                  ['Legal', data?.scores?.legal?.value, readinessFindings.filter((item) => item.category === 'Legal')],
                  ['Integrations', data?.scores?.integrations?.value, readinessFindings.filter((item) => item.category === 'Integrations')],
                  ['SEO', data?.scores?.seo?.value, readinessFindings.filter((item) => item.category === 'SEO')],
                ].map(([label, value, items]) => (
                  <div key={label} className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                    <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">{label}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{value == null ? 'Not enough data' : value}</div>
                    <div className="mt-4 space-y-3">
                      {items.length > 0 ? items.map((item) => (
                        <div key={`${item.title}-${findingTarget(item)}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                          <div className="text-sm font-medium text-zinc-900">{item.title}</div>
                          <div className="mt-1 text-sm text-zinc-600">{item.description}</div>
                        </div>
                      )) : <EmptyState title="NOT ENOUGH DATA" copy="VibeCheck could not gather enough evidence to score this category reliably." />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'Findings' && (
            <section className="rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <div className="border-b border-zinc-200 px-5 py-5">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Findings</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Premium finding rows</div>
              </div>
              <div>
                {findings.length > 0 ? (
                  [...findings]
                    .sort((left, right) => sortSeverity(right.severity) - sortSeverity(left.severity))
                    .map((finding) => (
                      <FindingsTableRow
                        key={`${finding.title}-${findingTarget(finding)}`}
                        finding={finding}
                        active={findingTarget(finding) === activeFindingId}
                        onClick={() => setActiveFindingId(findingTarget(finding))}
                      />
                    ))
                ) : (
                  <div className="p-5">
                    <EmptyState title="NOT ENOUGH DATA" copy="VibeCheck could not gather enough evidence to score this category reliably." />
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === 'Manual Checklist' && (
            <section className="rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <div className="border-b border-zinc-200 px-5 py-5">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Manual checklist</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Not checked, passed, and needs attention stay explicit.</div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">Some application behavior cannot be reliably verified automatically.</p>
              </div>
              <div className="divide-y divide-zinc-200">
                {checklistItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => handleChecklistToggle(item.id)} className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-zinc-50">
                    <div>
                      <div className="text-sm font-medium text-zinc-950">{item.label}</div>
                      <div className="mt-1 text-sm text-zinc-600">{item.description}</div>
                    </div>
                    <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                      {statusLabel(checklistState[item.id])}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {toast && <div className="fixed bottom-6 right-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">{toast}</div>}
      </main>
    </div>
  );
}
