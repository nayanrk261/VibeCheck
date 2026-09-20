import { Link } from 'react-router-dom';

function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function BrandMark({ compact = false, className = '' }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 group', className)}>
      <div className={cn(
        'grid place-items-center rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1110] shadow-[0_0_15px_rgba(53,229,154,0.12)] transition-colors group-hover:border-[rgba(53,229,154,0.3)]',
        compact ? 'h-8 w-8' : 'h-9 w-9'
      )}>
        <svg className="w-4 h-4 text-[#35E59A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      {!compact && (
        <span className="text-base font-bold tracking-tight text-[#F5F7F6]">
          Vibe<span className="text-[#35E59A]">Check</span>
        </span>
      )}
    </Link>
  );
}

export function Badge({ children, icon: Icon, className = '', variant = 'default' }) {
  const variants = {
    default: 'border-[rgba(255,255,255,0.1)] bg-[#0D1110] text-[#A3AAA7]',
    green: 'border-[rgba(53,229,154,0.25)] bg-[rgba(53,229,154,0.06)] text-[#35E59A]',
    warning: 'border-[rgba(255,184,77,0.25)] bg-[rgba(255,184,77,0.06)] text-[#FFB84D]',
    critical: 'border-[rgba(255,95,86,0.25)] bg-[rgba(255,95,86,0.06)] text-[#FF5F56]',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-all',
      variants[variant] || variants.default,
      className
    )}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

export function Panel({ className = '', children, hover = false }) {
  return (
    <div className={cn(
      'rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-xl',
      hover && 'transition-all duration-200 hover:border-[rgba(255,255,255,0.16)] hover:bg-[#111514]',
      className
    )}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, align = 'left', className = '' }) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto text-center' : '', className)}>
      {eyebrow && (
        <div className="mb-3">
          <Badge variant="green">{eyebrow}</Badge>
        </div>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-[#F5F7F6] sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A3AAA7]">{description}</p>}
    </div>
  );
}

const buttonBase = 'inline-flex items-center justify-center gap-2 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#35E59A]/30 focus:ring-offset-2 focus:ring-offset-[#050706] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export function ActionLink({ href, to, children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'rounded-xl bg-[#35E59A] text-[#050706] font-semibold hover:bg-[#20C987] shadow-[0_0_20px_rgba(53,229,154,0.25)] hover:shadow-[0_0_25px_rgba(53,229,154,0.4)]',
    secondary: 'rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#111514] text-[#F5F7F6] hover:border-[rgba(255,255,255,0.24)] hover:bg-[#151918]',
    ghost: 'rounded-xl text-[#A3AAA7] hover:text-[#F5F7F6] hover:bg-[rgba(255,255,255,0.05)]',
    outline: 'rounded-xl border border-[rgba(53,229,154,0.3)] text-[#35E59A] hover:bg-[rgba(53,229,154,0.08)]',
  };

  const classes = cn(buttonBase, 'px-4 py-2.5', styles[variant] || styles.primary, className);

  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>;
  }
  return <a href={href} className={classes} {...props}>{children}</a>;
}

export function ScorePill({ value, status }) {
  if (status === 'coming_soon') {
    return <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111514] px-2.5 py-1 text-xs font-medium text-[#A3AAA7]">Coming soon</span>;
  }
  if (status === 'no_data' || value == null) {
    return <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111514] px-2.5 py-1 text-xs font-medium text-[#68716D]">Not enough data</span>;
  }
  
  const tone = value >= 70 
    ? 'border-[rgba(53,229,154,0.3)] bg-[rgba(53,229,154,0.08)] text-[#35E59A]' 
    : value >= 40 
    ? 'border-[rgba(255,184,77,0.3)] bg-[rgba(255,184,77,0.08)] text-[#FFB84D]' 
    : 'border-[rgba(255,95,86,0.3)] bg-[rgba(255,95,86,0.08)] text-[#FF5F56]';
    
  return <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold font-mono tracking-tight', tone)}>{value}/100</span>;
}

export function StatusPill({ tone = 'neutral', children }) {
  const styles = {
    neutral: 'border-[rgba(255,255,255,0.08)] bg-[#111514] text-[#A3AAA7]',
    good: 'border-[rgba(53,229,154,0.3)] bg-[rgba(53,229,154,0.08)] text-[#35E59A]',
    attention: 'border-[rgba(255,184,77,0.3)] bg-[rgba(255,184,77,0.08)] text-[#FFB84D]',
    danger: 'border-[rgba(255,95,86,0.3)] bg-[rgba(255,95,86,0.08)] text-[#FF5F56]',
    info: 'border-[rgba(139,148,158,0.3)] bg-[rgba(139,148,158,0.08)] text-[#8B949E]',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', styles[tone] || styles.neutral)}>{children}</span>;
}

export function MetricCard({ label, value, note, tone = 'neutral' }) {
  const textTone = {
    neutral: 'text-[#F5F7F6]',
    good: 'text-[#35E59A]',
    attention: 'text-[#FFB84D]',
    danger: 'text-[#FF5F56]',
    info: 'text-[#8B949E]',
  };
  
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-4 shadow-sm backdrop-blur-xl">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#68716D]">{label}</div>
      <div className={cn('mt-2 text-2xl font-bold tracking-tight font-mono', textTone[tone] || textTone.neutral)}>{value}</div>
      {note && <p className="mt-1.5 text-xs text-[#A3AAA7]">{note}</p>}
    </div>
  );
}
