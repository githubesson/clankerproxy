import React, { useState } from 'react';
import { useIsProxyRunning, useAPIKeys, useAddAPIKey, useDeleteAPIKey } from '../hooks/useIPC';
import { Card, CardContent, Button, Input, Badge, ProxyRequired } from './ui';
import { maskSecret } from '../lib/providerKeys';

export function APIKeys() {
  const isRunning = useIsProxyRunning();
  const { data: keys, isLoading } = useAPIKeys();
  const addKey = useAddAPIKey();
  const deleteKey = useDeleteAPIKey();
  const [newKey, setNewKey] = useState('');

  if (!isRunning) return <ProxyRequired />;

  const handleAdd = () => {
    if (!newKey.trim()) return;
    addKey.mutate(newKey.trim(), { onSuccess: () => setNewKey('') });
  };

  return (
    <div className="max-w-lg space-y-2">
      <p className="text-[10px] text-muted-foreground">Keys that clients use to authenticate with your proxy.</p>

      <div className="flex gap-1.5">
        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sk-your-api-key..." onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <Button onClick={handleAdd} disabled={!newKey.trim() || addKey.isPending}>Add</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[10px] text-muted-foreground">Loading...</div>}
          {keys?.length === 0 && <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">No keys yet.</div>}
          {keys?.map((key: string, i: number) => (
            <div key={i} className={`flex items-center justify-between px-3 py-1.5 group hover:bg-muted/30 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge variant="outline">{i + 1}</Badge>
                <code className="text-[10px] text-muted-foreground font-mono truncate">
                  {maskSecret(key)}
                </code>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteKey.mutate(i)} disabled={deleteKey.isPending}
                className="opacity-0 group-hover:opacity-100">Remove</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
