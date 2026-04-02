import React, { useState } from 'react';
import { useIsProxyRunning } from '../hooks/useIPC';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, Button, Input, Badge, Select, ProxyRequired } from './ui';

const PROVIDERS = [
  { id: 'claude-api-key', label: 'Claude', keyField: 'api-key' },
  { id: 'gemini-api-key', label: 'Gemini', keyField: 'api-key' },
  { id: 'codex-api-key', label: 'Codex', keyField: 'api-key' },
  { id: 'vertex-api-key', label: 'Vertex', keyField: 'api-key' },
  { id: 'openai-compatibility', label: 'OpenAI Compat', keyField: 'name' },
];

export function ProviderKeys() {
  const isRunning = useIsProxyRunning();
  const [active, setActive] = useState(PROVIDERS[0].id);
  const p = PROVIDERS.find((p) => p.id === active) ?? PROVIDERS[0];

  if (!isRunning) return <ProxyRequired />;

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground flex-1">Upstream LLM provider keys.</p>
        <Select value={active} onChange={setActive} options={PROVIDERS.map((p) => ({ value: p.id, label: p.label }))} />
      </div>
      <Section key={active} provider={p.id} keyField={p.keyField} />
    </div>
  );
}

function Section({ provider, keyField }: { provider: string; keyField: string }) {
  const api = () => window.clankerProxy;
  const { data: keys, isLoading, refetch } = useQuery({ queryKey: ['providerKeys', provider], queryFn: () => api().providerKeys.list(provider), refetchInterval: 5000 });
  const del = useMutation({ mutationFn: (i: number) => api().providerKeys.delete(provider, i), onSuccess: () => refetch() });

  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const [prefix, setPrefix] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const add = useMutation({
    mutationFn: (body: any) => api().providerKeys.patch(provider, body),
    onSuccess: () => { refetch(); setAdding(false); setVal(''); setPrefix(''); setBaseUrl(''); },
  });

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[10px] text-muted-foreground">Loading...</div>}
          {!isLoading && keys?.length === 0 && !adding && <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">No keys for this provider.</div>}
          {keys?.map((k: any, i: number) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/30 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {k.prefix && <Badge>{k.prefix}</Badge>}
                  <code className="text-[10px] text-muted-foreground font-mono truncate">{mask(k[keyField] || k.name || '—')}</code>
                </div>
                {k['base-url'] && <p className="text-[9px] text-muted-foreground/50 font-mono truncate">{k['base-url']}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(i)} disabled={del.isPending} className="opacity-0 group-hover:opacity-100">×</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {adding ? (
        <Card>
          <CardContent className="space-y-1.5">
            <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={keyField === 'name' ? 'Name' : 'API key'} />
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix" />
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" />
            </div>
            <div className="flex gap-1.5">
              <Button onClick={() => { if (!val.trim()) return; const e: any = { [keyField]: val.trim() }; if (prefix.trim()) e.prefix = prefix.trim(); if (baseUrl.trim()) e['base-url'] = baseUrl.trim(); add.mutate({ action: 'add', entry: e }); }} disabled={!val.trim() || add.isPending}>Add</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>+ Add Key</Button>
      )}
    </div>
  );
}

function mask(s: string) { return s.length <= 12 ? s : `${s.slice(0, 10)}··${s.slice(-4)}`; }
