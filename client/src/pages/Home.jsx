import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitAudit } from '../api/index';

const SCAN_STEPS = [
  { label: 'Connecting to GitHub API...', pct: 8, cls: 'text-zinc-500', text: '> connecting to github api...' },
  { label: 'Fetching repository tree...', pct: 18, cls: 'text-blue-400', text: '> fetching repo tree...' },
  { label: 'Filtering code files...', pct: 26, cls: 'text-zinc-500', text: '> filtering .js .ts .jsx .json .env files' },
  { label: 'Scanning for secrets...', pct: 36, cls: 'text-yellow-400', text: '> scanning files for hardcoded secrets...' },
  { label: 'Checking .env exposure...', pct: 44, cls: 'text-zinc-500', text: '> checking .gitignore and .env exposure...' },
  { label: 'Pinging live URL...', pct: 54, cls: 'text-zinc-500', text: '> pinging live app url...' },
  { label: 'Measuring response time...', pct: 62, cls: 'text-yellow-400', text: '> measuring response time...' },
  { label: 'Checking security headers...', pct: 72, cls: 'text-zinc-500', text: '> checking http security headers...' },
  { label: 'Sending to AI engine...', pct: 84, cls: 'text-blue-400', text: '> sending findings to ai engine...' },
  { label: 'Generating score...', pct: 94, cls: 'text-zinc-500', text: '> computing vibecheck score...' },
  { label: 'Report ready!', pct: 100, cls: 'text-green-400', text: '✓ audit complete — redirecting to report...' },
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!repoUrl && !liveUrl) {
        setError('Please enter at least a GitHub repo URL or a live app URL.');
        return;
    }

    setScanning(true);
    setError('');
    setLogs([]);
    setProgress(0);

    // Clean URLs
    let cleanRepo = repoUrl.trim()
        .replace('https://github.com/', '')
        .replace('http://github.com/', '')
        .replace('github.com/', '');

    let cleanLive = liveUrl.trim();
    if (cleanLive && !cleanLive.startsWith('http')) {
        cleanLive = 'https://' + cleanLive;
    }

    const finalRepo = cleanRepo ? `https://github.com/${cleanRepo}` : '';
    const finalLive = cleanLive || '';

    let i = 0;
    const interval = setInterval(() => {
        if (i < SCAN_STEPS.length - 1) {
            const step = SCAN_STEPS[i];
            setProgressLabel(step.label);
            setProgress(step.pct);
            setLogs(prev => [...prev, { text: step.text, cls: step.cls }]);
            i++;
        }
    }, 600);

    try {
        const result = await submitAudit(finalRepo, finalLive);
        clearInterval(interval);
        setProgress(100);
        setProgressLabel('Report ready!');
        setLogs(prev => [...prev, { text: '✓ audit complete — redirecting...', cls: 'text-green-400' }]);
        const id = result.submissionId || result._id;
        setTimeout(() => navigate(`/result/${id}`), 800);
    } catch (err) {
        clearInterval(interval);
        // Surface the backend's actual message when we have one (rate limit,
        // validation error, SSRF block, etc.) instead of a generic string
        // that hides what actually went wrong.
        // Show the specific reason first (e.g. "repoUrl must be a valid
        // github.com repository URL") — the generic "error" label alone
        // isn't actionable on its own.
        const backendMessage = err.response?.data?.details?.[0] || err.response?.data?.error;
        setError(backendMessage || 'Audit failed. Check your URLs and try again.');
        setScanning(false);
        setProgress(0);
        setLogs([]);
    }
};

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 flex flex-col">

      {/* Nav */}
      <nav className="w-full flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/5">
        <span className="text-3xl font-black tracking-tight">
          Vibe<span className="text-green-400">Check</span>
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-500 border border-white/10 rounded-full px-4 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          v1.0 beta
        </div>
      </nav>

      {/* HERO */}
      <section className="w-full px-6 md:px-16 pt-14 pb-10 border-b border-white/5 text-center">
        <div className="inline-block text-[11px] tracking-widest text-zinc-600 mb-5 font-sans border border-white/5 rounded-full px-4 py-1.5 bg-white/[0.02]">
          Security audit for AI-generated apps
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-5 max-w-4xl mx-auto">
          Your vibe coded app{' '}
          <span className="text-zinc-500">might not be </span>
          <span className="text-green-400">safe.</span>
        </h1>
        <p className="text-base text-zinc-500 leading-relaxed max-w-xl mx-auto">
          We programmatically scan your code and live URL — check for secrets, security headers, performance, and code quality. Real findings, not just AI guesses.
        </p>
      </section>

      {/* FORM */}
      <section className="w-full px-6 md:px-16 py-10 flex justify-center">
        <div className="w-full max-w-3xl bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">

          {/* Titlebar */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-[#111]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-xs text-zinc-600 mx-auto">
              Security Audit — VibeCheck
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-5">

            {/* GitHub Repo */}
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-widest text-zinc-500 font-medium uppercase">
                GitHub Repo URL
              </label>
              <div className="flex items-center gap-2 bg-[#080808] border border-white/5 rounded-xl px-4 py-3.5 focus-within:border-green-400/25 transition-colors">
                <span className="text-sm text-zinc-600 font-mono shrink-0">github.com/</span>
                <input
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="username/repository"
                  disabled={scanning}
                  className="bg-transparent outline-none text-sm text-zinc-200 font-mono w-full placeholder:text-zinc-700 disabled:opacity-40"
                />
              </div>
            </div>

            {/* Live URL */}
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-widest text-zinc-500 font-medium uppercase">
                Live App URL
              </label>
              <div className="flex items-center gap-2 bg-[#080808] border border-white/5 rounded-xl px-4 py-3.5 focus-within:border-green-400/25 transition-colors">
                <span className="text-sm text-zinc-600 font-mono shrink-0">https://</span>
                <input
                  value={liveUrl}
                  onChange={e => setLiveUrl(e.target.value)}
                  placeholder="your-app.vercel.app"
                  disabled={scanning}
                  className="bg-transparent outline-none text-sm text-zinc-200 font-mono w-full placeholder:text-zinc-700 disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-zinc-700">At least one URL is required. Both recommended for full audit.</p>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                ⚠ {error}
              </div>
            )}

            {/* Button */}
<div className="flex justify-center mt-6">
  <button
    type="submit"
    disabled={scanning}
    className="w-76 py-4 bg-yellow-300 hover:bg-green-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.3)]"
  >
    {scanning ? (
      <span className="flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
        Scanning...
      </span>
    ) : (
      "Run Security Audit →"
    )}
  </button>
</div>

            {/* Progress + Log */}
            {scanning && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>{progressLabel}</span>
                  <span className="text-green-400">{progress}%</span>
                </div>
                <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {logs.map((log, i) => (
                    <p key={i} className={`text-xs font-mono leading-6 ${log.cls}`}>
                      {log.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-zinc-700">
              Only public GitHub repos · Audit takes 30–60s
            </p>
          </form>
        </div>
      </section>

      {/* CHECKS */}
      <section className="w-full px-6 md:px-16 py-8 border-t border-white/5">
        <p className="text-xs tracking-widest text-zinc-600 mb-5 text-center uppercase">
          What we analyze
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
          {[
            ['🔑', 'Secret detection'],
            ['🔒', 'Security headers'],
            ['⚡', 'Performance'],
            ['💉', 'Injection risks'],
            ['🌐', 'HTTPS check'],
            ['📦', 'Code quality'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 bg-[#0f0f0f] border border-white/5 rounded-xl px-4 py-3">
              <span>{icon}</span>
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}