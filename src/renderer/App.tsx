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
import { PlayIcon, StopIcon, RestartIcon, PlusIcon, MinusIcon, SpinnerIcon } from './components/icons';

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

const isMac = navigator.platform.startsWith('Mac');

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
  const isTransitioning = state === 'starting' || state === 'stopping';

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

  const statusLabel =
    isRunning ? `:${port}` :
    state === 'starting' ? 'Starting' :
    state === 'stopping' ? 'Stopping' :
    state === 'error' ? 'Error' : 'Offline';

  const statusDotClass =
    isRunning ? 'bg-accent shadow-[0_0_0_3px] shadow-accent/15' :
    state === 'error' ? 'bg-destructive' :
    isTransitioning ? 'bg-warning animate-[pulse-dot_1.4s_ease-in-out_infinite]' :
    'bg-muted-foreground/40';

  return (
    <div className="isolate flex h-dvh bg-background overflow-hidden">
      <aside className="w-44 flex flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className={`drag-region flex h-[30px] items-center pr-3 shrink-0 ${isMac ? 'pl-[70px]' : 'pl-3'}`}>
          <span className="text-[0.6875rem] font-semibold text-foreground no-drag select-none tracking-tight">ClankerProxy</span>
        </div>

        <div className="mx-2 mb-2 no-drag">
          <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded bg-white/[0.03] ring-1 ring-inset ring-white/5">
            <span className={`size-1.5 rounded-full shrink-0 ${statusDotClass}`} aria-hidden="true" />
            <span className="text-[0.625rem] text-muted-foreground flex-1 truncate tabular-nums" aria-live="polite">
              {statusLabel}
            </span>
            {isStopped && (
              <button
                type="button"
                onClick={() => startProxy.mutate()}
                disabled={startProxy.isPending}
                aria-label="Start proxy"
                title="Start proxy"
                className="inline-flex size-5 items-center justify-center rounded text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                {startProxy.isPending ? <SpinnerIcon className="size-3" /> : <PlayIcon className="size-3" />}
              </button>
            )}
            {isRunning && (
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => restartProxy.mutate()}
                  disabled={restartProxy.isPending}
                  aria-label="Restart proxy"
                  title="Restart proxy"
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-50"
                >
                  {restartProxy.isPending ? <SpinnerIcon className="size-3" /> : <RestartIcon className="size-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => stopProxy.mutate()}
                  disabled={stopProxy.isPending}
                  aria-label="Stop proxy"
                  title="Stop proxy"
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  {stopProxy.isPending ? <SpinnerIcon className="size-3" /> : <StopIcon className="size-3" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-1.5 no-drag overflow-y-auto" role="list">
          <ul className="space-y-px" role="list">
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActive(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full text-left px-2 py-1 rounded text-[0.6875rem] ${
                      isActive
                        ? 'bg-white/[0.06] text-foreground'
                        : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-2 py-1.5 border-t border-sidebar-border no-drag flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeZoom(-0.1)}
            aria-label="Decrease zoom"
            title="Decrease zoom"
            className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <MinusIcon className="size-3" />
          </button>
          <span className="flex-1 text-center text-[0.5625rem] text-muted-foreground/60 tabular-nums select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(0.1)}
            aria-label="Increase zoom"
            title="Increase zoom"
            className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <PlusIcon className="size-3" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="drag-region flex items-center h-[30px] px-4 shrink-0">
          <h2 className="text-[0.6875rem] font-medium text-foreground no-drag select-none tracking-tight">
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
