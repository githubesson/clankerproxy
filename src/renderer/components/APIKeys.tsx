import React, { useState } from 'react';
import { useIsProxyRunning, useAPIKeys, useAddAPIKey, useDeleteAPIKey } from '../hooks/useIPC';
import { Card, CardContent, Button, Input, Badge, ProxyRequired } from './ui';
import { maskSecret } from '../lib/providerKeys';
import { TrashIcon } from './icons';

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
      <p className="text-[0.625rem] text-muted-foreground text-pretty">Keys that clients use to authenticate with your proxy.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        className="flex gap-1.5"
      >
        <Input
          name="new-api-key"
          aria-label="New API key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="sk-your-api-key..."
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button type="submit" disabled={!newKey.trim() || addKey.isPending}>Add</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[0.625rem] text-muted-foreground">Loading…</div>}
          {keys?.length === 0 && (
            <div className="px-3 py-6 text-center text-[0.625rem] text-muted-foreground">No keys yet.</div>
          )}
          <ul role="list">
            {keys?.map((key: string, i: number) => (
              <li
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-white/[0.03] ${i > 0 ? 'border-t border-white/5' : ''}`}
              >
                <Badge variant="outline">{i + 1}</Badge>
                <code className="flex-1 min-w-0 text-[0.625rem] text-muted-foreground font-mono truncate">
                  {maskSecret(key)}
                </code>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => deleteKey.mutate(i)}
                  disabled={deleteKey.isPending}
                  aria-label={`Remove key ${i + 1}`}
                  title={`Remove key ${i + 1}`}
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
