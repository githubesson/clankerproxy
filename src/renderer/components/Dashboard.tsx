import React from 'react';
import { useProxyStatus, useIsProxyRunning, useBinaryStatus, useDownloadBinary, useAuthFiles } from '../hooks/useIPC';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from './ui';

export function Dashboard() {
  const { data: status } = useProxyStatus();
  const { data: binary } = useBinaryStatus();
  const downloadBinary = useDownloadBinary();
  const { data: authFiles } = useAuthFiles();

  const isRunning = useIsProxyRunning();
  const port = status?.port ?? 8317;

  return (
    <div className="space-y-3 max-w-lg">
      {/* Binary */}
      <Card>
        <CardHeader>
          <CardTitle>Engine</CardTitle>
          <CardDescription>CLIProxyAPIPlus binary</CardDescription>
        </CardHeader>
        <CardContent>
          {binary?.installed ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-foreground">Installed</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-2">{binary.version || '?'}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadBinary.mutate()} disabled={downloadBinary.isPending}>
                {downloadBinary.isPending ? 'Checking...' : 'Update'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-[11px] text-muted-foreground">Binary not found</p>
              <Button onClick={() => downloadBinary.mutate()} disabled={downloadBinary.isPending}>
                {downloadBinary.isPending ? 'Downloading...' : 'Download'}
              </Button>
              {downloadBinary.error && (
                <p className="text-[10px] text-destructive">{String(downloadBinary.error)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {isRunning && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Endpoint" value={`127.0.0.1:${port}`} mono />
          <Stat label="Status" value="Running" accent />
          <Stat label="Auth Files" value={String(authFiles?.length ?? '—')} />
        </div>
      )}

      {!isRunning && binary?.installed && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-[11px] text-muted-foreground">Proxy offline. Start from sidebar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-[11px] mt-0.5 ${mono ? 'font-mono text-muted-foreground' : ''} ${accent ? 'text-accent font-medium' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
