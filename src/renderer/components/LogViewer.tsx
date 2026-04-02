import React, { useRef, useEffect, useState } from 'react';
import { useProcessLogs, useProxyStatus } from '../hooks/useIPC';
import { Input, Button } from './ui';

export function LogViewer() {
  const { data: status } = useProxyStatus();
  const processLogs = useProcessLogs();
  const ref = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');

  const isRunning = status?.state === 'running';

  useEffect(() => {
    if (autoScroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [processLogs, autoScroll]);

  const onScroll = () => {
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  const lines = filter ? processLogs.filter((l) => l.toLowerCase().includes(filter.toLowerCase())) : processLogs;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -mx-4 -mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border shrink-0">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." className="max-w-[200px]" />
        <Button variant={autoScroll ? 'default' : 'outline'} size="sm" onClick={() => setAutoScroll(!autoScroll)}>Tail</Button>
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground/40 tabular-nums">{lines.length}</span>
      </div>
      <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-1 font-mono">
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-muted-foreground/30">{isRunning ? 'Waiting...' : 'Proxy offline'}</p>
          </div>
        ) : lines.map((l, i) => (
          <div key={i} className={`text-[10px] leading-4 whitespace-pre-wrap break-all select-text ${
            l.toLowerCase().includes('error') || l.toLowerCase().includes('fatal') ? 'text-destructive' :
            l.toLowerCase().includes('warn') ? 'text-warning' : 'text-muted-foreground/70'
          }`}>{l}</div>
        ))}
      </div>
    </div>
  );
}
