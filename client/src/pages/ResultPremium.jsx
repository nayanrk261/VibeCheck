import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Activity,
  Layers,
  CheckSquare,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Zap
} from 'lucide-react';
import { getSubmission } from '../api/index';
import { ActionLink, Badge, BrandMark } from '../components/ui';
import { DEFAULT_CHECKLIST_ITEMS } from '../data/checklist';

const TABS = [
  { id: 'Overview', label: 'Overview', icon: Activity },
  { id: 'Security', label: 'Security', icon: ShieldCheck },
  { id: 'Readiness', label: 'Readiness', icon: Zap },
  { id: 'Findings', label: 'Findings', icon: Layers },
  { id: 'Checklist', label: 'Checklist', icon: CheckSquare },
];

function formatRepoLabel(repoUrl = '') {
  return repoUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '') || 'Repository';
}

function formatLiveLabel(liveUrl = '') {
  return liveUrl || 'No live URL provided';
}

function formatDate(dateValue) {
  if (!dateValue) return 'Unknown time';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function scoreLabel(value) {
  if (value == null) return 'NOT ENOUGH DATA';
  if (value >= 70) return 'HEALTHY';
  if (value >= 40) return 'NEEDS ATTENTION';
  return 'CRITICAL RISK';
}

function severityBadge(severity) {
  const value = (severity || 'INFO').toUpperCase();
  if (value === 'CRITICAL' || value === 'HIGH') {
    return 'border-[rgba(255,95,86,0.3)] bg-[rgba(255,95,86,0.1)] text-[#FF5F56]';
  }
  if (value === 'MEDIUM') {
    return 'border-[rgba(255,184,77,0.3)] bg-[rgba(255,184,77,0.1)] text-[#FFB84D]';
  }
  return 'border-[rgba(139,148,158,0.3)] bg-[rgba(139,148,158,0.1)] text-[#8B949E]';
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
  return finding.file || finding.path || finding.location || finding.url || finding.route || finding.endpoint || finding.target || 'General';
}

function statusLabel(status) {
  const value = (status || '').toLowerCase();
  if (value === 'passed' || value === 'good') return 'Passed';
  if (value === 'needs-attention') return 'Needs attention';
  return 'Not checked';
}

export default function ResultPremium() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
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
  
  const overallScore = data?.scores?.overall;
  const repositoryLabel = formatRepoLabel(data?.repoUrl);
  const liveLabel = formatLiveLabel(data?.liveUrl);
  const scannedLabel = formatDate(data?.createdAt);

  const securityCounts = useMemo(() => ({
    critical: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'CRITICAL').length,
    high: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'HIGH').length,
    medium: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'MEDIUM').length,
    low: securityFindings.filter((item) => (item.severity || '').toUpperCase() === 'LOW').length,
  }), [securityFindings]);

  const activeFinding = useMemo(() => {
    if (!findings.length) return null;
    return findings.find((item) => findingTarget(item) === activeFindingId) || findings[0];
  }, [findings, activeFindingId]);

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
      const sorted = [...findings].sort((a, b) => sortSeverity(b.severity) - sortSeverity(a.severity));
      if (sorted[0]) setActiveFindingId(findingTarget(sorted[0]));
    }
  }, [findings, activeFindingId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleReviewedToggle = () => {
    if (!activeFinding) return;
    const target = findingTarget(activeFinding);
    const next = new Set(reviewedItems);
    if (next.has(target)) next.delete(target);
    else next.add(target);
    
    const values = Array.from(next);
    localStorage.setItem(`vibecheck-reviewed:${id}`, JSON.stringify(values));
    setReviewedItems(next);
    setToast(next.has(target) ? 'Marked finding as reviewed' : 'Unmarked finding');
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
      <div className="min-h-screen bg-[#050706] text-[#F5F7F6]">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
            <BrandMark compact />
            <div className="h-8 w-24 rounded-xl bg-[#111514] animate-pulse" />
          </div>
          <div className="mt-8 space-y-6">
            <div className="h-40 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] animate-pulse" />
            <div className="h-80 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050706] text-[#F5F7F6] flex items-center justify-center p-5">
        <div className="max-w-md rounded-2xl border border-[rgba(255,95,86,0.3)] bg-[#0D1110] p-8 text-center shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-[#FF5F56] mx-auto" />
          <h1 className="mt-4 text-xl font-bold text-[#F5F7F6]">{error}</h1>
          <p className="mt-2 text-xs text-[#A3AAA7]">The report could not be loaded. Please verify the link or try again.</p>
          <div className="mt-6 flex justify-center gap-3">
            <ActionLink href="/" variant="primary">New Audit</ActionLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050706] text-[#F5F7F6]">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[#050706]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#111514] px-3 py-1.5 text-xs font-medium text-[#F5F7F6] hover:bg-[#151918]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              New Audit
            </button>
            <BrandMark />
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#A3AAA7]">
            <span className="text-[#F5F7F6] font-semibold">{repositoryLabel}</span>
            <span className="text-[#68716D]">/</span>
            <span>{liveLabel}</span>
            <span className="text-[#68716D]">/</span>
            <span>Audited {scannedLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <ActionLink href="/" variant="primary" className="text-xs py-1.5 px-3">
              Re-scan
            </ActionLink>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 space-y-8">
        {/* HEADER PANEL */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <Badge variant="green">VibeCheck Security Audit</Badge>
                {data?.auditMode === 'production' && <Badge variant="default">Production Mode</Badge>}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#F5F7F6] font-mono">
                {repositoryLabel}
              </h1>
              {data?.liveUrl && (
                <a
                  href={data.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-[#35E59A] hover:underline"
                >
                  {data.liveUrl} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                {securityCounts.critical > 0 && (
                  <span className="rounded-md border border-[rgba(255,95,86,0.3)] bg-[rgba(255,95,86,0.1)] px-2 py-0.5 text-[#FF5F56]">
                    Critical: {securityCounts.critical}
                  </span>
                )}
                {securityCounts.high > 0 && (
                  <span className="rounded-md border border-[rgba(255,95,86,0.25)] bg-[rgba(255,95,86,0.08)] px-2 py-0.5 text-[#FF5F56]">
                    High: {securityCounts.high}
                  </span>
                )}
                {securityCounts.medium > 0 && (
                  <span className="rounded-md border border-[rgba(255,184,77,0.3)] bg-[rgba(255,184,77,0.1)] px-2 py-0.5 text-[#FFB84D]">
                    Medium: {securityCounts.medium}
                  </span>
                )}
                {securityCounts.low > 0 && (
                  <span className="rounded-md border border-[rgba(139,148,158,0.3)] bg-[rgba(139,148,158,0.1)] px-2 py-0.5 text-[#8B949E]">
                    Low: {securityCounts.low}
                  </span>
                )}
              </div>
            </div>

            {/* Score Highlight Box */}
            <div className="flex items-center gap-6 rounded-xl border border-[rgba(53,229,154,0.25)] bg-[rgba(53,229,154,0.05)] p-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A3AAA7]">Security Score</div>
                <div className="mt-1 text-5xl font-extrabold font-mono text-[#35E59A]">
                  {overallScore == null ? '—' : overallScore}
                </div>
              </div>
              <div className="border-l border-[rgba(255,255,255,0.08)] pl-6 text-xs space-y-1">
                <div className="font-bold text-[#35E59A]">{scoreLabel(overallScore)}</div>
                <div className="text-[#A3AAA7]">{findings.length} findings total</div>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)] gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#35E59A] text-[#35E59A] bg-[rgba(53,229,154,0.04)]'
                    : 'border-transparent text-[#A3AAA7] hover:text-[#F5F7F6] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'Findings' && (
                  <span className="rounded-full bg-[#151918] px-2 py-0.5 text-xs font-mono text-[#F5F7F6]">
                    {findings.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'Overview' && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Executive Summary & Scores (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Executive Summary Card */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6">
                <h2 className="text-base font-bold text-[#F5F7F6] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#35E59A]" />
                  Executive Summary
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#A3AAA7]">
                  {data?.summary || data?.executiveSummary || 'VibeCheck performed deterministic analysis on the repository files and dependencies. Review line-level evidence in the Findings tab.'}
                </p>
              </div>

              {/* Sub-scores Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['Security', data?.scores?.security?.value, data?.scores?.security?.status],
                  ['Readiness', data?.scores?.readiness?.value, data?.scores?.readiness?.status],
                  ['Legal', data?.scores?.legal?.value, data?.scores?.legal?.status],
                  ['Integrations', data?.scores?.integrations?.value, data?.scores?.integrations?.status],
                  ['SEO', data?.scores?.seo?.value, data?.scores?.seo?.status],
                ].map(([label, val, st]) => (
                  <div key={label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#A3AAA7]">{label}</span>
                      <span className="text-sm font-bold font-mono text-[#F5F7F6]">
                        {val == null ? 'Not enough data' : `${val}/100`}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-[#68716D] uppercase">
                      {statusLabel(st)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata & Quick Stats Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#68716D]">Repository Metadata</h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-2">
                    <span className="text-[#A3AAA7]">Tech Stack</span>
                    <span className="text-[#F5F7F6]">{data?.meta?.techStack?.join(', ') || 'Node.js, React'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-2">
                    <span className="text-[#A3AAA7]">Files Scanned</span>
                    <span className="text-[#F5F7F6]">{data?.meta?.filesScanned || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-2">
                    <span className="text-[#A3AAA7]">Secrets Found</span>
                    <span className="text-[#FF5F56] font-bold">{data?.meta?.secretsFound ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(255,255,255,0.06)] pb-2">
                    <span className="text-[#A3AAA7]">Response Time</span>
                    <span className="text-[#F5F7F6]">{data?.meta?.responseTime ? `${data.meta.responseTime}ms` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A3AAA7]">HTTPS Live</span>
                    <span className={data?.meta?.isHttps ? 'text-[#35E59A]' : 'text-[#A3AAA7]'}>
                      {data?.meta?.isHttps ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 & 4: SECURITY & FINDINGS */}
        {(activeTab === 'Security' || activeTab === 'Findings') && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Findings Table (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] overflow-hidden">
              <div className="border-b border-[rgba(255,255,255,0.08)] p-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A3AAA7]">Detected Findings</span>
                <span className="text-xs font-mono text-[#68716D]">{findings.length} Total</span>
              </div>

              {findings.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#A3AAA7]">
                  No findings detected for this repository.
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                  {findings
                    .slice()
                    .sort((a, b) => sortSeverity(b.severity) - sortSeverity(a.severity))
                    .map((item) => {
                      const target = findingTarget(item);
                      const isSelected = target === activeFindingId;
                      const isReviewed = reviewedItems.has(target);
                      return (
                        <div
                          key={`${item.title}-${target}`}
                          onClick={() => setActiveFindingId(target)}
                          className={`p-4 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#151918]' : 'hover:bg-[#111514]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono ${severityBadge(item.severity)}`}>
                                {(item.severity || 'INFO').toUpperCase()}
                              </span>
                              <h3 className="text-sm font-bold text-[#F5F7F6]">{item.title}</h3>
                            </div>
                            {isReviewed && (
                              <span className="text-[10px] font-mono text-[#35E59A] flex items-center gap-1">
                                <Check className="w-3 h-3" /> Reviewed
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-[#A3AAA7] line-clamp-2">{item.description}</p>
                          <div className="mt-2 text-[11px] font-mono text-[#68716D]">
                            Location: {target} {item.line ? `(Line ${item.line})` : ''}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Evidence Inspector Side Panel (5 cols) */}
            <div className="lg:col-span-5">
              <div className="sticky top-20 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6 space-y-4">
                <div className="border-b border-[rgba(255,255,255,0.08)] pb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#35E59A]">Evidence Inspector</span>
                  {activeFinding && (
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono ${severityBadge(activeFinding.severity)}`}>
                      {(activeFinding.severity || 'INFO').toUpperCase()}
                    </span>
                  )}
                </div>

                {activeFinding ? (
                  <div className="space-y-4 text-xs font-mono">
                    <div>
                      <div className="text-[#A3AAA7] font-sans font-semibold text-sm text-[#F5F7F6]">{activeFinding.title}</div>
                      <div className="mt-1 text-[#68716D] font-sans">{activeFinding.description}</div>
                    </div>

                    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070908] p-3 space-y-1.5">
                      <div><span className="text-[#68716D]">File:</span> <span className="text-[#35E59A]">{findingTarget(activeFinding)}</span></div>
                      {activeFinding.line && <div><span className="text-[#68716D]">Line:</span> <span className="text-[#F5F7F6]">{activeFinding.line}</span></div>}
                      {activeFinding.column && <div><span className="text-[#68716D]">Column:</span> <span className="text-[#F5F7F6]">{activeFinding.column}</span></div>}
                      <div><span className="text-[#68716D]">Confidence:</span> <span className="text-[#FFB84D]">{activeFinding.confidence || 'HIGH'}</span></div>
                    </div>

                    {(activeFinding.snippet || activeFinding.code || activeFinding.evidence) && (
                      <div>
                        <div className="text-[#68716D] mb-1 font-sans font-semibold">Evidence Snippet:</div>
                        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050706] p-3 overflow-x-auto text-[#FFB84D]">
                          <pre>{activeFinding.snippet || activeFinding.code || activeFinding.evidence}</pre>
                        </div>
                      </div>
                    )}

                    {activeFinding.fix && (
                      <div className="rounded-xl border border-[rgba(53,229,154,0.2)] bg-[rgba(53,229,154,0.04)] p-3 font-sans">
                        <div className="font-semibold text-[#35E59A]">Recommended Action:</div>
                        <div className="mt-1 text-[#A3AAA7] text-xs">{activeFinding.fix}</div>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleReviewedToggle}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#35E59A] py-2.5 text-xs font-bold text-[#050706] transition-all hover:bg-[#20C987] cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {reviewedItems.has(findingTarget(activeFinding)) ? 'Reviewed ✓' : 'Mark Reviewed'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyValue(window.location.href, 'Report link copied')}
                        className="p-2.5 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#111514] text-[#F5F7F6] hover:bg-[#151918]"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#68716D]">
                    Select a finding to inspect evidence details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: READINESS */}
        {activeTab === 'Readiness' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6">
              <h2 className="text-base font-bold text-[#F5F7F6]">Production Readiness Signals</h2>
              <p className="mt-1 text-xs text-[#A3AAA7]">
                Production readiness does not alter security scores. Signals include SEO headers, legal disclosures, and third-party API availability.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {['Legal', 'Integrations', 'SEO'].map((cat) => {
                const catFindings = readinessFindings.filter((item) => item.category === cat);
                return (
                  <div key={cat} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#F5F7F6]">{cat} Readiness</h3>
                    {catFindings.length === 0 ? (
                      <p className="text-xs text-[#68716D]">No readiness issues detected for {cat}.</p>
                    ) : (
                      <div className="space-y-2">
                        {catFindings.map((item) => (
                          <div key={item.title} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111514] p-3 text-xs">
                            <div className="font-semibold text-[#F5F7F6]">{item.title}</div>
                            <div className="mt-1 text-[#A3AAA7]">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CHECKLIST */}
        {activeTab === 'Checklist' && (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#F5F7F6]">Manual Verification Checklist</h2>
              <p className="mt-1 text-xs text-[#A3AAA7]">
                Track manual testing steps that cannot be proven by automated source code parsing alone.
              </p>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {checklistItems.map((item) => {
                const currentStatus = checklistState[item.id] || 'not-checked';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChecklistToggle(item.id)}
                    className="flex w-full items-center justify-between py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F5F7F6]">{item.label}</div>
                      <div className="mt-0.5 text-xs text-[#A3AAA7]">{item.description}</div>
                    </div>
                    <div className="ml-4">
                      {currentStatus === 'passed' ? (
                        <span className="rounded-full border border-[rgba(53,229,154,0.3)] bg-[rgba(53,229,154,0.1)] px-3 py-1 text-xs font-bold text-[#35E59A]">
                          Passed ✓
                        </span>
                      ) : currentStatus === 'needs-attention' ? (
                        <span className="rounded-full border border-[rgba(255,184,77,0.3)] bg-[rgba(255,184,77,0.1)] px-3 py-1 text-xs font-bold text-[#FFB84D]">
                          Needs attention
                        </span>
                      ) : (
                        <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111514] px-3 py-1 text-xs font-medium text-[#68716D]">
                          Not checked
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-[rgba(53,229,154,0.3)] bg-[#0D1110] px-4 py-3 text-xs font-semibold text-[#35E59A] shadow-2xl animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
