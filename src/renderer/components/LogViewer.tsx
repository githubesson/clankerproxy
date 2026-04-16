import React, { useRef, useEffect, useState } from 'react';
import { useProcessLogs, useAppLogs, useProxyStatus } from '../hooks/useIPC';
import { Input, Button } from './ui';

type LogTab = 'proxy' | 'app';

export function LogViewer() {
  const { data: status } = useProxyStatus();
  const processLogs = useProcessLogs();
  const appLogs = useAppLogs();
  const ref = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<LogTab>('proxy');

  const isRunning = status?.state === 'running';
  const activeLogs = tab === 'proxy' ? processLogs : appLogs;

  useEffect(() => {
    if (autoScroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [activeLogs, autoScroll]);

  const onScroll = () => {
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  const lines = filter ? activeLogs.filter((l) => l.toLowerCase().includes(filter.toLowerCase())) : activeLogs;

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] -mx-4 -mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-white/5 shrink-0">
        <div
          role="tablist"
          aria-label="Log source"
          className="inline-flex rounded ring-1 ring-inset ring-white/10 bg-white/[0.02] p-0.5"
        >
          <TabButton active={tab === 'proxy'} onClick={() => setTab('proxy')}>Proxy</TabButton>
          <TabButton active={tab === 'app'} onClick={() => setTab('app')}>ClankerProxy</TabButton>
        </div>
        <Input
          name="log-filter"
          aria-label="Filter logs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="max-w-[200px]"
        />
        <Button variant={autoScroll ? 'subtle' : 'outline'} size="sm" onClick={() => setAutoScroll(!autoScroll)} aria-pressed={autoScroll}>
          Tail
        </Button>
        <div className="flex-1" />
        <span className="text-[0.5625rem] text-muted-foreground/50 tabular-nums">{lines.length}</span>
      </div>
      <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-1 font-mono">
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[0.625rem] text-muted-foreground/40 text-pretty">
              {tab === 'proxy' ? (isRunning ? 'Waiting…' : 'Proxy offline') : 'No logs yet'}
            </p>
          </div>
        ) : (
          <ol role="list" className="list-none">
            {lines.map((l, i) => (
              <li
                key={i}
                className={`text-[0.625rem] leading-4 whitespace-pre-wrap break-all select-text ${
                  l.toLowerCase().includes('error') || l.toLowerCase().includes('fatal') ? 'text-destructive' :
                  l.toLowerCase().includes('warn') ? 'text-warning' : 'text-muted-foreground/75'
                }`}
              >
                {l}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[0.625rem] ${
        active
          ? 'bg-white/[0.08] text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
