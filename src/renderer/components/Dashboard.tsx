import React from 'react';
import { useProxyStatus, useIsProxyRunning, useBinaryStatus, useDownloadBinary, useAuthFiles, useCheckUpdate, useAppVersion, useCheckAppUpdate } from '../hooks/useIPC';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from './ui';
import { DownloadIcon, SpinnerIcon } from './icons';

const api = () => window.clankerProxy;

export function Dashboard() {
  const { data: status } = useProxyStatus();
  const { data: binary } = useBinaryStatus();
  const downloadBinary = useDownloadBinary();
  const { data: authFiles } = useAuthFiles();
  // Auto-runs on mount; returns ReleaseInfo if the installed binary is behind
  // the latest upstream release, otherwise null. Drives the "update available"
  // badge so users don't end up with a stale binary silently hiding new
  // upstream models (e.g. a freshly-added Anthropic model not appearing in
  // the Models tab because the installed proxy pre-dates that model entry).
  const { data: update } = useCheckUpdate();
  const { data: appVersion } = useAppVersion();
  const { data: appUpdate } = useCheckAppUpdate();

  const isRunning = useIsProxyRunning();
  const port = status?.port ?? 8317;
  const updateAvailable = Boolean(update && binary?.installed);
  const updateWillRestartProxy = updateAvailable && isRunning;

  return (
    <div className="max-w-lg space-y-3 @container">
      {/* App */}
      <Card>
        <CardHeader>
          <CardTitle>ClankerProxy</CardTitle>
          <CardDescription>Tray app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.6875rem] text-foreground">Installed</span>
                <span className="text-[0.625rem] text-muted-foreground font-mono truncate">
                  {appVersion ? `v${appVersion}` : '?'}
                </span>
              </div>
              {appUpdate && (
                <span className="text-[0.5625rem] text-accent font-mono truncate" title={`Update available: v${appUpdate.version}`}>
                  → v{appUpdate.version} available
                </span>
              )}
            </div>
            {appUpdate ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => api().appUpdate.openReleasePage(appUpdate.releaseUrl)}
                title={`Open v${appUpdate.version} release page in browser`}
              >
                <DownloadIcon className="size-3" />Download
              </Button>
            ) : (
              <span className="text-[0.5625rem] text-muted-foreground/70 font-mono">up to date</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Binary */}
      <Card>
        <CardHeader>
          <CardTitle>Engine</CardTitle>
          <CardDescription>CLIProxyAPI binary</CardDescription>
        </CardHeader>
        <CardContent>
          {binary?.installed ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.6875rem] text-foreground">Installed</span>
                  <span className="text-[0.625rem] text-muted-foreground font-mono truncate">{binary.version || '?'}</span>
                </div>
                {updateAvailable && update && (
                  <span className="text-[0.5625rem] text-accent font-mono truncate" title={`Update available: ${update.version}`}>
                    → {update.version} available
                  </span>
                )}
                {updateWillRestartProxy && (
                  <span className="text-[0.5625rem] text-muted-foreground/70 truncate">
                    Updating restarts the running proxy automatically
                  </span>
                )}
              </div>
              <Button
                variant={updateAvailable ? 'default' : 'outline'}
                size="sm"
                onClick={() => downloadBinary.mutate()}
                disabled={downloadBinary.isPending}
                title={updateAvailable && update
                  ? updateWillRestartProxy
                    ? `Download ${update.version} and restart the running proxy`
                    : `Download ${update.version}`
                  : 'Check for updates'}
              >
                {downloadBinary.isPending
                  ? <><SpinnerIcon className="size-3" />{updateWillRestartProxy ? 'Updating' : updateAvailable ? 'Updating' : 'Checking'}</>
                  : updateAvailable
                    ? <><DownloadIcon className="size-3" />{updateWillRestartProxy ? 'Update & Restart' : 'Update'}</>
                    : 'Check'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-[0.6875rem] text-muted-foreground">Binary not found</p>
              <Button onClick={() => downloadBinary.mutate()} disabled={downloadBinary.isPending}>
                {downloadBinary.isPending
                  ? <><SpinnerIcon className="size-3" />Downloading</>
                  : <><DownloadIcon className="size-3" />Download</>}
              </Button>
              {downloadBinary.error && (
                <p className="text-[0.625rem] text-destructive text-pretty">{String(downloadBinary.error)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats — divider-separated KPIs on a shared canvas, per surfaces guideline */}
      {isRunning && (
        <div className="grid grid-cols-3 rounded-md bg-card ring-1 ring-white/5 overflow-hidden">
          <Stat label="Endpoint" value={`127.0.0.1:${port}`} mono className="pr-3 pl-3" />
          <Stat label="Status" value="Running" accent className="px-3 border-l border-white/5" />
          <Stat label="Auth Files" value={String(authFiles?.length ?? '—')} className="pl-3 pr-3 border-l border-white/5" />
        </div>
      )}

      {!isRunning && binary?.installed && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-[0.6875rem] text-muted-foreground text-pretty">Proxy offline. Start from sidebar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  accent,
  className = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`py-2 min-w-0 ${className}`}>
      <p className="text-[0.5625rem] text-muted-foreground/80 font-medium truncate">{label}</p>
      <p className={`mt-0.5 text-[0.6875rem] truncate tabular-nums ${mono ? 'font-mono text-muted-foreground' : ''} ${accent ? 'text-accent font-medium' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
