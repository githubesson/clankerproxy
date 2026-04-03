import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { APIKeys } from './components/APIKeys';
import { ProviderKeys } from './components/ProviderKeys';
import { OAuthPanel } from './components/OAuthPanel';
import { AuthFiles } from './components/AuthFiles';
import { Settings } from './components/Settings';
import { LogViewer } from './components/LogViewer';
import { Models } from './components/Models';
import { ConfigGenerator } from './components/ConfigGenerator';
import { useProxyStatus, useStartProxy, useStopProxy, useRestartProxy } from './hooks/useIPC';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'apikeys', label: 'API Keys' },
  { id: 'providers', label: 'Providers' },
  { id: 'oauth', label: 'OAuth' },
  { id: 'authfiles', label: 'Auth Files' },
  { id: 'models', label: 'Models' },
  { id: 'configgen', label: 'Config Gen' },
  { id: 'settings', label: 'Settings' },
  { id: 'logs', label: 'Logs' },
] as const;

type NavId = (typeof NAV)[number]['id'];

export function App() {
  const [active, setActive] = useState<NavId>('dashboard');
  const [zoom, setZoom] = useState(1.0);
  const { data: status } = useProxyStatus();
  const startProxy = useStartProxy();
  const stopProxy = useStopProxy();
  const restartProxy = useRestartProxy();

  const state = status?.state ?? 'stopped';
  const port = status?.port ?? 8317;
  const isRunning = state === 'running';
  const isStopped = state === 'stopped' || state === 'error';

  useEffect(() => { window.clankerProxy.zoom.get().then(setZoom); }, []);

  const changeZoom = (delta: number) => {
    window.clankerProxy.zoom.set(zoom + delta).then(setZoom);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); changeZoom(0.1); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); changeZoom(-0.1); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); window.clankerProxy.zoom.set(1.0).then(setZoom); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom]);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-[12px]">
      <aside className="w-40 flex flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="drag-region h-[30px] flex items-center px-3 shrink-0">
          <span className="text-[11px] font-semibold text-foreground no-drag select-none tracking-tight">ClankerProxy</span>
        </div>

        <div className="mx-2 mb-1.5 no-drag">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 border border-border">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isRunning ? 'bg-accent' :
              state === 'error' ? 'bg-destructive' :
              state === 'starting' || state === 'stopping' ? 'bg-warning animate-pulse' :
              'bg-muted-foreground/30'
            }`} />
            <span className="text-[10px] text-muted-foreground flex-1 truncate">
              {isRunning ? `:${port}` :
               state === 'starting' ? 'Starting' :
               state === 'stopping' ? 'Stopping' :
               state === 'error' ? 'Error' : 'Offline'}
            </span>
            {isStopped && (
              <button onClick={() => startProxy.mutate()} disabled={startProxy.isPending}
                className="text-[9px] font-semibold text-accent hover:text-accent/80 transition-colors disabled:opacity-50 uppercase">Start</button>
            )}
            {isRunning && (
              <div className="flex gap-0.5">
                <button onClick={() => restartProxy.mutate()} disabled={restartProxy.isPending}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 px-0.5">↻</button>
                <button onClick={() => stopProxy.mutate()} disabled={stopProxy.isPending}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 px-0.5">■</button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-1.5 space-y-px no-drag overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full text-left px-2 py-1 rounded text-[11px] transition-all ${
                active === item.id
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-2 py-1.5 border-t border-sidebar-border no-drag flex items-center gap-1">
          <button onClick={() => changeZoom(-0.1)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1">−</button>
          <span className="text-[9px] text-muted-foreground/50 tabular-nums flex-1 text-center select-none">{Math.round(zoom * 100)}%</span>
          <button onClick={() => changeZoom(0.1)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1">+</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="drag-region flex items-center h-[30px] px-4 shrink-0">
          <h2 className="text-[11px] font-semibold text-muted-foreground no-drag select-none uppercase tracking-wider">
            {NAV.find((n) => n.id === active)?.label}
          </h2>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-3 border-t border-border">
          {active === 'dashboard' && <Dashboard />}
          {active === 'apikeys' && <APIKeys />}
          {active === 'providers' && <ProviderKeys />}
          {active === 'oauth' && <OAuthPanel />}
          {active === 'authfiles' && <AuthFiles />}
          {active === 'models' && <Models />}
          {active === 'configgen' && <ConfigGenerator />}
          {active === 'settings' && <Settings />}
          {active === 'logs' && <LogViewer />}
        </main>
      </div>
    </div>
  );
}
