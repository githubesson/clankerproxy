import React, { useId } from 'react';
import { SelectChevron } from './icons';

/* ── Card ── */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md bg-card ring-1 ring-white/5 ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-3 py-2 border-b border-white/5 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[0.6875rem] font-medium text-foreground tracking-tight">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.625rem] text-muted-foreground mt-0.5 text-pretty">{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-3 py-2 ${className}`}>{children}</div>;
}

/* ── Button ── */
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'subtle';

export function Button({
  children,
  variant = 'default',
  size = 'default',
  onClick,
  disabled,
  className = '',
  type = 'button',
  title,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: 'default' | 'sm' | 'icon' | 'iconSm';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
  'aria-label'?: string;
}) {
  const base = 'relative inline-flex items-center justify-center rounded appearance-none p-0 font-medium transition-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-default select-none';
  const variants: Record<ButtonVariant, string> = {
    default: 'bg-foreground text-background hover:bg-foreground/90',
    outline: 'ring-1 ring-inset ring-white/10 bg-transparent hover:bg-white/5 text-foreground',
    ghost: 'hover:bg-white/5 text-muted-foreground hover:text-foreground',
    subtle: 'bg-white/5 text-foreground hover:bg-white/10',
    destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 ring-1 ring-inset ring-destructive/20',
  };
  const sizes = {
    default: 'h-7 px-2.5 text-[0.6875rem]',
    sm: 'h-6 px-2 text-[0.625rem]',
    icon: 'size-7 text-[0.6875rem]',
    iconSm: 'size-6 text-[0.625rem]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {/* text-box-trim strips the font's half-leading so flex centering lands on
          cap-height / alphabetic baseline. Chromium 133+; older falls back to
          normal flex centering which is close enough. */}
      <span className="inline-flex items-center gap-1 [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
        {children}
      </span>
    </button>
  );
}

/* ── Input ── */
export function Input({
  value,
  onChange,
  onKeyDown,
  onBlur,
  placeholder,
  type = 'text',
  className = '',
  disabled,
  name,
  id,
  'aria-label': ariaLabel,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
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
      name={name}
      id={id}
      aria-label={ariaLabel ?? placeholder ?? name}
      className={`flex h-7 w-full min-w-0 rounded bg-white/[0.02] ring-1 ring-inset ring-white/10 px-2 text-[0.6875rem] text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring disabled:opacity-50 ${className}`}
    />
  );
}

/* ── Label ── */
export function Label({
  children,
  htmlFor,
  className = '',
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`text-[0.625rem] font-medium text-muted-foreground ${className}`}>
      {children}
    </label>
  );
}

/* ── Field: label + control, with id auto-wired ── */
export function Field({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: (props: { id: string }) => React.ReactNode;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id })}
      {hint && <p className="text-[0.625rem] text-muted-foreground/60 text-pretty">{hint}</p>}
    </div>
  );
}

/* ── Badge ── */
type BadgeVariant = 'default' | 'outline' | 'success' | 'destructive' | 'warning';

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-white/5 text-muted-foreground ring-white/10',
    outline: 'bg-transparent text-muted-foreground ring-white/10',
    success: 'bg-accent/10 text-accent ring-accent/25',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/25',
    warning: 'bg-warning/10 text-warning ring-warning/25',
  };
  return (
    <span className={`inline-flex items-center rounded px-1 py-px text-[0.5625rem] font-medium leading-none ring-1 ring-inset ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* ── Switch (native checkbox, per form-controls guideline) ── */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  name,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      className={`group relative inline-flex w-8 shrink-0 rounded-full p-0.5 ring-1 ring-inset outline-offset-2 transition-colors duration-150 ease-in-out has-focus-visible:outline-2 has-focus-visible:outline-ring ${
        checked ? 'bg-accent ring-accent/40' : 'bg-white/10 ring-white/10'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`aspect-square w-1/2 rounded-full bg-white shadow-xs ring-1 ring-black/10 transition-transform duration-150 ease-in-out ${
          checked ? 'translate-x-full' : ''
        }`}
      />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        id={id}
        name={name}
        aria-label={ariaLabel}
        className="absolute inset-0 size-full appearance-none focus:outline-hidden"
      />
    </div>
  );
}

/* ── Select ── */
export function Select({
  value,
  onChange,
  options,
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`inline-grid grid-cols-[1fr_--spacing(6)] items-center rounded ring-1 ring-inset ring-white/10 bg-white/[0.02] has-focus-visible:outline-2 has-focus-visible:-outline-offset-1 has-focus-visible:outline-ring ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        id={id}
        name={name}
        aria-label={ariaLabel ?? name}
        disabled={disabled}
        className="col-span-full row-start-1 h-7 appearance-none bg-transparent pl-2 pr-6 text-[0.6875rem] text-foreground focus:outline-hidden disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <SelectChevron className="text-muted-foreground" />
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <p className="text-[0.6875rem] text-muted-foreground text-pretty">{message}</p>
    </div>
  );
}

/* ── ProxyRequired ── */
export function ProxyRequired() {
  return <EmptyState message="Start the proxy to access this section." />;
}

/* ── Separator ── */
export function Separator({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-white/5 ${className}`} />;
}
