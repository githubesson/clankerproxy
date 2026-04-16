import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, className = '', ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={`size-4 shrink-0 ${className}`}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713Z" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 3A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 3h-9Z" />
    </Svg>
  );
}

export function RestartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.84a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
    </Svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
    </Svg>
  );
}

export function XMarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06Z" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 1 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M5.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L8.94 8 5.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M3.22 5.22a.75.75 0 0 1 1.06 0L8 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M10.78 12.78a.75.75 0 0 1-1.06 0L5.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L7.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h4.5c.966 0 1.75.784 1.75 1.75V5h1.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 14h-4.5A1.75 1.75 0 0 1 6 12.25V11H4.75A1.75 1.75 0 0 1 3 9.25v-5.5ZM7.5 11v1.25c0 .138.112.25.25.25h4.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25H11v2.75A1.75 1.75 0 0 1 9.25 11H7.5Zm2-7.5h-4.75a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h4.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25H9.5Z" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </Svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.75A1.75 1.75 0 0 1 3.75 3h2.5c.375 0 .735.139 1.02.395l1.04.943a.25.25 0 0 0 .168.065h3.772A1.75 1.75 0 0 1 14 6.148V12.25A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-7.5Z" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.53 6.72a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06L8.75 8.44V2.75Z" />
      <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v2a2.75 2.75 0 0 0 2.75 2.75h6.5A2.75 2.75 0 0 0 14 11.75v-2a.75.75 0 0 0-1.5 0v2c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-2Z" />
    </Svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM3.5 8a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3.5 8Zm2 4.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </Svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.914 1.045a.75.75 0 0 1 .527.817l-.75 5.188h3.309a.75.75 0 0 1 .627 1.162l-5.5 8.5a.75.75 0 0 1-1.362-.532l.75-5.18H3.25a.75.75 0 0 1-.63-1.155l5.5-8.5a.75.75 0 0 1 .794-.3Z" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 1 0 1.352 8.8l.503.503a.75.75 0 0 0 .53.22h.365v.75c0 .414.336.75.75.75h.75v.75c0 .414.336.75.75.75H15a.75.75 0 0 0 .75-.75V11.81a.75.75 0 0 0-.22-.53L9.2 4.95A4.51 4.51 0 0 0 10 1Zm-2 3.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd" />
    </Svg>
  );
}

export function ServerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h7.5A2.25 2.25 0 0 1 14 4.25v1.5A2.25 2.25 0 0 1 11.75 8h-7.5A2.25 2.25 0 0 1 2 5.75v-1.5Zm9 0a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 0-1.5h-.5a.75.75 0 0 0-.75.75Zm-9 6A2.25 2.25 0 0 1 4.25 8h7.5A2.25 2.25 0 0 1 14 10.25v1.5A2.25 2.25 0 0 1 11.75 14h-7.5A2.25 2.25 0 0 1 2 11.75v-1.5Zm9 0a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 0-1.5h-.5a.75.75 0 0 0-.75.75Z" clipRule="evenodd" />
    </Svg>
  );
}

export function SpinnerIcon({ className = '', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-4 shrink-0 animate-spin ${className}`}
      {...props}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function SelectChevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 8 5"
      width="8"
      height="5"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none col-start-2 row-start-1 place-self-center ${className}`}
    >
      <path d="M.5.5 4 4 7.5.5" stroke="currentColor" />
    </svg>
  );
}
