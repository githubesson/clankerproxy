import React, { useState, useMemo } from 'react';
import { useProxyStatus, useAPIKeys } from '../../hooks/useIPC';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Select } from '../ui';

/* ── Types ── */

export interface SelectedModel {
  id: string;
  displayName: string;
  format: string;
  variants: string[]; // selected thinking levels/suffixes
  channel: string;
  maxOutputTokens: number;
  contextLength: number;
}

export interface GeneratorDef {
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  formats: { value: string; label: string }[];
  /** Map channel to default format */
  channelFormatMap: Record<string, string>;
  /** Return available thinking chips for a given format */
  getThinkingOptions: (format: string) => { value: string; label: string }[];
  /** Human-readable name for a variant value (e.g. "128000" -> "max") */
  getVariantName?: (format: string, value: string) => string;
  /** Build the final JSON output */
  buildOutput: (ctx: {
    selected: SelectedModel[];
    port: number;
    apiKey: string;
  }) => any;
}

interface Props {
  def: GeneratorDef;
  availableChannels: { channel: string; label: string }[];
}

/* ── Component ── */

export function GeneratorShell({ def, availableChannels }: Props) {
  // Infer API format from channel type
  function inferFormat(ch: string): string {
    if (ch.startsWith('custom-claude:')) return 'anthropic';
    // custom: entries are openai-compatibility (chat completions), not openai (responses)
    if (ch.startsWith('custom:')) {
      return def.formats.find((f) => f.value === 'openai-compatible' || f.value === 'openai-compat' || f.value === 'generic-chat-completion-api')?.value
        ?? def.formats.find((f) => f.value.includes('compat'))?.value
        ?? def.formats[0].value;
    }
    return def.channelFormatMap[ch] ?? def.formats[0].value;
  }

  const { data: status } = useProxyStatus();
  const { data: apiKeys } = useAPIKeys();
  const port = status?.port ?? 8317;

  const [channel, setChannel] = useState(availableChannels[0]?.channel ?? 'claude');
  const [format, setFormat] = useState(() => inferFormat(availableChannels[0]?.channel ?? 'claude'));
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [apiKeyRef, setApiKeyRef] = useState(def.apiKeyPlaceholder);
  const [copied, setCopied] = useState(false);

  const isCustomChannel = channel.startsWith('custom:') || channel.startsWith('custom-claude:');

  // Fetch models from proxy registry for built-in channels
  const { data: modelData } = useQuery({
    queryKey: ['models', channel],
    queryFn: () => window.clankerProxy.models.get(channel),
    enabled: !isCustomChannel,
    staleTime: 60000,
  });

  // Fetch models.dev catalog for enriching custom channel models
  const { data: modelsCatalog } = useQuery({
    queryKey: ['modelsDev'],
    queryFn: () => window.clankerProxy.modelsDev.get(),
    enabled: isCustomChannel,
    staleTime: 600000,
  });

  // Fetch models from configured provider entries for custom channels, enriched with models.dev data
  const { data: customModels } = useQuery({
    queryKey: ['customModels', channel, !!modelsCatalog],
    queryFn: async () => {
      const api = window.clankerProxy;

      // Find the provider entry and its models
      let providerModels: any[] = [];
      let providerName = '';
      if (channel.startsWith('custom:')) {
        providerName = channel.slice('custom:'.length);
        const entries = await api.providerKeys.list('openai-compatibility');
        const entry = entries?.find((e: any) => e.name === providerName);
        providerModels = entry?.models ?? [];
      } else if (channel.startsWith('custom-claude:')) {
        const label = channel.slice('custom-claude:'.length);
        const entries = await api.providerKeys.list('claude-api-key');
        const entry = entries?.find((e: any) => (e.prefix || new URL(e['base-url']).hostname) === label);
        providerModels = entry?.models ?? [];
        providerName = label;
      }

      // Look up models.dev metadata for this provider
      const catalogProvider = modelsCatalog?.[providerName];
      const catalogModels = catalogProvider?.models ?? {};

      return providerModels.map((m: any) => {
        const modelId = m.name || m.alias || m.id;
        const devData = catalogModels[modelId] ?? {};
        return {
          id: modelId,
          display_name: devData.name || m.alias || m.name,
          max_completion_tokens: devData.limit?.output ?? 0,
          context_length: devData.limit?.context ?? 0,
          reasoning: devData.reasoning ?? false,
          tool_call: devData.tool_call ?? false,
        };
      });
    },
    enabled: isCustomChannel,
    staleTime: 10000,
  });

  // Also try to match by scanning all catalog providers for models (fuzzy match for renamed providers)
  const { data: customModelsFallback } = useQuery({
    queryKey: ['customModelsFallback', channel, !!modelsCatalog],
    queryFn: async () => {
      if (!modelsCatalog) return null;
      const api = window.clankerProxy;

      let providerModels: any[] = [];
      if (channel.startsWith('custom:')) {
        const name = channel.slice('custom:'.length);
        const entries = await api.providerKeys.list('openai-compatibility');
        providerModels = entries?.find((e: any) => e.name === name)?.models ?? [];
      } else if (channel.startsWith('custom-claude:')) {
        const label = channel.slice('custom-claude:'.length);
        const entries = await api.providerKeys.list('claude-api-key');
        const entry = entries?.find((e: any) => (e.prefix || new URL(e['base-url']).hostname) === label);
        providerModels = entry?.models ?? [];
      }

      // Build a flat lookup of all models across all catalog providers
      const allModels: Record<string, any> = {};
      for (const prov of Object.values(modelsCatalog) as any[]) {
        for (const [id, model] of Object.entries(prov.models ?? {}) as any[]) {
          allModels[id] = model;
        }
      }

      return providerModels.map((m: any) => {
        const modelId = m.name || m.alias || m.id;
        const devData = allModels[modelId] ?? {};
        return {
          id: modelId,
          display_name: devData.name || m.alias || m.name,
          max_completion_tokens: devData.limit?.output ?? 0,
          context_length: devData.limit?.context ?? 0,
          reasoning: devData.reasoning ?? false,
          tool_call: devData.tool_call ?? false,
        };
      });
    },
    enabled: isCustomChannel && !!modelsCatalog,
    staleTime: 10000,
  });

  // Use enriched custom models, falling back to the basic ones, then fallback scan
  const resolvedCustomModels = (() => {
    const primary = customModels ?? [];
    // If primary has no token data, try fallback
    if (primary.length > 0 && primary.every((m: any) => !m.context_length)) {
      return customModelsFallback ?? primary;
    }
    return primary;
  })();

  const models = isCustomChannel ? resolvedCustomModels : (modelData?.models ?? []);

  const addModel = (m: any) => {
    if (selected.find((s) => s.id === m.id)) return;
    setSelected((prev) => [...prev, {
      id: m.id, displayName: m.display_name || m.id, format,
      variants: [], channel,
      maxOutputTokens: m.max_completion_tokens || m.outputTokenLimit || 16384,
      contextLength: m.context_length || m.inputTokenLimit || 0,
    }]);
  };

  const removeModel = (id: string) => setSelected((prev) => prev.filter((s) => s.id !== id));

  const toggleVariant = (id: string, variant: string) => {
    setSelected((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const has = s.variants.includes(variant);
      return { ...s, variants: has ? s.variants.filter((v) => v !== variant) : [...s.variants, variant] };
    }));
  };

  const updateFormat = (id: string, newFormat: string) => {
    setSelected((prev) => prev.map((s) => s.id === id ? { ...s, format: newFormat, variants: [] } : s));
  };

  const addAll = () => {
    const newModels = models
      .filter((m: any) => !selected.find((s) => s.id === m.id))
      .map((m: any) => ({
        id: m.id, displayName: m.display_name || m.id, format,
        variants: [], channel,
        maxOutputTokens: m.max_completion_tokens || m.outputTokenLimit || 16384,
        contextLength: m.context_length || m.inputTokenLimit || 0,
      }));
    setSelected((prev) => [...prev, ...newModels]);
  };

  const output = useMemo(
    () => def.buildOutput({ selected, port, apiKey: apiKeyRef }),
    [selected, port, apiKeyRef, def],
  );

  const jsonOutput = JSON.stringify(output, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>{def.name}</CardTitle>
          <CardDescription>{def.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
              <Input value={apiKeyRef} onChange={(e) => setApiKeyRef(e.target.value)} placeholder={def.apiKeyPlaceholder} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Proxy</label>
              <Input value={`127.0.0.1:${port}`} onChange={() => {}} disabled />
            </div>
          </div>
          {apiKeys && apiKeys.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Use configured key</label>
              <select
                onChange={(e) => { if (e.target.value) setApiKeyRef(e.target.value); }}
                className="flex h-6 w-full rounded border border-input bg-transparent px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {apiKeys.map((k, i) => (
                  <option key={i} value={k}>{k.length > 20 ? `${k.slice(0, 12)}··${k.slice(-4)}` : k}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model picker */}
      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={channel}
              onChange={(v) => { setChannel(v); setFormat(inferFormat(v)); }}
              options={availableChannels.map((c) => ({ value: c.channel, label: c.label }))}
            />
            <Select value={format} onChange={setFormat} options={def.formats} />
            <Button variant="outline" size="sm" onClick={addAll}>Add All</Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-px">
            {models.map((m: any) => {
              const isAdded = selected.some((s) => s.id === m.id);
              return (
                <div key={m.id} className="flex items-center gap-2 py-0.5">
                  <button
                    onClick={() => isAdded ? removeModel(m.id) : addModel(m)}
                    className={`flex-1 text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors ${
                      isAdded ? 'bg-accent/10 text-accent' : 'hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {m.id}
                  </button>
                  {isAdded && <Badge variant="success">✓</Badge>}
                </div>
              );
            })}
            {models.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-4 text-center">No models for this channel.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected with variant chips */}
      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected ({selected.length})</CardTitle>
            <CardDescription>Toggle thinking levels per model.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {selected.map((s, i) => {
              const chips = def.getThinkingOptions(s.format);
              return (
                <div key={s.id} className={`px-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="text-[10px] font-mono text-foreground flex-1 truncate">{s.id}</code>
                    <Select value={s.format} onChange={(v) => updateFormat(s.id, v)} options={def.formats} />
                    <button onClick={() => removeModel(s.id)} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">×</button>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chips.map((c) => {
                        const active = s.variants.includes(c.value);
                        return (
                          <button
                            key={c.value}
                            onClick={() => toggleVariant(s.id, c.value)}
                            className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                              active
                                ? 'bg-accent/15 text-accent border-accent/30'
                                : 'bg-transparent text-muted-foreground/60 border-border hover:border-muted-foreground/30 hover:text-muted-foreground'
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {s.variants.length > 0 && (
                    <p className="text-[9px] text-muted-foreground/40 mt-1">
                      {s.variants.length} variant{s.variants.length !== 1 ? 's' : ''}: {s.variants.map((v) => def.getVariantName?.(s.format, v) ?? v).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Output */}
      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <CardDescription>{def.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre select-text">
              {jsonOutput}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
