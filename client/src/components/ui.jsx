import { Link } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { getThemeSnapshot, subscribeTheme, toggleTheme } from '../themeStore';

function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function ThemeToggle({ className = '' }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot);
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn('inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-zinc-300 hover:text-zinc-950', className)}
    >
      <span className="text-sm">{theme === 'dark' ? '☀' : '☾'}</span>
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}

export function BrandMark({ compact = false, className = '' }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-3 text-zinc-900', className)}>
      <span className={cn('grid place-items-center rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]', compact ? 'h-9 w-9' : 'h-10 w-10')}>
        <span className="h-3.5 w-3.5 rounded-full bg-emerald-600" />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
          Vibe<span className="text-emerald-600">Check</span>
        </span>
      )}
    </Link>
  );
}

export function Badge({ children, className = '' }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-medium tracking-[0.24em] text-zinc-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.03)]', className)}>
      {children}
    </span>
  );
}

export function Panel({ className = '', children }) {
  return (
    <div className={cn('rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]', className)}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, align = 'left', className = '' }) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto text-center' : '', className)}>
      {eyebrow && <Badge>{eyebrow}</Badge>}
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 md:text-[2rem]">
        {title}
      </h2>
      {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>}
    </div>
  );
}

const buttonBase = 'inline-flex items-center justify-center border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:ring-offset-2 focus:ring-offset-transparent';

export function ActionLink({ href, to, children, variant = 'primary', className = '', ...props }) {
  const styles = variant === 'primary'
    ? 'rounded-full border-emerald-600 bg-emerald-600 text-white shadow-[0_1px_2px_rgba(16,185,129,0.2)] hover:bg-emerald-500'
    : 'rounded-full border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950';

  const classes = cn(buttonBase, styles, className);
  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>;
  }
  return <a href={href} className={classes} {...props}>{children}</a>;
}

export function ScorePill({ value, status }) {
  if (status === 'coming_soon') {
    return <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600">Coming soon</span>;
  }
  if (status === 'no_data' || value == null) {
    return <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500">Not enough data</span>;
  }
  const tone = value >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : value >= 40 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', tone)}>{value}/100</span>;
}

export function StatusPill({ tone = 'neutral', children }) {
  const styles = {
    neutral: 'border-zinc-200 bg-white text-zinc-600',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    attention: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  };
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', styles[tone] || styles.neutral)}>{children}</span>;
}

export function MetricCard({ label, value, note, tone = 'neutral' }) {
  const textTone = {
    neutral: 'text-zinc-900',
    good: 'text-emerald-700',
    attention: 'text-amber-700',
    danger: 'text-rose-700',
    info: 'text-sky-700',
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className={cn('mt-2 text-2xl font-semibold tracking-tight', textTone[tone] || textTone.neutral)}>{value}</div>
      {note && <p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p>}
    </div>
  );
}
