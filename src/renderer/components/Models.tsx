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
        <p className="flex-1 text-[0.625rem] text-muted-foreground text-pretty">Available models per provider.</p>
        <Select
          name="model-channel"
          aria-label="Model channel"
          value={channel}
          onChange={(v) => { setChannel(v); setFilter(''); }}
          options={MODEL_CHANNEL_OPTIONS}
        />
      </div>

      <Input
        name="model-filter"
        aria-label="Filter models"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter models…"
      />

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[0.625rem] text-muted-foreground">Loading…</div>}
          {error && <div className="px-3 py-2 text-[0.625rem] text-destructive">Failed to load models</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[0.625rem] text-muted-foreground text-pretty">
              {models.length === 0 ? 'No models for this provider.' : 'No matches.'}
            </div>
          )}
          <ul role="list">
            {filtered.map((m: any, i: number) => (
              <li
                key={m.id ?? i}
                className={`flex items-center gap-2 px-3 py-1 ${i > 0 ? 'border-t border-white/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <code className="block truncate text-[0.625rem] text-foreground font-mono">{m.id}</code>
                  {m.display_name && m.display_name !== m.id && (
                    <p className="text-[0.5625rem] text-muted-foreground/60 truncate">{m.display_name}</p>
                  )}
                </div>
                {m.owned_by && <Badge variant="outline">{m.owned_by}</Badge>}
              </li>
            ))}
          </ul>
          {!isLoading && filtered.length > 0 && (
            <div className="px-3 py-1 border-t border-white/5">
              <span className="text-[0.5625rem] text-muted-foreground/50 tabular-nums">
                {filtered.length} model{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
