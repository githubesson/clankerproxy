import React, { useState } from 'react';
import { useIsProxyRunning, useModelDefinitions } from '../hooks/useIPC';
import { Card, CardContent, Badge, Select, Input, ProxyRequired } from './ui';
import { MODEL_CHANNEL_OPTIONS } from '../../shared/provider-registry';

export function Models() {
  const isRunning = useIsProxyRunning();
  const [channel, setChannel] = useState('claude');
  const [filter, setFilter] = useState('');

  const { data, isLoading, error } = useModelDefinitions(channel);

  if (!isRunning) return <ProxyRequired />;

  const models = data?.models ?? [];
  const filtered = filter
    ? models.filter((m: any) =>
        (m.id ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.display_name ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : models;

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground flex-1">Available models per provider.</p>
        <Select value={channel} onChange={(v) => { setChannel(v); setFilter(''); }} options={MODEL_CHANNEL_OPTIONS} />
      </div>

      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter models..." />

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[10px] text-muted-foreground">Loading...</div>}
          {error && <div className="px-3 py-2 text-[10px] text-destructive">Failed to load models</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">
              {models.length === 0 ? 'No models for this provider.' : 'No matches.'}
            </div>
          )}
          {filtered.map((m: any, i: number) => (
            <div key={m.id ?? i} className={`flex items-center gap-2 px-3 py-1 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex-1 min-w-0">
                <code className="text-[10px] text-foreground font-mono truncate block">{m.id}</code>
                {m.display_name && m.display_name !== m.id && (
                  <span className="text-[9px] text-muted-foreground/60">{m.display_name}</span>
                )}
              </div>
              {m.owned_by && (
                <Badge variant="outline">{m.owned_by}</Badge>
              )}
            </div>
          ))}
          {!isLoading && filtered.length > 0 && (
            <div className="px-3 py-1 border-t border-border">
              <span className="text-[9px] text-muted-foreground/40">{filtered.length} model{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
