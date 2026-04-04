import React, { useState, useMemo } from 'react';
import { useIsProxyRunning } from '../hooks/useIPC';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Select, ProxyRequired } from './ui';

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
  const [showPresets, setShowPresets] = useState(false);
  const p = PROVIDERS.find((p) => p.id === active) ?? PROVIDERS[0];

  if (!isRunning) return <ProxyRequired />;

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground flex-1">Upstream LLM provider keys.</p>
        <Button variant={showPresets ? 'default' : 'outline'} size="sm" onClick={() => setShowPresets(!showPresets)}>
          Presets
        </Button>
        {!showPresets && (
          <Select value={active} onChange={(v) => { setActive(v); }} options={PROVIDERS.map((p) => ({ value: p.id, label: p.label }))} />
        )}
      </div>

      {showPresets ? <PresetBrowser /> : <Section key={active} provider={p.id} keyField={p.keyField} />}
    </div>
  );
}

/* ── Preset Browser (models.dev) ── */

function PresetBrowser() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'both' | 'provider' | 'model'>('both');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['modelsDev'],
    queryFn: () => window.clankerProxy.modelsDev.get(),
    staleTime: 600000,
  });

  // Filter providers by search
  const providers = useMemo(() => {
    if (!catalog) return [];
    return Object.values(catalog)
      .filter((p: any) => p.name && p.models && Object.keys(p.models).length > 0)
      .filter((p: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
        const modelMatch = Object.values(p.models).some((m: any) =>
          m.id?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q)
        );
        if (searchMode === 'provider') return nameMatch;
        if (searchMode === 'model') return modelMatch;
        return nameMatch || modelMatch;
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [catalog, search, searchMode]);

  const addPreset = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !apiKey.trim()) return;
      const api = window.clankerProxy;
      const providerNpm = selectedProvider.npm ?? '';
      const baseUrl = selectedProvider.api || `https://api.${selectedProvider.id}.com/v1`;

      // Split models by upstream format:
      // - @ai-sdk/anthropic upstream → claude-api-key (proxy speaks Anthropic to upstream)
      // - everything else → openai-compatibility (proxy speaks OpenAI to upstream)
      // The client can use any format -- the proxy translates.
      const claudeModels: any[] = [];
      const openaiModels: any[] = [];

      for (const m of Object.values(selectedProvider.models) as any[]) {
        if (!selectedModels.has(m.id)) continue;
        const npm = m.provider?.npm ?? providerNpm;
        // name = upstream model ID, alias = what client sends (same ID)
        // Don't set alias to display name -- proxy matches alias against client request
        const entry = { name: m.id };
        if (npm.includes('anthropic')) {
          claudeModels.push(entry);
        } else {
          openaiModels.push(entry);
        }
      }

      // Helper: merge models into existing entry or create new one
      async function addToProvider(providerType: string, newModels: any[], buildEntry: () => any) {
        if (newModels.length === 0) return;
        const existing = await api.providerKeys.list(providerType);
        const match = existing.findIndex((e: any) => e['base-url'] === baseUrl);
        if (match >= 0) {
          const merged = { ...existing[match] };
          const names = new Set((merged.models ?? []).map((m: any) => m.name));
          merged.models = [...(merged.models ?? []), ...newModels.filter((m) => !names.has(m.name))];
          existing[match] = merged;
          await api.providerKeys.put(providerType, existing);
        } else {
          await api.providerKeys.put(providerType, [...existing, buildEntry()]);
        }
      }

      // Claude executor appends /v1/messages, so strip /v1 from base URL
      const claudeBaseUrl = baseUrl.replace(/\/v1\/?$/, '');
      await addToProvider('claude-api-key', claudeModels, () => ({
        'api-key': apiKey.trim(),
        'base-url': claudeBaseUrl,
        prefix: selectedProvider.id,
        // Non-Anthropic upstreams need x-api-key header since the proxy
        // only sends it for api.anthropic.com by default
        headers: { 'x-api-key': apiKey.trim() },
        models: claudeModels,
      }));

      await addToProvider('openai-compatibility', openaiModels, () => ({
        name: selectedProvider.id,
        'base-url': baseUrl,
        'api-key-entries': [{ 'api-key': apiKey.trim() }],
        models: openaiModels,
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providerKeys'] });
      setDone(true);
      setTimeout(() => { setDone(false); setSelectedProvider(null); setApiKey(''); setSelectedModels(new Set()); }, 2000);
    },
  });

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllModels = () => {
    if (!selectedProvider) return;
    const all = Object.keys(selectedProvider.models);
    setSelectedModels((prev) => prev.size === all.length ? new Set() : new Set(all));
  };

  // Provider detail view
  if (selectedProvider) {
    const models = Object.values(selectedProvider.models) as any[];
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedProvider(null); setSelectedModels(new Set()); }} className="text-[10px] text-muted-foreground hover:text-foreground">←</button>
            <div className="flex-1">
              <CardTitle>{selectedProvider.name}</CardTitle>
              <CardDescription>{selectedProvider.api || selectedProvider.id} -- {models.length} models</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={`API key (${selectedProvider.env?.[0] || 'key'})...`} />

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground flex-1">{selectedModels.size} selected</span>
            <Button variant="ghost" size="sm" onClick={selectAllModels}>
              {selectedModels.size === models.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-px">
            {models.map((m: any) => {
              const active = selectedModels.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors flex items-center gap-2 ${
                    active ? 'bg-accent/10 text-accent' : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span className="font-mono flex-1 truncate">{m.id}</span>
                  <div className="flex gap-1 shrink-0">
                    {m.reasoning && <Badge variant="success">reason</Badge>}
                    {m.tool_call && <Badge variant="outline">tools</Badge>}
                    {m.limit?.context && <Badge variant="outline">{Math.round(m.limit.context / 1000)}K</Badge>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-1.5">
            <Button
              onClick={() => addPreset.mutate()}
              disabled={!apiKey.trim() || selectedModels.size === 0 || addPreset.isPending}
              className="flex-1"
            >
              {done ? 'Added!' : addPreset.isPending ? 'Adding...' : `Add ${selectedModels.size} model${selectedModels.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Provider list view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Catalog</CardTitle>
        <CardDescription>Browse providers from models.dev</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1.5">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${searchMode === 'both' ? 'providers & models' : searchMode === 'provider' ? 'providers' : 'models'}...`} />
          <div className="flex shrink-0">
            {(['both', 'provider', 'model'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSearchMode(m)}
                className={`px-1.5 py-0.5 text-[9px] border transition-colors first:rounded-l last:rounded-r ${
                  searchMode === m
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-transparent text-muted-foreground/50 border-border hover:text-muted-foreground'
                }`}
              >
                {m === 'both' ? 'All' : m === 'provider' ? 'Prov' : 'Model'}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-px">
          {isLoading && <p className="text-[10px] text-muted-foreground py-4 text-center">Loading catalog...</p>}
          {!isLoading && providers.length === 0 && <p className="text-[10px] text-muted-foreground py-4 text-center">No results.</p>}
          {providers.map((p: any) => {
            const modelCount = Object.keys(p.models).length;
            const reasoningCount = Object.values(p.models).filter((m: any) => m.reasoning).length;
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p); setSelectedModels(new Set(Object.keys(p.models))); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/40 transition-colors flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-foreground font-medium truncate">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground/60 truncate">{p.api || p.id}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="outline">{modelCount} model{modelCount !== 1 ? 's' : ''}</Badge>
                  {reasoningCount > 0 && <Badge variant="success">{reasoningCount} reason</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Provider Key Section ── */

const MOVE_TARGETS = [
  { value: 'claude-api-key', label: 'Anthropic' },
  { value: 'openai-compatibility', label: 'OpenAI Compat' },
  { value: 'gemini-api-key', label: 'Gemini' },
  { value: 'codex-api-key', label: 'Codex' },
];

function Section({ provider, keyField }: { provider: string; keyField: string }) {
  const api = () => window.clankerProxy;
  const qc = useQueryClient();
  const isRunning = useIsProxyRunning();
  const { data: keys, isLoading, refetch } = useQuery({ queryKey: ['providerKeys', provider], queryFn: () => api().providerKeys.list(provider), enabled: isRunning, refetchInterval: isRunning ? 5000 : false });
  const del = useMutation({ mutationFn: (i: number) => api().providerKeys.delete(provider, i), onSuccess: () => refetch() });
  const [expanded, setExpanded] = useState<number | null>(null);

  const moveModel = useMutation({
    mutationFn: async ({ entryIndex, modelName, targetProvider }: { entryIndex: number; modelName: string; targetProvider: string }) => {
      if (!keys || targetProvider === provider) return;
      const entry = keys[entryIndex];
      const baseUrl = entry['base-url'] || '';
      const existingKey = entry['api-key'] || entry['api-key-entries']?.[0]?.['api-key'] || '';
      const model = (entry.models ?? []).find((m: any) => (m.name || m.id) === modelName);
      if (!model) return;

      // Claude executor appends /v1/messages, so strip /v1 for Anthropic-style providers
      const targetBaseUrl = targetProvider === 'openai-compatibility'
        ? (baseUrl.match(/\/v1\/?$/) ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/v1`)
        : baseUrl.replace(/\/v1\/?$/, '');

      // Add model to target -- merge into existing entry with same base-url
      const targetExisting = await api().providerKeys.list(targetProvider);
      const targetMatch = targetExisting.findIndex((e: any) => e['base-url'] === targetBaseUrl);

      if (targetMatch >= 0) {
        const merged = { ...targetExisting[targetMatch] };
        merged.models = [...(merged.models ?? []), model];
        targetExisting[targetMatch] = merged;
        await api().providerKeys.put(targetProvider, targetExisting);
      } else {
        let newEntry: any;
        if (targetProvider === 'openai-compatibility') {
          newEntry = {
            name: entry.name || entry.prefix || (targetBaseUrl ? new URL(targetBaseUrl).hostname : 'moved'),
            'base-url': targetBaseUrl,
            'api-key-entries': [{ 'api-key': existingKey }],
            models: [model],
          };
        } else {
          newEntry = { 'api-key': existingKey, 'base-url': targetBaseUrl, prefix: entry.name || entry.prefix, headers: { 'x-api-key': existingKey }, models: [model] };
        }
        await api().providerKeys.put(targetProvider, [...targetExisting, newEntry]);
      }

      // Remove model from source entry
      const sourceEntry = { ...keys[entryIndex] };
      sourceEntry.models = (sourceEntry.models ?? []).filter((m: any) => (m.name || m.id) !== modelName);

      if (sourceEntry.models.length === 0) {
        // No models left, delete the whole entry
        await api().providerKeys.delete(provider, entryIndex);
      } else {
        // Update source with model removed
        const allSource = [...keys];
        allSource[entryIndex] = sourceEntry;
        await api().providerKeys.put(provider, allSource);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providerKeys'] });
      refetch();
    },
  });

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
          {keys?.map((k: any, i: number) => {
            const title = k.name || k.prefix || (k['base-url'] ? new URL(k['base-url']).hostname : null);
            const key = k['api-key'] || k['api-key-entries']?.[0]?.['api-key'];
            const isOpen = expanded === i;
            return (
              <div key={i} className={`${i > 0 ? 'border-t border-border' : ''}`}>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/30 cursor-default"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-foreground truncate">{title || '—'}</span>
                      {key && <code className="text-[9px] text-muted-foreground/40 font-mono">{mask(key)}</code>}
                      <Badge variant="outline">{provider === 'openai-compatibility' ? 'openai' : provider === 'claude-api-key' ? 'anthropic' : provider.replace('-api-key', '')}</Badge>
                    </div>
                    {k['base-url'] && <p className="text-[9px] text-muted-foreground/50 font-mono truncate">{k['base-url']}</p>}
                    {k.models?.length > 0 && (
                      <p className="text-[9px] text-muted-foreground/40">{k.models.length} model{k.models.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground/30">{isOpen ? '▾' : '▸'}</span>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); del.mutate(i); }} disabled={del.isPending} className="opacity-0 group-hover:opacity-100">×</Button>
                </div>
                {isOpen && (
                  <div className="px-3 pb-2 space-y-1">
                    <EditableUrl
                      value={k['base-url'] || ''}
                      onSave={async (newUrl) => {
                        const all = [...(keys ?? [])];
                        all[i] = { ...all[i], 'base-url': newUrl };
                        await api().providerKeys.put(provider, all);
                        refetch();
                      }}
                    />
                    {k.models?.length > 0 && <div className="space-y-px">{k.models.map((m: any, j: number) => {
                      const mName = m.name || m.id;
                      return (
                        <div key={j} className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-muted/20 group/model">
                          <code className="text-[9px] font-mono text-muted-foreground flex-1 truncate">{mName}</code>
                          {m.alias && m.alias !== mName && (
                            <span className="text-[9px] text-muted-foreground/40 truncate">{m.alias}</span>
                          )}
                          <div className="flex gap-0.5 opacity-0 group-hover/model:opacity-100 transition-opacity shrink-0">
                            {MOVE_TARGETS.filter((t) => t.value !== provider).map((t) => (
                              <button
                                key={t.value}
                                title={`Move to ${t.label}`}
                                onClick={(e) => { e.stopPropagation(); moveModel.mutate({ entryIndex: i, modelName: mName, targetProvider: t.value }); }}
                                disabled={moveModel.isPending}
                                className="px-1 py-px rounded text-[8px] border border-border text-muted-foreground/40 hover:text-foreground hover:border-muted-foreground/30 transition-colors disabled:opacity-50"
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}</div>}
                  </div>
                )}
              </div>
            );
          })}
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

function EditableUrl({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
        className="text-[9px] text-muted-foreground/50 font-mono hover:text-muted-foreground transition-colors text-left truncate w-full"
        title="Click to edit base URL"
      >
        {value || 'No base URL set'}
      </button>
    );
  }

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://..." className="flex-1" onKeyDown={(e) => {
        if (e.key === 'Enter') { setSaving(true); onSave(draft).finally(() => { setSaving(false); setEditing(false); }); }
        if (e.key === 'Escape') setEditing(false);
      }} />
      <Button size="sm" disabled={saving} onClick={() => { setSaving(true); onSave(draft).finally(() => { setSaving(false); setEditing(false); }); }}>
        {saving ? '...' : 'Save'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>×</Button>
    </div>
  );
}
