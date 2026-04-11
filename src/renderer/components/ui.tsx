import React from 'react';

/* ── Card ── */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-card ${className}`}>{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 border-b border-border">{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-medium text-foreground">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-muted-foreground mt-0.5">{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-3 py-2 ${className}`}>{children}</div>;
}

/* ── Button ── */
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';

export function Button({
  children, variant = 'default', size = 'default', onClick, disabled, className = '', type = 'button',
}: {
  children: React.ReactNode; variant?: ButtonVariant; size?: 'default' | 'sm' | 'icon';
  onClick?: React.MouseEventHandler<HTMLButtonElement>; disabled?: boolean; className?: string; type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none cursor-default';
  const variants: Record<ButtonVariant, string> = {
    default: 'bg-foreground text-background hover:bg-foreground/90',
    outline: 'border border-border bg-transparent hover:bg-muted text-foreground',
    ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
    destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20',
  };
  const sizes = {
    default: 'h-6 px-2 text-[11px]',
    sm: 'h-5 px-1.5 text-[10px]',
    icon: 'h-6 w-6 text-[11px]',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

/* ── Input ── */
export function Input({
  value, onChange, onKeyDown, onBlur, placeholder, type = 'text', className = '', disabled,
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void; onBlur?: () => void;
  placeholder?: string; type?: string; className?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`flex h-6 w-full rounded border border-input bg-transparent px-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 ${className}`}
    />
  );
}

/* ── Badge ── */
export function Badge({
  children, variant = 'default',
}: {
  children: React.ReactNode; variant?: 'default' | 'outline' | 'success' | 'destructive' | 'warning';
}) {
  const variants = {
    default: 'bg-muted text-muted-foreground border-transparent',
    outline: 'bg-transparent text-muted-foreground border-border',
    success: 'bg-accent/10 text-accent border-accent/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  };
  return (
    <span className={`inline-flex items-center rounded border px-1 py-px text-[9px] font-medium leading-none ${variants[variant]}`}>
      {children}
    </span>
  );
}

/* ── Switch ── */
export function Switch({ checked, onCheckedChange, disabled }: {
  checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 cursor-default items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-input'
      }`}
    >
      <span className={`pointer-events-none block h-2.5 w-2.5 rounded-full bg-foreground shadow-sm transition-transform ${
        checked ? 'translate-x-3' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

/* ── Select ── */
export function Select({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 rounded border border-input bg-transparent px-1.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── EmptyState ── */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-[11px] text-muted-foreground">{message}</p>
    </div>
  );
}

/* ── ProxyRequired ── */
export function ProxyRequired() {
  return <EmptyState message="Start the proxy to access this section." />;
}

/* ── Separator ── */
export function Separator() {
  return <div className="h-px bg-border" />;
}
