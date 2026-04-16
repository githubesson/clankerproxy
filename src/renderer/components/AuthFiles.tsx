import React from 'react';
import { useIsProxyRunning, useAuthFiles, useToggleAuthFile, useDeleteAuthFile } from '../hooks/useIPC';
import { Card, CardContent, Button, Badge, Switch, ProxyRequired } from './ui';
import { FolderIcon, TrashIcon } from './icons';

export function AuthFiles() {
  const isRunning = useIsProxyRunning();
  const { data: files, isLoading } = useAuthFiles();
  const toggleFile = useToggleAuthFile();
  const deleteFile = useDeleteAuthFile();

  if (!isRunning) return <ProxyRequired />;

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[0.625rem] text-muted-foreground text-pretty">Credential files. Toggle to enable or disable.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.clankerProxy.authFiles.openFolder()}
        >
          <FolderIcon className="size-3" />
          Open Folder
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[0.625rem] text-muted-foreground">Loading…</div>}
          {!isLoading && files?.length === 0 && (
            <div className="px-3 py-6 text-center text-[0.625rem] text-muted-foreground text-pretty">
              No auth files. Use OAuth to create credentials.
            </div>
          )}
          <ul role="list">
            {files?.map((f: any, i: number) => (
              <li
                key={f.name}
                className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-white/[0.03] ${
                  i > 0 ? 'border-t border-white/5' : ''
                } ${f.disabled ? 'opacity-50' : ''}`}
              >
                <Switch
                  checked={!f.disabled}
                  onCheckedChange={(v) => toggleFile.mutate({ name: f.name, disabled: !v })}
                  aria-label={`Enable ${f.name}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.625rem] font-mono text-foreground truncate">{f.name}</p>
                  {f.provider && <p className="text-[0.5625rem] text-muted-foreground">{f.provider}</p>}
                </div>
                <Badge variant={f.disabled ? 'outline' : 'success'}>{f.disabled ? 'Off' : 'On'}</Badge>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Delete ${f.name}`}
                  title={`Delete ${f.name}`}
                  onClick={() => { if (confirm(`Delete "${f.name}"?`)) deleteFile.mutate(f.name); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                >
                  <TrashIcon className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
