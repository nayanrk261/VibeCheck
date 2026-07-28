import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmission } from '../api/index';

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const sev = finding.severity?.toUpperCase();
  const cfg = {
    CRITICAL: { border: 'border-red-500/20', tag: 'bg-red-500/10 text-red-400 border-red-500/25' },
    HIGH:     { border: 'border-orange-500/20', tag: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
    MEDIUM:   { border: 'border-yellow-500/20', tag: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' },
    LOW:      { border: 'border-blue-500/20', tag: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
    INFO:     { border: 'border-white/5', tag: 'bg-white/5 text-zinc-500 border-white/10' },
  }[sev] || { border: 'border-white/5', tag: 'bg-white/5 text-zinc-500 border-white/10' };

  return (
    <div
      className={`bg-[#0d0d0d] border ${cfg.border} rounded-xl overflow-hidden cursor-pointer`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center gap-4 px-6 py-5 hover:bg-white/[0.015] transition-colors">
        <span className={`text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg border ${cfg.tag} shrink-0`}>
          {sev}
        </span>
        <span className="text-sm text-[#bbb] flex-1">{finding.title}</span>
        <span className="text-[10px] text-zinc-700">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="px-6 pb-6 border-t border-white/5 pt-5">
          <p className="text-sm text-zinc-500 leading-relaxed mb-4">{finding.description}</p>
          <div className="bg-green-400/5 border border-green-400/10 rounded-xl px-5 py-4">
            <p className="text-sm text-green-400 leading-relaxed">
              <span className="font-semibold">Fix: </span>{finding.fix}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSubmission(id);
        setData(result);
      } catch (err) {
        setError('Could not load result.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-green-400 rounded-full animate-spin" />
        <p className="text-xs text-zinc-600 font-mono tracking-wider">Loading report...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-xs text-zinc-600 hover:text-zinc-400 underline">Try again</button>
      </div>
    </div>
  );

  const overall = data?.scores?.overall ?? 0;
  const sec = data?.scores?.security ?? 0;
  const code = data?.scores?.codeQuality ?? 0;
  const ui = data?.scores?.uiUx ?? 0;
  const perf = data?.scores?.performance ?? 0;

  const scoreColor = overall >= 70 ? '#22c55e' : overall >= 40 ? '#facc15' : '#f87171';
  const barColor = (v) => v >= 70 ? 'bg-green-400' : v >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  const textColor = (v) => v >= 70 ? 'text-green-400' : v >= 40 ? 'text-yellow-400' : 'text-red-400';

  const riskLabel = overall >= 70 ? 'Low Risk' : overall >= 40 ? 'Medium Risk' : 'High Risk';
  const riskColor = overall >= 70 ? 'text-green-400' : overall >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-white/5 sticky top-0 bg-[#080808]/90 backdrop-blur z-10">
        <button onClick={() => navigate('/')} className="text-xl font-black tracking-tight hover:opacity-70 transition-opacity">
          Vibe<span className="text-green-400">Check</span>
        </button>
        <div className="text-xs text-zinc-600 border border-white/5 rounded-full px-4 py-1.5 font-mono">
          {data?.repoUrl?.replace('https://github.com/', '')}
        </div>
      </nav>

      {/* HERO — Score + Bars */}
      <section className="w-full px-8 md:px-16 pt-12 pb-10 border-b border-white/5">
        <div className="inline-flex items-center gap-2 text-xs text-zinc-600 border border-white/5 rounded-full px-4 py-1.5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Security Audit Report
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-16 items-start">
          {/* Score */}
          <div>
            <div className="font-black leading-none tracking-tighter" style={{ fontSize: '140px', color: scoreColor, lineHeight: 0.9 }}>
              {overall}
              <span className="text-2xl text-zinc-700 font-normal tracking-normal">/100</span>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-[10px] tracking-widest text-zinc-600 mb-2">RISK LEVEL</p>
              <p className={`text-lg font-bold ${riskColor}`}>{riskLabel}</p>
            </div>
          </div>

          {/* Summary + Bars */}
          <div className="pt-2">
            {data?.summary && (
              <p className="text-sm text-zinc-500 leading-relaxed mb-8 pl-5 border-l border-white/5 max-w-3xl">
                {data.summary}
              </p>
            )}
            <div className="flex flex-col gap-5">
              {[
                ['Security', sec],
                ['Code Quality', code],
                ['UI / UX', ui],
                ['Performance', perf],
              ].map(([label, val]) => (
                <div key={label} className="grid grid-cols-[120px_1fr_44px] items-center gap-5">
                  <span className="text-sm text-zinc-500">{label}</span>
                  <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(val)} rounded-full`} style={{ width: `${val}%` }} />
                  </div>
                  <span className={`text-sm font-mono font-semibold text-right ${textColor(val)}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS ROW */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-white/5">
  {[
    { val: data?.findings?.length ?? 0, label: 'ISSUES FOUND', color: 'text-red-400' },
    { val: 0, label: 'SECRETS EXPOSED', color: 'text-green-400' },
    { val: `${data?.meta?.responseTime ?? '--'}ms`, label: 'RESPONSE TIME', color: 'text-yellow-400' },
    { val: data?.meta?.filesScanned ?? '--', label: 'FILES SCANNED', color: 'text-green-400' },
  ].map((s, i) => (
    <div key={i} className="px-8 md:px-16 py-7 border-r border-white/5 last:border-r-0">
      <div className={`text-3xl font-bold mb-1.5 ${s.color}`}>{s.val}</div>
      <div className="text-[10px] tracking-widest text-zinc-600">{s.label}</div>
    </div>
  ))}
</section>

      {/* FINDINGS */}
      {data?.findings?.length > 0 && (
        <section className="px-8 md:px-16 py-10 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] tracking-widest text-zinc-600">FINDINGS</p>
            <p className="text-[10px] text-zinc-700">{data.findings.length} issue{data.findings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-col gap-2">
            {data.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
          </div>
        </section>
      )}

      {/* POSITIVES */}
      {data?.positives?.length > 0 && (
        <section className="px-8 md:px-16 py-10 border-b border-white/5">
          <p className="text-[10px] tracking-widest text-zinc-600 mb-6">WHAT YOU GOT RIGHT</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.positives.map((p, i) => (
              <div key={i} className="flex items-start gap-4 bg-[#0d0d0d] border border-green-400/10 rounded-xl px-5 py-4">
                <span className="text-green-400 text-lg shrink-0">✓</span>
                <p className="text-sm text-zinc-500 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ACTION */}
      <section className="px-8 md:px-16 py-10 flex items-center justify-between">
        <span className="text-xs text-zinc-700">Audit complete · {data?.repoUrl?.replace('https://github.com/', '')}</span>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-green-400 hover:bg-green-300 text-black text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_32px_rgba(34,197,94,0.35)] cursor-pointer"
        >
          Scan Another App →
        </button>
      </section>

    </div>
  );
}