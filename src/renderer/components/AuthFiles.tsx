import React from 'react';
import { useIsProxyRunning, useAuthFiles, useToggleAuthFile, useDeleteAuthFile } from '../hooks/useIPC';
import { Card, CardContent, Button, Badge, Switch, ProxyRequired } from './ui';

export function AuthFiles() {
  const isRunning = useIsProxyRunning();
  const { data: files, isLoading } = useAuthFiles();
  const toggleFile = useToggleAuthFile();
  const deleteFile = useDeleteAuthFile();

  if (!isRunning) return <ProxyRequired />;

  return (
    <div className="max-w-lg space-y-2">
      <p className="text-[10px] text-muted-foreground">Credential files. Toggle to enable/disable.</p>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[10px] text-muted-foreground">Loading...</div>}
          {!isLoading && files?.length === 0 && <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">No auth files. Use OAuth to create credentials.</div>}
          {files?.map((f: any, i: number) => (
            <div key={f.name} className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/30 ${i > 0 ? 'border-t border-border' : ''} ${f.disabled ? 'opacity-40' : ''}`}>
              <Switch checked={!f.disabled} onCheckedChange={(v) => toggleFile.mutate({ name: f.name, disabled: !v })} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-foreground truncate">{f.name}</p>
                {f.provider && <p className="text-[9px] text-muted-foreground">{f.provider}</p>}
              </div>
              <Badge variant={f.disabled ? 'outline' : 'success'}>{f.disabled ? 'Off' : 'On'}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${f.name}"?`)) deleteFile.mutate(f.name); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">×</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
